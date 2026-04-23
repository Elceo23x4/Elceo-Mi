# Ingestion Persistence (C2-D + C2-E)

## Scope

Canonical runtime persistence stores:

- run-level execution reports (`app_ingestion_runs`)
- output canonical event snapshots (`app_ingestion_event_snapshots`)
- scheduler leases (`app_ingestion_runtime_leases`)
- publish outbox records + attempts (`app_ingestion_outbox`, `app_ingestion_outbox_attempts`)

## Persisted run identity fields

`app_ingestion_runs` now includes additive trigger/scheduler identity:

- `trigger_kind`
- `request_key`
- `slot_start_at`
- `slot_end_at`
- `scheduler_tick_id`

These fields make scheduled/manual/replay executions durably distinguishable.

## Trigger semantics in storage

- scheduled runs persist deterministic slot identity and request key
- manual runs persist manual trigger identity with null slot fields unless explicitly slotted
- replay runs persist replay trigger identity

## Replayability

Replay bundles still combine:

- one persisted run row
- persisted canonical event snapshots for that run id

Trigger fields are additive and do not change replay payload format.

## Scheduler lease persistence

`app_ingestion_runtime_leases` stores lease state per deterministic `request_key`.

Status lifecycle:

- `acquired`
- `released`
- `expired`

Rules:

- active non-expired `acquired` lease blocks second acquisition
- expired lease can be reacquired
- released lease can be reacquired for future slots or retry policy

## Out of scope

Notifications dispatch and reasoning orchestration remain out of scope.
Durable publish intent/outbox persistence is now in scope, while downstream workflows are handled in later batches.
