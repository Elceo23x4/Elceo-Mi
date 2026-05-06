# Scheduled Market Evidence Ingestion (C5-A22)

- Introduces scheduled ingestion contracts, schemas, repositories, and orchestration services.
- Default execution mode is `dry_run_fixture` only.
- `production_live` execution is hard-blocked in this batch.
- Persisted run records support query and replay semantics against stored data only.
- Retry/backoff and staleness status are deterministic helper policies.
- No cron deployment and no live provider calls by default.

## C5-A23 note
- Added protected internal/admin scheduled-ingestion routes: policies/runs/replay (GET) and dry-run (POST).
- Dry-run POST is internal+admin.ops gated with mutation security decision, idempotency, rate-limit, audit, and response-envelope completion.
- Route input rejects production_live override and provider API key fields; fixture dry-run only.
- No public routes, no cron deployment, and no live provider calls in this batch.
