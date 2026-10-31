# 1. The token stays in memory, and a dev proxy puts both services on one origin

- **Status:** Accepted
- **Date decided:** 2026-10-31, while planning the dashboard
- **Date recorded:** 2026-10-31, with the initial commit

## Context

Two questions had to be answered before the first HTTP call.

**Where the bearer token lives.** The platform issues a one-hour token for a client id and
secret. The sibling `message-inspector-ui` keeps its token in `sessionStorage`, so a reload
stays signed in. Anything in web storage can be read by any script running on the page, so
a single XSS hole would leak the token.

**How the browser reaches two services.** The platform splits writes from reads (backend
ADR 0003): the token and the send are on the api at :8080, and every read is on the worker
at :8081. Both serve their routes under `/api`. Neither sends CORS headers, and the dev
server is a third origin, :4200.

## Decision

- **The token is a signal in `AuthService`, and nothing else holds it.** It is never written
  to `localStorage`, `sessionStorage` or a cookie. A spec asserts both storages stay empty
  after login.
- **`ng serve` proxies both services** through `proxy.conf.json`, so the browser makes only
  same-origin, relative calls:
  - `/worker/*` goes to :8081 with `/worker` stripped, so `/worker/api/notifications` arrives
    as `/api/notifications`. It is listed first.
  - `/api/*` goes to :8080 unchanged.
- **The two prefixes are written once**, in `core/api-paths.ts`. The services and the
  interceptor import them, so the interceptor cannot fall out of step with the services.

## Consequences

- **A reload signs you out.** The token has nowhere to survive one. For a dashboard used in
  short demo sessions, that is an acceptable price.
- **There is no refresh flow.** After an hour the next call gets a 401, the interceptor drops
  the token and the user signs in again.
- **The backend needs no CORS configuration**, and the browser never makes a preflight.
- **The app runs on the dev server only.** `proxy.conf.json` is read by `ng serve`, not by a
  production build. A deployment needs a reverse proxy (or the platform's planned gateway)
  doing the same split. The README says so.
- **The client secret is typed into the browser.** The platform's token grant is
  machine-to-machine; holding its secret in a browser is a dev-only stand-in for a real
  identity provider, recorded in the README. An in-memory token limits what an XSS hole
  could take, but it does not make a browser-held secret safe.

## Alternatives considered

- **`sessionStorage`, as `message-inspector-ui` does.** It survives a reload and is cleared
  when the tab closes. Rejected because any script on the page can read it, and the
  convenience matters little in a demo dashboard.
- **`localStorage`.** It also survives closing the tab, which makes the exposure longer.
  Rejected for the same reason.
- **One `/api` prefix, split by HTTP method** (POST to the api, GET to the worker). That would
  have kept the backend's paths unchanged in the browser. Vite's proxy matches by URL only,
  and a method split needs a `configure` hook that patches the proxy's internals. Rejected:
  it is fragile and opaque for a two-line saving.
- **CORS on the backend.** It would work in development and production alike. Rejected for
  now because it is a backend change made only to serve a dev tool, and the gateway is the
  better long-term front for both services.
- **Absolute URLs to :8080 and :8081.** These need CORS as well, and `message-inspector-ui`
  showed the cost of hardcoding hosts in each service: a relative URL slipped in and failed
  silently against the dev server.
