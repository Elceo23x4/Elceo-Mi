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

## C4-M6C2C portfolio narrow-action coverage
Portfolio mutation routes are now wired to narrow action kinds:
- Watchlist mutation routes -> `portfolio_watchlist_write`
- Position mutation routes -> `portfolio_position_write`
- Action-item mutation routes -> `portfolio_action_write`
- Snapshot generate remains -> `portfolio_snapshot_generate`

Read-equivalent routes (watchlist/position/action replay + portfolio attention/current snapshot reads) remain intentionally outside mutation decisioning because they do not mutate state.

Remaining C4-M6C2 scope: notification target/subscription route family. Replay semantics are unchanged (standard replay conflict envelope only).


## C4-M6C2D notification narrow-action completion
- Notification target mutation routes are protected with `notification_target_write`: `POST /api/notifications/targets`, `POST /api/notifications/targets/[targetId]/enable`, `POST /api/notifications/targets/[targetId]/disable`.
- Notification subscription mutation routes are protected with `notification_subscription_write`: `POST /api/notifications/subscriptions`, `PATCH /api/notifications/subscriptions/[subscriptionId]`.
- Verification mutation routes remain protected with narrow actions from C4-M6C2A: `notification_verification_issue` and `notification_verification_consume`.
- Internal delivery dispatch remains protected with `notification_dispatch`.
- Read-equivalent notification routes (`GET /api/notifications/summary`, `GET /api/notifications/inbox`, `GET /api/notifications/targets`, `GET /api/notifications/subscriptions`, `GET /api/notifications/health`) remain intentionally outside mutation security decisioning because they do not mutate state.
- Replay semantics are unchanged: replayed requests return the standardized conflict replay envelope (no full prior-response payload replay yet).
- C4-M6C2 narrow-route action coverage is now complete across journal, portfolio, and notification mutation families.
- Remaining production hardening is unchanged: full-response idempotency replay, infra/WAF rate limits, and final penetration/security review.

## C4-M7A full-response idempotency replay runtime core
- Runtime now supports durable idempotency response envelope storage and replay lookup contracts.
- `responseJson` is persisted as serialized JSON string in `app_security_idempotency_responses`.
- Request bodies are never persisted; only `requestHash` is stored.
- Replay lookup reasons: `completed_response_found`, `no_completed_response`, `request_hash_mismatch`, `expired`, `not_found`.
- Route handlers will be wired in M7B to return stored response envelopes.
- Current limitation moved to route integration pending (runtime storage/replay core is now present).

## C4-M7B route full-response replay integration
- Route helper replay integration is now active for helper-wired protected routes: replayed security decisions call `getIdempotencyReplayResult(idempotencyKey, requestHash, asOfIso)` and, when replayable, return the stored prior response envelope with the stored HTTP status.
- If replay lookup returns a non-replayable reason (for example `no_completed_response`), routes return an explicit deterministic replay-unavailable conflict envelope and do not execute mutations.
- If stored `responseJson` is malformed, routes return a deterministic internal replay parse-failure envelope and do not execute mutations.
- Successful protected mutation paths can now persist full response envelopes via `completeIdempotentActionWithResponse` with `responseJson = JSON.stringify(responseEnvelope)` and hashed response payload tracking.
- Stored replay state continues to persist `requestHash` and serialized response envelope only; raw request bodies are not persisted.
- Representative M7B route wiring for response-envelope persistence: `POST /api/internal/billing/reconcile`, `POST /api/workspace/refresh`, `POST /api/analytics/generate`, `POST /api/notifications/verification/issue`, `POST /api/portfolio/watchlist`.
- Remaining cleanup after M7B: broaden response-envelope persistence to all protected mutation routes still using completion without response envelopes, infrastructure/WAF limits, and final security review/penetration test.

## C4-M7C broadened route response-envelope persistence
M7C completes full-response idempotency completion wiring across protected JSON mutation routes that use `completeSecurityDecision(...)`, moving replay-envelope persistence from representative coverage to broad route-family coverage (internal billing, admin billing/entitlements, notifications, journal, portfolio, refresh, analytics, coaching, and ops notification mutation surfaces).

Behavior:
- Protected mutation success paths now commonly pass `responseEnvelope`, `httpStatus`, and `requestHash` into `completeSecurityDecision(...)`.
- Stored replay payload remains `responseJson` (serialized success envelope) with only `requestHash` persisted for request identity.
- Raw request bodies are still never persisted.

Remaining exceptions:
- No remaining legacy `completeSecurityDecision(...)` JSON mutation callsites are expected after this pass.
- Current concrete exceptions are limited to routes not using `completeSecurityDecision(...)` and any future non-JSON/streaming mutation responses, which require explicit replay-contract handling.

Remaining hardening remains unchanged: infra/WAF limits and final penetration/security review.

## C5-A6 note
- Added internal-only fixture ingestion trigger: `POST /api/internal/market-evidence/tiingo/fixture-ingest` (internal token + `admin.ops` + runtime security `internal_mutation`).
- Trigger executes `runTiingoFixtureIngestion` through canonical market intelligence runtime using fixture-only Tiingo adapter (no live network calls, no `TIINGO_API_KEY`).
- Ingestion persists provider request/response/normalized payload lifecycle and supports payload query/replay.
- Future C5-A7 live activation requirements remain: `TIINGO_API_KEY`, provider health checks, scheduler integration, production rate-limit policy, staging smoke validation.


## C5-A20 market evidence + SEO admin/internal query routes
Added protected read-only admin query surfaces under /api/admin/market-evidence/* and /api/admin/seo/* (internal token + admin.read). These routes expose persisted payload/replay/quality/reasoning-input/weighted/cognition/SEO feed/sitemap views with strict query validation, no live provider fetches, and no public SEO pages.

## C5-A23 note
- Added protected internal/admin scheduled-ingestion routes: policies/runs/replay (GET) and dry-run (POST).
- Dry-run POST is internal+admin.ops gated with mutation security decision, idempotency, rate-limit, audit, and response-envelope completion.
- Route input rejects production_live override and provider API key fields; fixture dry-run only.
- No public routes, no cron deployment, and no live provider calls in this batch.

## S2 IDOR/authorization verification note
- Added `docs/security-idor-authorization-matrix.md` with representative route family gate classification and expected subject boundaries.
- Route-runtime coverage now includes representative cross-subject denial checks (journal/portfolio), admin/internal gate denial checks (billing/admin/internal/market-evidence/scheduled-ingestion), and mutation security action-kind regression assertions.
- This does not replace external pentest or staging attack drill sign-off.
- Next security phase remains S3 input abuse/injection adversarial testing.

## S3 injection/input-abuse hardening note
- Added representative input-abuse matrix: `docs/security-input-abuse-hardening-matrix.md`.
- Added representative route-runtime tests for query injection/abuse, malformed JSON/body abuse, and internal-error redaction checks.
- This is not security certification and does not replace DAST/fuzzing/pentest.
- S4 (supply-chain/CI), S5 (infra/WAF), and S6 (staging attack drill) remain required.



## S5 infrastructure/WAF/deployment policy update
- Added and adopted `docs/infrastructure-security-policy.md` as required pre-launch policy source.
- Confirms app-level headers baseline and deployment-level enforcement for HTTPS/HSTS/CSP/CORS/WAF.
- Confirms backup/restore, DB/network isolation, IAM least-privilege, and secret rotation are launch blockers.
- Staging verification is required before launch; S6 attack drill remains mandatory.
- This update is policy hardening only and is not security certification.
