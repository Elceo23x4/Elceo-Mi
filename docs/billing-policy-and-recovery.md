# Billing Policy and Recovery (C4-M3A)

C4-M3A adds a deterministic billing policy core that converts canonical billing lifecycle state into account restriction/recovery decisions, persists durable transition records, and exposes replay/query runtime services.

## Decision codes
`premium_active_ok`, `premium_trial_ok`, `premium_paused_restricted`, `premium_past_due_restricted`, `premium_incomplete_restricted`, `premium_incomplete_expired_free_fallback`, `premium_canceled_free_fallback`, `premium_recovered_to_active`, `free_default_ok`, `admin_internal_override_preserved`.

## Semantics
- **Restricted**: paused/past_due/incomplete keep premium plan but restrict access.
- **Free fallback**: canceled/incomplete_expired/null-subscription move to free with conservative account-state preservation.
- **Recovery**: when premium becomes active/trialing after billing restriction path, policy can recover account state to active.
- Stronger non-billing restrictions (`suspended`, `canceled`) are preserved.

## Scope boundary
This pass intentionally stops before admin/API route work. It provides canonical contracts, persistence, policy evaluation, runtime boundary, and tests only.

## C4-M3B next
C4-M3B should add authenticated/internal route surfaces for policy evaluation history, administrative overrides workflow, and policy-trigger observability/reporting.


## C4-M3B API route completion
- Added authenticated current-subject policy read routes: `GET /api/account/billing/policy` and `GET /api/account/billing/policy/transitions`.
- Added internal/admin policy evaluation route: `POST /api/internal/billing/policy/evaluate` (internal token + `admin.ops` feature gate).
- Added admin subject inspection routes: `GET /api/admin/billing/policy` and `GET /api/admin/billing/policy/transitions` with `subjectId` and optional `limit`.
- This batch intentionally stops at API/runtime/docs only; no checkout/payment UI or admin UI was added.


## C4-M4A billing-admin linkage
C4-M4A adds backend billing-admin operational summary/failure/candidate/snapshot read-model core and canonical runtime boundary without adding routes or UI.
