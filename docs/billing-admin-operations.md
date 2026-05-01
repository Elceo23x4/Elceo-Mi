# Billing Admin Operations (C4-M4A)

C4-M4A introduces backend-only billing admin operational read models.

## Semantics
- Operational summary is deterministic from billing lifecycle/policy persisted state and reports counts + health.
- Failure classification maps reconciliation/policy signals into stable failure kinds.
- Retry/re-evaluate candidates identify subjects needing operator follow-up; this batch does not execute retries.
- Subject snapshots combine lifecycle snapshot, policy snapshot, latest reconciliation run, latest policy transition, and compact operational state.

## Scope boundary
This pass intentionally stops before route or admin UI work and provides runtime/query core only.

## C4-M4B next
- admin/internal API routes over this runtime boundary
- operator filters/pagination tuning
- richer replay diagnostics and audit narratives
