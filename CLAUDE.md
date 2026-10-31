# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Angular 22 dashboard for `notification-platform` (the backend repo, a sibling checkout):
stats, a filtered list, a send button, and a per-delivery attempt timeline. Dev-server only.
It is part of the same portfolio project as the backend, and its roadmap is the backend's: a
local planning doc kept outside the repo, since the repo is public.

## Commands

Node **24.18.0** (`.nvmrc`); run `nvm use` first, because the machine default may be 20.11.1.

- `npm start`: `ng serve` on http://localhost:4200, with `proxy.conf.json`
- `npx ng test --watch=false`: Vitest in jsdom, one run (`npm test` watches)
- `npx ng test --watch=false --include src/app/core/refresh.service.spec.ts`: one spec file
- `npm run lint`: angular-eslint, recommended + stylistic + template accessibility
- `npm run build`: production build to `dist/notification-dashboard-ui/browser/`
- `npx prettier --write "src/**/*.{ts,html,scss}"`: format (`.prettierrc`, width 100)

CI (`.github/workflows/ci.yml`) runs `npm ci`, lint, test and build on push/PR to `main`.

The backend: `docker compose -f ../notification-platform/compose.yaml up --build -d`.
Credentials are in the README, never in source; specs use `test-secret`.

## Architecture

Standalone components, signals, zoneless, OnPush (the Angular 22 default). No state,
component or chart library. RxJS only at the HTTP boundary, always through `switchMap` so a
new filter or tick cancels the request it replaces.

- `core/api-paths.ts`: the only place the two prefixes are written. `API` (`/api`) goes to the
  api on :8080 for the token and the send; `WORKER` (`/worker/api`) goes to the worker on
  :8081 for every read, with the proxy stripping `/worker`.
- `core/auth.service.ts`: the token is a signal, in memory only (ADR 0001).
  `auth.interceptor.ts` adds it to both prefixes except the token call; a 401 logs out and
  goes to `/login`. `auth.guard.ts` guards the shell.
- `core/refresh.service.ts`: `ticks$` drives every poll: every 5s while auto-refresh is on and
  the tab is visible, at once when either comes back, and on `nudge()` after a send. Views
  load once themselves, then on ticks. It is cold, so each view's timer dies with the view.
- `core/http-error.ts`: `describeHttpError` turns a status into inline text. Backend error
  bodies carry no message, so the status is all there is.
- `notifications/notification-list.ts`: filters, page and the selected row are query params,
  bound as inputs (`withComponentInputBinding`); `navigate()` merges. `detail-panel.ts` is the
  timeline beside it.

## Conventions

- 2-space indent, single quotes, Prettier at width 100.
- Load and send errors are shown inline, never as toasts.
- Specs are behavioural: components against `vi.fn()` stubs covering success and HTTP
  failure, services against `HttpTestingController` with URLs pinned. Every navigation
  target must match a route (`app.spec.ts`).
- Commits: conventional style, short subject.
- Non-obvious decisions go in `docs/adr/` (Nygard-style, numbered, append-only).

## Gotchas

- **Every read must use `WORKER`.** A read sent to `/api` reaches the api, which has no read
  endpoints, and fails with a 4xx that looks like an auth or routing bug. The service spec
  pins every URL for this reason.
- **A reload signs you out.** Intended: the token is in memory only.
- **A detail 404 straight after a send is normal.** The worker writes the row when it
  consumes the event; the panel shows "Not recorded yet" and keeps polling (only while
  auto-refresh is on).
- **`FAILED` is rarely visible.** It lasts well under a second (about 500ms on the live
  stack) between the last try and the dead-letter topic. Expect `RETRYING`, then
  `DEAD_LETTERED`; a test must not wait for `FAILED`.
- **Stats count rows *updated* in the last 24h**, not created. An old delivery that changes
  state shows up again.
- **The recipient filter is an exact match** on the worker. There is no partial search.
- **Offset paging moves under polling.** The list is newest-first by `updatedAt`, so a row
  that changes state jumps to page 1 and the rest shift; a row can repeat or be skipped
  between pages.
- **Port 8080 collides with the message-inspector backend.** Stop it before starting the
  compose stack.
- **`crypto.randomUUID` (the send's `Idempotency-Key`) needs a secure context.** localhost
  counts; opening the dev server over a LAN IP on plain http does not, and the send throws.
- **The proxy matches by URL prefix only** (Vite cannot split by method), and `/worker` is
  listed first. Do not add a route under `/api` that should reach the worker.
