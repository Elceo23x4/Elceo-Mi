# Provider Live Activation Readiness (C5-A21)

C5-A21 introduces staging-only live provider activation planning gates.

- Canonical contracts added for activation policy, readiness status, readiness snapshot, quota policy, and smoke plan.
- Production live ingestion remains blocked by default.
- No scheduler, no cron, no live ingestion enablement in production.
- Tiingo staging readiness requires explicit live enablement plus API key.
- Helpers return no secrets and perform no network calls.
- Smoke plans are planning artifacts only and gate on staging-ready status.
- C5-A22 will build scheduled ingestion orchestration on top of these contracts.

## C5-A22 note
- Added scheduled ingestion orchestration foundation with dry-run fixture jobs, persisted run records, query/replay helpers, deterministic retry/staleness helpers, and production-live blocked by default.
- No cron deployment and no live provider calls by default in this batch.

