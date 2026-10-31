# Architecture Decision Records

Short records of decisions that were **not obvious**, written so the reasoning survives the
people who made it. Each one states the context, the decision, and what it cost.

Format is Nygard-style, numbered, append-only: supersede a record rather than editing it
once it is accepted. It matches the backend's
[records](https://github.com/Jason-McKay/notification-platform/tree/main/docs/adr), which
this dashboard depends on (0003 and 0005 in particular).

| # | Title | Status |
|---|---|---|
| [0001](0001-in-memory-token-and-dev-proxy.md) | The token stays in memory, and a dev proxy puts both services on one origin | Accepted |
