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
