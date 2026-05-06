# Scheduled Market Evidence Ingestion (C5-A22)

- Introduces scheduled ingestion contracts, schemas, repositories, and orchestration services.
- Default execution mode is `dry_run_fixture` only.
- `production_live` execution is hard-blocked in this batch.
- Persisted run records support query and replay semantics against stored data only.
- Retry/backoff and staleness status are deterministic helper policies.
- No cron deployment and no live provider calls by default.
