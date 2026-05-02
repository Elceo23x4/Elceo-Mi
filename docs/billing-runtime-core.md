# Billing Runtime Core (C4-L1)

C4-L1 introduces provider-agnostic billing runtime primitives for subscriptions, lifecycle events, state mapping, and entitlement synchronization.

- Subscription states: `trialing`, `active`, `past_due`, `canceled`, `expired`, `paused`.
- Lifecycle operations: trial start, activation, renewal, plan change, past due, cancel-at-period-end, expiration, pause/resume, manual override marker.
- Commercial mapping: billing drives plan/account state with deterministic fallback to `free` on expiration and `restricted` on pause.
- Entitlements sync: billing commercial state is synchronized into account entitlements without reimplementing entitlement decision logic.
- Provider agnostic by design: supports `internal_manual` and `stripe_placeholder` contracts only.
- Stops before Stripe payment flow, checkout UI, invoicing, and tax concerns.

## C4-L2 next
- Real payment-provider adapter implementation and webhook signature validation.
- Idempotent provider event ingestion pipeline.
- Retry policies and dead-letter handling for provider delivery failures.

## C4-L2 server/API integration

C4-L2 wires the canonical billing runtime boundary into the web server composition runtime and exposes billing operations through API routes.

Added authenticated account billing read routes:
- `GET /api/account/billing`
- `GET /api/account/billing/events`

Added internal/admin billing mutation routes:
- `POST /api/admin/billing/trial`
- `POST /api/admin/billing/activate`
- `POST /api/admin/billing/renew`
- `POST /api/admin/billing/change-plan`
- `POST /api/admin/billing/past-due`
- `POST /api/admin/billing/cancel-at-period-end`
- `POST /api/admin/billing/expire`
- `POST /api/admin/billing/pause`
- `POST /api/admin/billing/resume`

This batch remains provider-agnostic and manual-operations-oriented. It still intentionally stops before checkout, payment provider adapters, webhook ingestion/signature validation, and billing UI.


## C4-M1C provider boundary and routes

C4-M1C adds a canonical payment-provider runtime boundary plus internal/admin API routes for provider event ingest/replay and provider-plan mapping. This layer composes existing normalization/dedupe/sync/translator modules without re-implementing provider logic in routes.

## C4-M5B orchestration routes
C4-M5B adds API wiring for billing orchestration read/retry operations only:
- `GET /api/admin/billing/orchestration/latest?subjectId=`
- `GET /api/admin/billing/orchestration/runs?subjectId=&limit=`
- `GET /api/admin/billing/orchestration/subject?subjectId=`
- `POST /api/internal/billing/orchestration/retry` with `{ subjectId }`

Protection model: internal token and `admin.ops` feature access for all routes.

Non-goals remain unchanged: no admin UI, no checkout/payment collection UX, and no automated scheduler retry jobs in this batch.
