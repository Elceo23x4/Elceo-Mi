# Admin Control Plane (C4-J)

This batch introduces a backend-only, deterministic admin read layer for cross-domain operational visibility.

- System summary aggregates persisted refresh, freshness, and ops runtime data.
- Freshness summary reads persisted freshness records only.
- Ops summary reads persisted ops run + stale lease state only.
- Provider summary is a deterministic capability contract placeholder for current provider surfaces.
- Audit timeline deterministically assembles refresh + ops events into a bounded, ordered timeline.

API routes (internal-gated):
- `/api/admin/system-summary`
- `/api/admin/freshness`
- `/api/admin/ops`
- `/api/admin/providers`
- `/api/admin/audit`

This batch intentionally stops before admin UI rendering.


## C4-M2B internal billing reconciliation linkage

Operational billing reconciliation execution is exposed via `POST /api/internal/billing/reconcile`, guarded by internal token and `admin.ops` feature access to align with existing internal operations policy.


### Billing policy admin/internal controls (C4-M3B)
- Internal evaluation endpoint for subject-level policy replay/evaluation: `POST /api/internal/billing/policy/evaluate`.
- Admin read endpoints for subject policy status and transition history are API-only in this batch; no control-plane UI shipped.


### C4-M4A billing-admin operational core
Adds runtime-only billing operational summary, failure classification, retry-candidate, and subject snapshot read models for future control-plane route integration.


## C4-M4A completion note
The control-plane backend now has concrete billing-admin runtime read models (summary, failures, candidates, subject snapshot) ready for route integration in C4-M4B.

## C4-M4B Billing Admin Control Surfaces
- `/api/admin/billing/operations/summary`
- `/api/admin/billing/operations/failures?limit=`
- `/api/admin/billing/operations/retry-candidates?limit=`
- `/api/admin/billing/operations/subject?subjectId=`
- `/api/internal/billing/reconcile/retry`
All routes are internal/admin guarded; no end-user direct access.


## C4-M5B Billing Orchestration Controls
- `/api/admin/billing/orchestration/latest`
- `/api/admin/billing/orchestration/runs`
- `/api/admin/billing/orchestration/subject`
- `/api/internal/billing/orchestration/retry`

This completion is API-only. Admin UI wiring and automated scheduler-managed retries are intentionally deferred to the next hardening batch.


## C4-M6B1C admin entitlement write hardening
The admin entitlement mutation routes are now runtime-security protected:
- `POST /api/admin/entitlements/plan`
- `POST /api/admin/entitlements/state`
- `POST /api/admin/entitlements/override`

All three retain internal-token gating, then run canonical security control evaluation with `actionKind: admin_write` before mutation execution. Successful mutations complete idempotent actions (when idempotency headers are provided) and emit security audit events.

## C4-M6B2B admin billing write hardening
Admin billing mutation surfaces now use canonical route-security enforcement (`admin_write`) in addition to existing internal-token gates and request validation:
- `/api/admin/billing/trial`
- `/api/admin/billing/activate`
- `/api/admin/billing/renew`
- `/api/admin/billing/change-plan`
- `/api/admin/billing/past-due`
- `/api/admin/billing/cancel-at-period-end`
- `/api/admin/billing/expire`
- `/api/admin/billing/pause`
- `/api/admin/billing/resume`
- `/api/admin/billing/provider-plan-mapping`
