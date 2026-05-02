# Security Controls Runtime (C4-M6A2)

This pass completes backend-only security runtime service behavior for idempotency, rate limiting, decisioning, audit persistence, and canonical boundary/query orchestration.

## Semantics
- Idempotency: deterministic key + request hash handling with started/completed/failed lifecycle.
- Rate limit: deterministic minute/hour/day windows, actor/subject scoping, conservative blocking at limit.
- Audit: blocked/replayed/internal/admin actions are auditable.
- Privacy: IP and user-agent are stored only as SHA-256 hashes.
- Precedence: idempotency conflicts block before rate-limit checks.

## Why route integration is deferred
This batch ships executable services and canonical boundary behavior only; route handlers will adopt the boundary in M6B to prevent duplicate logic and risk.

## M6B next
- Integrate canonical boundary into selected mutation routes.
- Add route-specific policy wiring and idempotency-key requirements.
- Expand audit replay lookup support.


## C4-M6B1 protected route coverage
M6B1 route-level security integration now covers these write routes through the shared server security helper and canonical security runtime:
- `POST /api/internal/billing/reconcile`
- `POST /api/internal/billing/reconcile/retry`
- `POST /api/internal/billing/policy/evaluate`
- `POST /api/internal/billing/orchestration/retry`
- `POST /api/notifications/delivery/dispatch`
- `POST /api/ops/notifications/expire-verifications`
- `POST /api/ops/notifications/process-feedback`
- `POST /api/admin/entitlements/plan`
- `POST /api/admin/entitlements/state`
- `POST /api/admin/entitlements/override`

Behavior:
- Idempotency key headers accepted: `Idempotency-Key` and `x-idempotency-key`.
- Blocked decisions map to deterministic envelopes (`rate_limit_exceeded` => 429, `idempotency_conflict` => 409, `suspicious_replay` => 409).
- Replayed decisions currently return the standardized replay envelope (`conflict` / `Request replayed`) and do not yet replay prior response payload bodies.
- Successful internal/admin mutation routes record security audit events through the shared helper.

## M6B2 remaining scope
- User-facing generation route integration (`/api/workspace/refresh`, `/api/analytics/generate`, `/api/coaching/generate`, `/api/portfolio/snapshot/generate`).
- Workspace refresh and broader mutation-path coverage expansion.
- Broader admin read/write route expansion where policy requires runtime controls.
- Stronger idempotency replay semantics (optional prior-response body replay) if required.
