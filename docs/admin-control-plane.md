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
