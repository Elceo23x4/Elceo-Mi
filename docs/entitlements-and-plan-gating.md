# Entitlements and Plan Gating (C4-K1)

This document defines the backend runtime core for entitlement decisions.

- Plan kinds: `free`, `premium`, `admin_internal`.
- Account states: `active`, `suspended`, `restricted`, `canceled`.
- Access semantics: `allowed`, `limited`, `blocked`.
- Usage windows are UTC deterministic (`daily`, `weekly` Monday start, `monthly` first-day start).
- Decision reasons include: `account_suspended`, `account_canceled`, `internal_override`, `feature_not_in_plan`, `feature_allowed`, `feature_limited`, `usage_available`, `usage_limit_exceeded`, `feature_unknown_or_unmapped`.

C4-K1 stops before route/API integration and server access helper wiring.
C4-K2 should add authenticated API wiring and route-level gating integration.

## C4-K2 server integration

C4-K2 wires the runtime core into server/API routes via server-only access helpers and canonical composition runtime integration.

- Added authenticated account entitlement routes:
  - `GET /api/account/entitlements`
  - `GET /api/account/usage`
  - `GET /api/account/access-decisions`
  - `POST /api/account/access-check`
- Added internal/admin entitlement mutation routes:
  - `POST /api/admin/entitlements/plan`
  - `POST /api/admin/entitlements/state`
  - `POST /api/admin/entitlements/override`
- Added route-level server gating for:
  - `POST /api/workspace/refresh` (`workspace.refresh`)
  - `POST /api/analytics/generate` (`analytics.generate`)
  - `POST /api/coaching/generate` (`coaching.generate`)
  - `POST /api/portfolio/snapshot/generate` (`portfolio.snapshot.generate`)
  - `POST /api/refresh/run` (`refresh.run`)
  - `GET /api/admin/*` (`admin.read`, plus internal token gate)
  - internal ops POST routes (`admin.ops`, plus internal token gate)

Usage increments are server-side and explicit. C4-K2 increments only after successful completion for `workspace.refresh`, `analytics.generate`, `coaching.generate`, `portfolio.snapshot.generate`, and `refresh.run`.

C4-K2 still intentionally stops before payment gateway integration and billing UI.


## C4-M2B billing lifecycle linkage

C4-M2B billing lifecycle reconciliation updates canonical entitlement state as part of provider-event reconciliation, and exposes account-facing read routes that return synchronized billing + entitlement snapshot state.
