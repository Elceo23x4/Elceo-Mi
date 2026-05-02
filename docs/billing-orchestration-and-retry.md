# Billing Orchestration and Retry (C4-M5B)

C4-M5B completes backend route wiring for orchestration retry/recovery over the canonical billing orchestration boundary.

## Routes
- `GET /api/admin/billing/orchestration/latest?subjectId=...`
- `GET /api/admin/billing/orchestration/runs?subjectId=...&limit=...`
- `GET /api/admin/billing/orchestration/subject?subjectId=...`
- `POST /api/internal/billing/orchestration/retry` with `{ subjectId }`

## Protection model
All four routes are internal/admin-only:
- require internal token (`x-elceo-internal-token`)
- require `admin.ops` feature access

## Behavior constraints
- routes are boundary-driven only (no orchestration planning logic duplicated in handlers)
- deterministic query/body validation
- standardized success/error envelopes
- no raw runtime error leakage

## Non-goals
This batch intentionally does not add:
- admin UI
- automated scheduler retry jobs
- checkout/payment collection flows
- invoice/tax/accounting expansions

## Next production-hardening batch
Recommended next step:
- add retry idempotency keys and throttling controls
- add durable operator audit trails for internal retry invocations
- add scheduler-backed retry queue with bounded concurrency/replay controls
