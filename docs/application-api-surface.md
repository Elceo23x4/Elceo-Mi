# Application API Surface (C4-H)

## Authenticated subject model
All application-facing routes resolve subject identity server-side from the authenticated session.

- Subject shape: `{ subjectKind: 'user', subjectId, userId }`
- User-scoped routes never trust caller-provided `subjectId`.
- Internal/ops routes require `x-elceo-internal-token` matching `ELCEO_INTERNAL_API_TOKEN`.

## Envelope contract
All new C4-H routes return one envelope shape:

- Success: `{ ok: true, data, meta? }`
- Error: `{ ok: false, error: { code, message, details? } }`

Error code mapping:
- unauthorized → 401
- forbidden → 403
- bad_request / validation_error → 400
- not_found → 404
- conflict → 409
- unprocessable_entity → 422
- dependency_failed → 424
- internal_error → 500

## Route groups

### Workspace
- `GET /api/workspace/current`
- `POST /api/workspace/refresh`
- `GET /api/workspace/freshness`
- `GET /api/workspace/history`
- `GET /api/workspace/agenda`

### Journal
- `GET|POST /api/journal/cases`
- `GET /api/journal/cases/[caseId]`
- `GET /api/journal/cases/[caseId]/replay`
- `POST /api/journal/cases/[caseId]/{plan|execute|adjust|partial-close|close|cancel|review}`
- `GET /api/journal/influence/latest`
- `POST /api/journal/influence/generate`

### Portfolio
- Watchlist, positions, actions CRUD and lifecycle mutation endpoints.
- Snapshot read/generate endpoints.
- Replay and attention endpoints.

### Analytics and coaching
- Latest read routes and explicit generate routes.
- Top setup/behavior and coaching focus/action-plan routes.

### Notifications
- Summary, inbox, targets, subscriptions, health.
- Verification issue/consume.
- Internal delivery dispatch route.

### Refresh and ops
- Refresh latest/history/freshness/run.
- Internal ops routes for verification expiry and feedback processing.

## Validation semantics
- Request DTOs are validated via `@elceo/schemas` app API validators.
- Field-level deterministic errors are returned under `validation_error` with `details[]`.
- Query-limit parsing uses explicit caps.

## Read vs generate semantics
Read routes (`latest/current/history`) do not silently regenerate snapshots in C4-H.
Generation is explicit through dedicated mutation routes (`.../generate`, `.../refresh`, `.../run`).

## C4-I next
- Broader route-level runtime test matrix and auth mocking harness.
- Endpoint-level rate limiting and idempotency tokens for high-value mutations.
- Admin operations policy hardening and audit trails.
- UI integration using these stable authenticated contracts.


## C4-I ops runtime linkage
Internal operational execution is now unified under the canonical ops runtime boundary for lease-safe scheduling and replayable maintenance job history.

## C4-J admin control-plane routes
- GET /api/admin/system-summary (internal token)
- GET /api/admin/freshness (internal token)
- GET /api/admin/ops (internal token)
- GET /api/admin/providers (internal token)
- GET /api/admin/audit (internal token)

## C4-K2 entitlement API additions

Authenticated account endpoints:
- `GET /api/account/entitlements`
- `GET /api/account/usage`
- `GET /api/account/access-decisions`
- `POST /api/account/access-check`

Internal/admin endpoints:
- `POST /api/admin/entitlements/plan`
- `POST /api/admin/entitlements/state`
- `POST /api/admin/entitlements/override`

Route-level entitlement gates in C4-K2:
- `POST /api/workspace/refresh` -> `workspace.refresh`
- `POST /api/analytics/generate` -> `analytics.generate`
- `POST /api/coaching/generate` -> `coaching.generate`
- `POST /api/portfolio/snapshot/generate` -> `portfolio.snapshot.generate`
- `POST /api/refresh/run` -> `refresh.run`
- `GET /api/admin/*` -> `admin.read` (in addition to internal token)
- internal ops `POST /api/ops/*` routes -> `admin.ops` (in addition to internal token)

## C4-L2 billing API additions

Authenticated account endpoints:
- `GET /api/account/billing`
- `GET /api/account/billing/events`

Internal/admin endpoints:
- `POST /api/admin/billing/trial`
- `POST /api/admin/billing/activate`
- `POST /api/admin/billing/renew`
- `POST /api/admin/billing/change-plan`
- `POST /api/admin/billing/past-due`
- `POST /api/admin/billing/cancel-at-period-end`
- `POST /api/admin/billing/expire`
- `POST /api/admin/billing/pause`
- `POST /api/admin/billing/resume`

C4-L2 billing routes are runtime-core integrations only. They are intentionally provider-agnostic manual operations and stop before checkout, payment processing, webhook ingestion, and billing UI.


## C4-M1C payment-provider route additions

Internal routes:
- `POST /api/internal/billing/provider-events`
- `POST /api/internal/billing/provider-events/replay`

Admin routes:
- `POST /api/admin/billing/provider-plan-mapping`
- `GET /api/admin/billing/provider-plan-mappings`
- `GET /api/admin/billing/provider-events`

These routes use standardized success/error envelopes and are internal-token gated; admin paths also require admin feature-access gates.


## C4-M2B billing lifecycle route additions

Authenticated account endpoints:
- `GET /api/account/billing` (canonical lifecycle snapshot)
- `GET /api/account/billing/reconciliation-runs`

Internal/admin endpoint:
- `POST /api/internal/billing/reconcile` (internal token + `admin.ops`)

These routes consume the canonical billing lifecycle boundary and intentionally stop before checkout/payment collection surfaces.


### Billing policy routes (C4-M3B)
- `GET /api/account/billing/policy` (auth subject snapshot)
- `GET /api/account/billing/policy/transitions` (auth subject recent transitions)
- `POST /api/internal/billing/policy/evaluate` (internal token + `admin.ops`, body: `{ subjectId, sourceReconciliationRunId? }`)
- `GET /api/admin/billing/policy?subjectId=...` (internal token)
- `GET /api/admin/billing/policy/transitions?subjectId=...&limit=...` (internal token)

## C4-M4B API additions
- GET `/api/admin/billing/operations/summary`
- GET `/api/admin/billing/operations/failures`
- GET `/api/admin/billing/operations/retry-candidates`
- GET `/api/admin/billing/operations/subject`
- POST `/api/internal/billing/reconcile/retry`
- POST `/api/internal/billing/policy/evaluate` retained for re-evaluation alignment.


## C4-M5B billing orchestration API additions
- `GET /api/admin/billing/orchestration/latest?subjectId=...`
- `GET /api/admin/billing/orchestration/runs?subjectId=...&limit=...`
- `GET /api/admin/billing/orchestration/subject?subjectId=...`
- `POST /api/internal/billing/orchestration/retry` body `{ subjectId }`

All routes are internal/admin operational surfaces: internal token + `admin.ops` access, standardized success/error envelopes.


## C4-M6B1 security-protected mutation routes
Protected by canonical server security decisioning (`requireSecurityDecision`) with standardized blocked/replay envelopes and helper-managed idempotency completion/failure + audit:
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


## C4-M6B2A user-facing route security integration
Security controls (`requireSecurityDecision`) now protect authenticated high-cost user mutation routes: workspace refresh, analytics generate, coaching generate, portfolio snapshot generate, refresh run, and journal influence generate. These routes now enforce rate-limit/idempotency/replay envelopes and complete/fail idempotency lifecycle around mutation execution, with audit recording on successful mutation paths.

## C4-M6B2B mutation security sweep updates
Security runtime protection was extended to remaining billing/admin/internal mutation routes:
- Admin billing mutation POST routes: trial/activate/renew/change-plan/past-due/cancel-at-period-end/expire/pause/resume.
- Admin billing provider mapping mutation POST route.
- Internal billing provider event ingest/replay POST routes.

All newly protected routes now evaluate security controls between auth+validation and mutation execution, then complete/fail idempotency lifecycle and emit audit events on success.

## C4-M6C1 security policy foundation (no route rewiring yet)
Security runtime action-kind taxonomy is expanded for deferred user mutation families (journal, portfolio write operations, notification target/subscription/verification mutations). This batch does not change route handlers yet; M6C2 will apply these action kinds to the remaining mutation endpoints.


## C4-M6C2A narrow security action route wiring (partial slice)
- `POST /api/journal/cases` -> `journal_case_write`
- `POST /api/journal/cases/[caseId]/plan` -> `journal_case_lifecycle`
- `POST /api/journal/influence/generate` -> `journal_influence_generate`
- `POST /api/notifications/verification/issue` -> `notification_verification_issue`
- `POST /api/notifications/verification/consume` -> `notification_verification_consume`

Remaining M6C2 follow-up scope (not covered by this partial slice):
- other journal lifecycle mutation routes
- portfolio watchlist/position/action mutation routes
- notification target/subscription mutation routes

## C4-M6C2B narrow journal lifecycle integration (completion)
- Newly security-protected journal lifecycle mutation routes (`actionKind: journal_case_lifecycle`):
  - `POST /api/journal/cases/[caseId]/adjust`
  - `POST /api/journal/cases/[caseId]/cancel`
  - `POST /api/journal/cases/[caseId]/close`
  - `POST /api/journal/cases/[caseId]/execute`
  - `POST /api/journal/cases/[caseId]/partial-close`
  - `POST /api/journal/cases/[caseId]/review`
- Existing M6C2A journal lifecycle coverage retained:
  - `POST /api/journal/cases/[caseId]/plan`
- Intentionally unprotected (read-equivalent):
  - `GET /api/journal/cases/[caseId]`
  - `GET /api/journal/cases/[caseId]/replay`

Remaining M6C2 follow-up scope after C4-M6C2B:
- portfolio watchlist/position/action mutation routes
- notification target/subscription mutation routes
