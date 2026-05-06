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

## C4-M6C2C portfolio mutation security wiring
Narrow security action kinds are now applied for portfolio mutation families:
- Watchlist POST/PATCH/lifecycle write routes use `portfolio_watchlist_write`.
- Position POST/PATCH/lifecycle write routes use `portfolio_position_write`.
- Action-item POST/PATCH/lifecycle write routes use `portfolio_action_write`.
- `POST /api/portfolio/snapshot/generate` remains on `portfolio_snapshot_generate`.

Portfolio read routes remain unprotected by mutation security decisioning by design.


## C4-M6C2D notification narrow-action completion
- Notification target mutation routes are protected with `notification_target_write`: `POST /api/notifications/targets`, `POST /api/notifications/targets/[targetId]/enable`, `POST /api/notifications/targets/[targetId]/disable`.
- Notification subscription mutation routes are protected with `notification_subscription_write`: `POST /api/notifications/subscriptions`, `PATCH /api/notifications/subscriptions/[subscriptionId]`.
- Verification mutation routes remain protected with narrow actions from C4-M6C2A: `notification_verification_issue` and `notification_verification_consume`.
- Internal delivery dispatch remains protected with `notification_dispatch`.
- Read-equivalent notification routes (`GET /api/notifications/summary`, `GET /api/notifications/inbox`, `GET /api/notifications/targets`, `GET /api/notifications/subscriptions`, `GET /api/notifications/health`) remain intentionally outside mutation security decisioning because they do not mutate state.
- Replay semantics are unchanged: replayed requests return the standardized conflict replay envelope (no full prior-response payload replay yet).
- C4-M6C2 narrow-route action coverage is now complete across journal, portfolio, and notification mutation families.
- Remaining production hardening is unchanged: full-response idempotency replay, infra/WAF rate limits, and final penetration/security review.

## C4-M7B full-response idempotency replay route behavior
For routes using the shared server security helper with response-envelope completion wiring:
- replayed idempotency decisions can now return the previously stored full API response envelope and stored HTTP status,
- replay storage persists serialized response envelopes (`responseJson`) and hashes, never raw request bodies,
- replay-unavailable conditions return explicit conflict envelopes with reason details,
- malformed stored replay payloads return deterministic internal replay-failure envelopes.

Representative M7B-enabled routes:
- `POST /api/internal/billing/reconcile`
- `POST /api/workspace/refresh`
- `POST /api/analytics/generate`
- `POST /api/notifications/verification/issue`
- `POST /api/portfolio/watchlist`

## C4-M7C broadened idempotency replay persistence coverage
M7C extends M7B response-envelope persistence across protected JSON mutation route families using shared route-security completion so idempotent replay can return previously stored success envelopes broadly instead of only representative routes.

Notes:
- Envelope shape returned by routes is unchanged.
- Replay storage persists serialized success envelopes plus hashes; request bodies remain hash-only.
- No residual legacy completion tail remains for protected JSON mutation routes using `completeSecurityDecision(...)` in this batch.

## C4-M8B deployed API smoke-test coverage
Deployment verification script: `npm run smoke:production` (`scripts/production-smoke-test.mjs`).

Coverage intent:
- Unauthorized envelope checks on protected account/admin surfaces.
- Internal-token gate validation on admin read routes.
- Safe read checks for admin and authenticated route families when tokens are provided.
- Protected POST rejection behavior without auth/internal credentials.
- Optional mutation-mode checks only when `ELCEO_SMOKE_ALLOW_MUTATIONS=true`.

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
\n\n## C5-A24 backend consolidation linkage\n- See  for consolidated C5 backend readiness truth source.\n- Live ingestion remains blocked-by-default; cron deployment and public SEO route launch remain deferred.\n- Production go/no-go still requires security verification track, staging smoke, and production smoke.\n- DB migrations must be applied in strict lexicographic order (including , , ).\n- Known non-blocking warnings remain tracked; do not treat them as launch-complete signals.

## C5-A24 backend consolidation linkage
- See `docs/c5-market-evidence-backend-readiness-report.md` for consolidated C5 backend readiness truth source.
- Live ingestion remains blocked-by-default; cron deployment and public SEO route launch remain deferred.
- Production go/no-go still requires security verification track, staging smoke, and production smoke.
- DB migrations must be applied in strict lexicographic order (including `0032`, `0033`, `0034`).
- Known non-blocking warnings remain tracked; do not treat them as launch-complete signals.
