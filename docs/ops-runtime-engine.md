# Ops Runtime Engine (C4-I)

C4-I introduces a canonical operational runtime for backend jobs with deterministic leases, durable run history, replay-safe reports, and scheduler orchestration.

## Why this exists
- unify internal ops jobs under one contract
- prevent overlapping execution by scoped lease keys
- persist auditable run history for replay/query

## Job kinds
- snapshot_refresh
- notification_dispatch
- notification_verification_expiry
- notification_feedback_ingest
- ingestion_tick
- workspace_maintenance

## Lease policy
Per-job lease durations are fixed and deterministic (5-30 min). Active non-expired lease blocks overlap for same jobKind+scopeKind+scopeKey.

## Execution rules
- cleanup expired leases
- acquire lease or persist skipped/blocked run
- execute adapter
- persist success/partial/failed report
- release lease on success and failure

## Scheduler semantics
Global cycle order:
1) notification_dispatch
2) notification_verification_expiry

Subject maintenance order:
1) snapshot_refresh
2) workspace_maintenance

## Persistence + replay
- `app_ops_job_leases`
- `app_ops_job_runs`

Replay reads persisted `report_json` and validates contracts strictly. Malformed JSON fails deterministically.

## Out of scope
This batch does not include admin UI, cloud cron wiring, or external queue infrastructure.

## Next batch
C4-J should add authenticated admin/ops APIs and operator-focused runbook surfaces over these persisted runtime/query contracts.

## C4-J linkage
Ops run and lease persistence now feed the admin control-plane read models for cross-domain operational summary and timeline assembly.
