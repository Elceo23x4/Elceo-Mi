# Notification Delivery Runtime (C3-F)

## Purpose

C3-F adds durable outbox-first notification delivery orchestration.
It consumes persisted notification decisions and converts notifying decisions into channel-specific outbox items, dispatch attempts, retry/dead transitions, and replay bundles.

Policy evaluation (C3-E) and delivery dispatch (C3-F) are intentionally separated.

## Delivery lifecycle

1. persisted notification decision exists
2. decision is deserialized and checked (`shouldNotify === true`)
3. one payload is built per eligible channel (`in_app`, `push`, `email`)
4. one durable outbox row is staged per channel
5. dispatcher loads due outbox rows
6. each row is marked `dispatching`
7. transport send is attempted
8. attempt row is persisted for every send attempt
9. outbox row transitions:
   - `delivered` on success
   - `failed` with next `available_at` on retryable failure
   - `dead` after max attempts reached
10. replay API loads outbox + attempts + typed payload

## Channel contracts and payloads

Supported channels in C3-F runtime:

- `in_app`
- `push`
- `email`

Payload behavior:

- in-app title/body = decision headline/body
- push title/body = decision headline/body
- email subject/body = decision headline/body

Staging rejects:

- non-notifying decisions
- channels not present in decision channel list

## Key semantics and idempotency

Deterministic keys:

- delivery key: `delivery|{decisionId}|{channel}`
- outbox key: `outbox|{decisionKey}|{channel}`

Outbox staging is idempotent by `outbox_key`.
Repeated staging of the same decision/channel does not create duplicate durable rows.

## Persistence model

Migration `0012_notification_delivery_outbox.sql` adds:

- `app_notification_outbox`
- `app_notification_outbox_attempts`

Outbox stores lifecycle status, available windows, attempt counters, last error metadata, and payload JSON.
Attempt table stores immutable attempt audit records (success/failure + optional error/response metadata).

## Retry, backoff, and dead-state semantics

Max attempts: **5**.

After failure, next availability uses linear backoff based on failure-count after increment:

- attempt 1 fails => +5 minutes
- attempt 2 fails => +10 minutes
- attempt 3 fails => +15 minutes
- attempt 4 fails => +20 minutes
- attempt 5 fails => `dead` (no reschedule)

Dead-state behavior:

- status set to `dead`
- `dead_at` set
- last error code/message preserved

Payload-deserialization failures are treated as ordinary failures and still persist attempt records.

## Replay semantics

Replay helpers:

- `getNotificationOutboxReplayById`
- `getNotificationOutboxReplayByKey`
- `listNotificationOutboxReplayForDecision`

Each replay bundle returns:

- outbox row
- attempt rows
- deserialized typed payload

Malformed payload JSON fails deterministically.

## Canonical delivery boundary

`CanonicalNotificationDeliveryBoundaryService` exposes:

- `stageForReasoningRun(reasoningRunId, stagedAt?)`
- `stageForDecision(decisionId, stagedAt?)`
- `dispatchDue(asOf?, limit?)`
- `replayDeliveryByOutboxId(outboxId)`
- `replayDeliveryByDecision(decisionId)`

This boundary uses persisted decisions as the source of truth and never bypasses outbox persistence.

## Why policy and delivery are separated

Policy decides whether ELCEO should notify.
Delivery handles transport orchestration durability and failure recovery.

This separation provides:

- deterministic policy audit trails independent of transport outages
- idempotent restaging and redispatch controls
- clear operational replay boundaries

## What C3-G should cover next

C3-G should focus on operational controls and production adapters:

- provider-specific push/email/in-app adapters behind current transport interface
- dead-letter operational tooling and re-drive controls
- delivery SLO/metrics dashboards and failure alerting
- optional entitlement and preference enforcement at dispatch gate (not UI)
