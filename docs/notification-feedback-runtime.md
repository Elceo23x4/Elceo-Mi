# Notification Feedback Runtime (C3-K)

## Provider event intake model

C3-K introduces a canonical feedback intake boundary for provider callbacks and delivery-side failures.
Each intake call captures raw payloads durably in `app_notification_provider_events` and creates a canonical receipt row in `app_notification_delivery_receipts`.

## Normalization flow

1. Select normalizer by channel/provider context.
2. Map explicitly-known payload fields into canonical event fields.
3. Preserve `rawEventJson` exactly.
4. Persist `normalizedMetaJson` only for deterministic metadata.
5. If payload shape is unknown, classify as `eventKind=unknown` with warning severity.

## Correlation rules

Deterministic correlation order:
1. explicit IDs present in normalized metadata (`attemptId`, `outboxId`)
2. provider message id via persisted outbox attempts
3. no correlation fallback (store null references)

No fuzzy matching by text/body/headline is allowed.

## Delivery receipt semantics

Receipts capture:
- provider identity
- channel
- canonical event kind + severity
- correlated outbox/attempt/decision/target references when known
- reason code/message
- raw + normalized JSON payloads
- immutable audit timestamps

## Target health degradation rules

Target health is persisted in `app_notification_target_health` and updated deterministically per receipt.

- accepted/delivered: update last-receipt only
- provider_failed: soft failure progression (`>=3 warning`, `>=5 degraded`)
- bounced: hard failure progression (`1 warning`, `2 degraded`, `3 disabled`)
- complained/unsubscribed/invalid_target: immediate disable

Target disablement is explicit and durable through target status updates, with no deletion or hidden side effects.

## Automatic target disabling conditions

A target is disabled when receipt kind is:
- `complained`
- `unsubscribed`
- `invalid_target`
- `bounced` with hard-failure threshold reached

## Replay semantics

Replay surfaces are available for:
- provider events by id / by target
- receipts by id / by target
- target health by target id

Replay returns persisted durable records. JSON corruption fails deterministically.

## Operational feedback summaries

Feedback summary read surface provides counts for:
- accepted, delivered, bounced, complained, unsubscribed
- invalid_target, provider_failed, unknown
- degraded and disabled targets

Additional lists:
- degraded/disabled targets
- recent critical receipts

## Why this closes the provider feedback loop

C3-K closes the loop by connecting dispatch outcomes to provider feedback and recipient health state:
- provider callbacks become durable events
- events become canonical receipts
- receipts mutate durable target health
- unhealthy targets are deterministically degraded/disabled
- replay surfaces keep every transition auditable

## What C3-L should cover next

C3-L should focus on operational automation and controls:
- provider-webhook authenticity verification and signature policy
- dead-letter feedback intake and re-drive controls
- richer provider-specific normalizer libraries
- SLO alerting and scheduled health remediation workflows
