# Ingestion Outbox Publishing (C2-F)

## Purpose

C2-F adds durable publication semantics on top of persisted canonical ingestion runs.
Publication intent is stored in a durable outbox before transport delivery attempts.

## Topic contracts

`IngestionPublishTopic`:

- `ingestion.canonical.run.completed`
- `ingestion.canonical.events.snapshot`
- `ingestion.canonical.run.failed`

Typed payload contracts:

- `IngestionRunCompletedMessage`
- `IngestionEventSnapshotMessage`
- `IngestionRunFailedMessage`

All message payloads include explicit contract fields and source marker `source = 'elceo.ingestion'`.

## Outbox records

Primary durable table: `app_ingestion_outbox`.

Lifecycle status:

- `pending`
- `publishing`
- `published`
- `failed`
- `dead`

Each row stores:

- run/request/slot identity
- deterministic dedupe key
- full JSON payload
- attempt counters and error metadata
- availability/retry timestamps

Attempt history table: `app_ingestion_outbox_attempts`.

## Dedupe rules

Deterministic dedupe keys:

- run completed: `run_completed|runId`
- run failed: `run_failed|runId`
- event snapshot: `event_snapshot|runId|asset|timeframe`

Staging is idempotent by dedupe key.

## Staging semantics

After canonical run persistence:

- `success` / `partial_success`
  - stage `run_completed`
  - stage `event_snapshot` only when event snapshot contains events
- `failed`
  - stage `run_failed`

If staging fails after persistence, run remains persisted and boundary status is downgraded to `partial_success` with explicit failure reason marker.

## Delivery attempt semantics

Outbox publisher flow:

1. load due items (`pending`/`failed` + `available_at <= now`)
2. mark `publishing`
3. attempt publish via transport abstraction
4. save attempt row
5. success => mark `published`
6. failure => mark `failed` with deterministic backoff or `dead` after threshold

Backoff policy:

- linear: `nextAvailableAt = now + attemptCount * 5 minutes`

Dead policy:

- when `attemptCount` reaches configured `maxAttemptsBeforeDead`, item status becomes `dead`

## Replay publish semantics

Replay staging helpers are driven by persisted data only:

- stage by `runId`
- stage by `requestKey`
- stage by scheduled `slotStartAt` (asset/timeframe/slot)
- stage by latest `asset/timeframe`

Replay staging reuses deterministic dedupe keys, so repeated replay requests remain idempotent.

## Transport abstraction

Publisher uses `IngestionPublishTransport` interface:

- memory transport for tests/local
- Kafka adapter transport behind abstraction

Scheduler/runtime paths do not publish directly to Kafka.
They stage durable outbox intent first.

## What C2-G should handle

C2-G can extend outbox operations with operational dead-letter workflows, admin controls, and downstream delivery orchestration (notifications/reasoning) while preserving outbox durability and auditability.
