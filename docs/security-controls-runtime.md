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


## C4-M6B2A protected user-facing routes
- `POST /api/workspace/refresh` (`workspace_refresh`)
- `POST /api/analytics/generate` (`analytics_generate`)
- `POST /api/coaching/generate` (`coaching_generate`)
- `POST /api/portfolio/snapshot/generate` (`portfolio_snapshot_generate`)
- `POST /api/refresh/run` (`refresh_run`)
- `POST /api/journal/influence/generate` (`internal_mutation`, narrow action pending)

Behavior in M6B2A:
- Security decision enforced after auth + existing validation/access checks and before mutation execution.
- Idempotency headers accepted: `Idempotency-Key` and `x-idempotency-key`.
- Block mapping: rate limit => `429`, idempotency conflict => `409`, suspicious replay => `409`.
- Replayed requests return standardized `conflict` / `Request replayed` envelope (full prior-response replay remains deferred).
- Successful high-cost user mutations now record security audit events through shared helper.

## M6B2B next
- Extend user mutation-route protection coverage beyond generate/refresh routes.
- Expand broader admin write surfaces where runtime controls are still missing.
- Implement stronger full-response idempotency replay semantics when required.

## C4-M6B2B route security coverage sweep
Newly protected in this batch (high-risk mutation/internal/admin paths):
- `POST /api/admin/billing/trial`
- `POST /api/admin/billing/activate`
- `POST /api/admin/billing/renew`
- `POST /api/admin/billing/change-plan`
- `POST /api/admin/billing/past-due`
- `POST /api/admin/billing/cancel-at-period-end`
- `POST /api/admin/billing/expire`
- `POST /api/admin/billing/pause`
- `POST /api/admin/billing/resume`
- `POST /api/admin/billing/provider-plan-mapping`
- `POST /api/internal/billing/provider-events`
- `POST /api/internal/billing/provider-events/replay`

Coverage semantics:
- Admin billing writes use `actionKind: admin_write`.
- Internal provider-event mutation/replay uses `actionKind: internal_mutation`.
- Idempotency headers supported: `Idempotency-Key`, `x-idempotency-key`.
- Blocked/replayed responses use the standardized security envelope; replay currently returns a normalized conflict envelope, not full prior response payload body.
- Successful mutations complete idempotency state (when key exists) and record security audit events.

Deferred cleanup after this sweep:
- Optional full-response idempotency replay body support.
- Per-route narrower action kinds for journal/portfolio/notifications write routes.
- Infrastructure/WAF rate limits on top of app-level controls.
- Final security review + penetration test.

## C4-M6C1 security action-kind policy foundation
M6C1 expands the security runtime contract with narrower user mutation action kinds for journal, portfolio, and notification families that were deferred in M6B2B.

Added action kinds:
- Journal: `journal_case_write`, `journal_case_lifecycle`, `journal_influence_generate`
- Portfolio: `portfolio_watchlist_write`, `portfolio_position_write`, `portfolio_action_write`, `portfolio_snapshot_generate` (already present, policy-confirmed)
- Notifications: `notification_target_write`, `notification_subscription_write`, `notification_verification_issue`, `notification_verification_consume`

Why this is needed:
- Broad fallback actions (`account_write` / `internal_mutation`) are too coarse for production-grade per-family abuse controls.
- Narrow action kinds allow explicit policy tuning and clearer security audit attribution per mutation family.

Scope note:
- M6C1 is policy foundation only (types/schemas/policies/tests/docs).
- Route-level integration of these new action kinds is deferred to M6C2.
- Replay semantics remain unchanged (standard replay conflict envelope, no full prior-response body replay).

## C4-M6C2A narrow route integration (partial slice)
- Covered in this partial slice only:
  - `/api/journal/cases` -> `journal_case_write`
  - `/api/journal/cases/[caseId]/plan` -> `journal_case_lifecycle`
  - `/api/journal/influence/generate` -> `journal_influence_generate`
  - `/api/notifications/verification/issue` -> `notification_verification_issue`
  - `/api/notifications/verification/consume` -> `notification_verification_consume`
- Remaining for follow-up batches:
  - other journal lifecycle mutation routes
  - all portfolio watchlist/position/action mutation routes
  - notification target/subscription mutation routes
- Replay semantics remain unchanged (standardized replay conflict envelope; no prior-response payload replay body).

## C4-M6C2B narrow journal lifecycle completion
- Journal lifecycle mutation routes are now protected with `actionKind: journal_case_lifecycle`:
  - `POST /api/journal/cases/[caseId]/adjust`
  - `POST /api/journal/cases/[caseId]/cancel`
  - `POST /api/journal/cases/[caseId]/close`
  - `POST /api/journal/cases/[caseId]/execute`
  - `POST /api/journal/cases/[caseId]/partial-close`
  - `POST /api/journal/cases/[caseId]/plan`
  - `POST /api/journal/cases/[caseId]/review`
- Read-equivalent journal routes remain intentionally unprotected by mutation security decisioning:
  - `GET /api/journal/cases/[caseId]`
  - `GET /api/journal/cases/[caseId]/replay`
  because they do not mutate state and must not consume write idempotency/rate-limit policies.
- Replay semantics are unchanged: replayed requests still return the standardized conflict replay envelope rather than full prior-response payload replay.
- Remaining M6C2 scope is unchanged:
  - portfolio mutation route family
  - notification target/subscription mutation route family
