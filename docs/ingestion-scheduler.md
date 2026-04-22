# Ingestion Scheduler (Core Batch C2-E)

## Purpose

C2-E adds deterministic scheduling above canonical runtime execution so each scheduled run has explicit slot identity, trigger context, request key, and lease behavior.

## Trigger kinds

`IngestionTriggerKind`:

- `scheduled`
- `manual`
- `replay`
- `backfill`
- `shadow_compare`

Each runtime execution can carry `IngestionTriggerContext`:

- `triggerKind`
- `requestedAt`
- `requestKey`
- `slotStartAt`
- `slotEndAt`
- `schedulerTickId`
- `requestedBy`
- `notes`

Validation rule:

- scheduled triggers must include `slotStartAt` and `slotEndAt`

## Schedule frequencies and slot semantics

`IngestionScheduleFrequency`:

- `five_minutes`
- `fifteen_minutes`
- `hourly`
- `four_hourly`
- `daily`

Duration mapping (minutes):

- five_minutes = 5
- fifteen_minutes = 15
- hourly = 60
- four_hourly = 240
- daily = 1440

Slot semantics are UTC-based and deterministic:

- `floorIsoToScheduleSlot(iso, frequency)` floors timestamp to current slot start
- `getNextSlotStart(iso, frequency)` advances one slot from floored start
- `getSlotEnd(slotStart, frequency)` returns exclusive end boundary

Example floors:

- 10:07 + five_minutes => 10:05
- 10:14 + fifteen_minutes => 10:00
- 10:59 + hourly => 10:00
- 11:17 + four_hourly => 08:00
- 2026-04-22T17:33Z + daily => 2026-04-22T00:00Z

## Schedule plan defaults

Default timeframe frequency mapping:

- M5 => five_minutes
- M15 => fifteen_minutes
- H1 => hourly
- H4 => four_hourly
- D1 => daily

Default lookback hours:

- M5 => 6
- M15 => 12
- H1 => 24
- H4 => 72
- D1 => 168

Default priorities:

- XAU/USD 100
- BTC/USD 100
- Nasdaq 100 95
- S&P 500 95
- DE30 90
- EUR/USD 90
- GBP/USD 88
- USD/JPY 88
- USD/CHF 85
- AUD/USD 85
- USD/CAD 85
- NZD/USD 82

## Request key format

Deterministic human-readable keys:

- scheduled: `scheduled|asset|timeframe|frequency|slotStartIso|mode`
- manual: `manual|asset|timeframe|requestedAtIso`
- replay: `replay|asset|timeframe|runId-or-slot-reference`

Request keys are stable identifiers for dedupe/lease behavior.

## Lease semantics

Durable leases live in `app_ingestion_runtime_leases` keyed by `request_key`.

Acquire behavior:

- if active non-expired acquired lease exists for key => acquire fails
- expired leases can be reacquired

Release behavior:

- scheduler releases lease after dispatch attempt

Default lease durations:

- five_minutes => 4m
- fifteen_minutes => 12m
- hourly => 45m
- four_hourly => 180m
- daily => 720m

## Due-run policy

A plan item is due when:

1. item is enabled
2. current slot start is computed from `floorIsoToScheduleSlot(nowIso, frequency)`
3. no persisted scheduled run exists for same asset/timeframe/slot with status success or partial_success and active boundary canonical/legacy

Policy for failed slots:

- failed slot remains due (redispatch is allowed)

## Due-run sort order

Deterministic order:

1. priority descending
2. smaller interval first (5m, 15m, hourly, 4h, daily)
3. asset lexicographic
4. timeframe lexicographic

## Scheduler tick report

`SchedulerTickReport` includes:

- tick timing
- evaluated plan count
- due run count
- dispatched count
- skipped locked count
- skipped not-due count
- success / partial / failed counts
- per-dispatch records with request key, slot, lease and run status

## Kafka status

Kafka dispatch is still out of scope in C2-E.
This batch covers scheduling correctness only.

## What C2-F should cover next

C2-F can add operational transport orchestration (Kafka), retry/dead-letter strategy, and downstream dispatch controls using the deterministic scheduler context introduced here.
