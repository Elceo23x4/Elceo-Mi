# ELCEO DB Migration Readiness Checklist (C4-M8A)

## Ordered migration execution plan
Apply `infra/db/schema/*.sql` in lexicographic filename order exactly as listed:

1. `0001_init.sql` — base relational tables.
2. `0002_auth_and_application_state.sql` — auth and app-state persistence.
3. `0003_alerts_admin_observability.sql` — alerts/admin observability tables.
4. `0004_trade_journal_analytics.sql` — legacy journal analytics persistence.
5. `0005_billing_subscription_lifecycle.sql` — legacy billing lifecycle baseline.
6. `0006_ingestion_runtime_history.sql` — ingestion runtime history.
7. `0007_ingestion_scheduler_runtime.sql` — ingestion scheduler runtime lease/run state.
8. `0008_ingestion_outbox.sql` — ingestion outbox durability.
9. `0009_reasoning_snapshots.sql` — reasoning snapshots.
10. `0010_cognition_deltas.sql` — cognition delta persistence.
11. `0011_notification_decisions.sql` — notification decision state.
12. `0012_notification_delivery_outbox.sql` — notification delivery outbox + attempts.
13. `0013_notification_targets_and_inbox.sql` — notification targets/inbox.
14. `0014_notification_management_keys.sql` — notification management keying.
15. `0015_notification_verifications.sql` — notification verification flows.
16. `0016_notification_orchestration_runs.sql` — notification orchestration run history.
17. `0017_notification_feedback_and_receipts.sql` — notification feedback/receipts.
18. `0018_journal_cases.sql` — canonical journal domain.
19. `0019_journal_influence_snapshots.sql` — journal influence snapshots.
20. `0020_analytics_snapshots.sql` — analytics snapshots.
21. `0021_coaching_snapshots.sql` — coaching snapshots.
22. `0022_portfolio_domain_core.sql` — portfolio domain core.
23. `0023_workspace_snapshots.sql` — workspace snapshots.
24. `0024_snapshot_refresh_runtime.sql` — refresh runtime runs/freshness.
25. `0025_ops_runtime.sql` — ops runtime leases/runs.
26. `0027_billing_lifecycle.sql` — canonical billing lifecycle.
27. `0027_billing_runtime.sql` — billing runtime persistence.
28. `0028_billing_policy_transitions.sql` — billing policy transitions.
29. `0028_payment_provider_boundary.sql` — payment-provider boundary data.
30. `0029_billing_orchestration_runs.sql` — billing orchestration run history.
31. `0030_security_runtime.sql` — security runtime state/audit.
32. `0031_security_idempotency_responses.sql` — idempotency response replay persistence.

## Important compatibility warning
- Filenames include duplicate numeric prefixes (`0027` and `0028`). Do **not** rely on numeric prefix alone; use full lexicographic filename ordering to avoid skipping required files.

## Pre-migration controls
- Take full DB backup and verify restore path before migration window.
- Validate migration account privileges (DDL/DML + lock timeout policy).
- Rehearse complete migration sequence on staging snapshot.
- Record expected duration per migration and set maintenance window guardrails.

## Production execution checklist
- Run migrations in a single deterministic ordered pipeline.
- Stop immediately on first failure; do not continue partial chain.
- Capture migration logs/artifacts.
- If failure occurs, execute rollback/restore per runbook before re-attempt.

## Post-migration verification
- Run API smoke checks for auth, account, billing, entitlements, notifications, ops/admin, workspace, analytics, coaching, and portfolio surfaces.
- Confirm ops/security runtimes can persist run/audit state.
- Confirm billing reconciliation, policy transitions, and orchestration runs can persist and replay.
- Confirm notification outbox/attempt tables write/read correctly.

## Backfill and nullable caveats
- Existing nullable compatibility columns/JSON payload fields are expected across snapshot/runtime tables to preserve replay compatibility.
- Do not enforce new NOT NULL constraints without a dedicated backfill batch.
- If schema additions require backfill later, run in staged chunks and verify replay validators after each chunk.

## Migration file verification command (C4-M8B)
Run:
- `npm run check:migrations`

What it verifies:
- Reads `infra/db/schema/*.sql`.
- Prints the exact lexicographic execution order.
- Warns when numeric prefixes are duplicated (for example `0027_*`, `0028_*`).
- Exits non-zero only if schema directory is unreadable/missing or exact duplicate filenames are found.

## C4-M8C deployment linkage
- Run `npm run release:gate` before migration window approval.
- Use `docs/deployment-runbook.md` for rollout and rollback process alignment.
- Re-run `npm run check:migrations` immediately before applying migrations in the release window.

## RC-G migration and database rehearsal update
- Dry-run/order-only rehearsal is performed with `npm run rehearse:migrations:dry-run`; it reads `infra/db/schema/*.sql`, prints the full-filename lexicographic order, and intentionally uses no database connection.
- Mock ledger rehearsal is performed by `npm run test:migrations`; it uses an injected executor for CI-safe clean apply, repeat/idempotency, checksum drift, failure-stop, and DB executor selection/close tests without live credentials.
- Actual local/staging database rehearsal is performed with `ELCEO_MIGRATION_REHEARSAL=1 DATABASE_URL=postgres://... node scripts/rehearse-db-migrations.mjs`; the script dynamically uses the project `pg` driver, creates/verifies the local/staging rehearsal ledger, applies migrations in full-filename lexicographic order, skips matching ledger checksums, fails on checksum drift, stops on first failure, and closes the DB pool.
- Duplicate numeric prefixes (`0027`, `0028`) are non-fatal warnings only because full filenames are the migration identity for this repository. Exact duplicate filenames remain fatal.
- The rehearsal ledger table `elceo_migration_rehearsal_ledger` is a local/staging rehearsal artifact when created by `scripts/rehearse-db-migrations.mjs`; it is not production migration state unless a future explicit migration-state strategy promotes it.
- The script refuses non-dry-run execution unless `ELCEO_MIGRATION_REHEARSAL=1` is present, and it refuses DB execution when `DATABASE_URL` is absent and no injected test DB is supplied.
- Production migration window approval still requires verified backup creation, backup restore rehearsal evidence, staging rehearsal evidence, checksum drift review, and a rollback decision tree before applying production migrations.
- Rollback strategy is restore-first for destructive or unknown migration risk; potentially destructive migrations require explicit mitigation/rehearsal notes before use.
- This document does not claim production DB migration readiness until staging/prod rehearsal with actual managed environment migration state has been performed.
