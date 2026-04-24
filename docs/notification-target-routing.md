# Notification Target Routing (C3-G)

## Target model
C3-G introduces durable notification targets in `app_notification_targets`.
A target binds a canonical subject (`user`, `workspace`, `ops`) to a concrete channel address and status.
Only `active` targets are eligible for dispatch.

## Subscription model
C3-G introduces durable subscriptions in `app_notification_subscriptions`.
A subscription is evaluated deterministically per decision against:
- channel
- asset scope (`*` or exact)
- timeframe scope (`*` or exact)
- rule scope (`*` or exact)
- optional `minMaterialityScore`

## Matching rules
A subscription matches when:
- `enabled = true`
- subscription channel is present in decision channels
- asset/timeframe/rule scopes match
- decision materiality satisfies min threshold when configured

Deterministic ordering:
1. decision channel order
2. subject priority: user -> workspace -> ops
3. subjectId asc
4. subscriptionId asc

## Target resolution rules
Target resolution is explicitly separate from policy evaluation.
Policy says *whether* to notify; resolution says *who/where*.
Resolver loads targets by matched subscription subject and keeps only active targets for the same channel.
Deduplication key is `targetId + channel` in first-appearance order.
Deterministic `targetKey` format: `target|{targetId}`.

## Target-aware outbox keys
C3-G upgrades outbox idempotency from channel-level to target-level:
- outbox key: `outbox|{decisionKey}|{channel}|{targetKey}`
- delivery key: `delivery|{decisionId}|{channel}|{targetKey}`

This guarantees one durable outbox row per decision+channel+target identity.

## Durable in-app inbox semantics
C3-G adds `app_notification_inbox` and in-app delivery sink behavior.
On successful in-app delivery:
- deterministic inbox id: `inbox|{decisionId}|{targetId}`
- one persisted inbox row per target/decision
- repeated deliveries are idempotent
- record remains replayable before UI exists

## Why resolution is separate from policy
Policy evaluation stays deterministic and domain-centric.
Target resolution is operational/recipient-centric and changes independently as targets/subscriptions change.
This separation keeps policy replay stable and delivery auditable.

## Out of scope in C3-G
C3-G intentionally does **not** add:
- notification center UI
- preference management UI
- campaign/marketing broadcast tooling

## C3-H next scope
C3-H should cover:
- operational tooling for target/subscription lifecycle administration
- provider-backed email/push adapters
- dead-letter re-drive controls
- inbox read/archive mutation boundary APIs
