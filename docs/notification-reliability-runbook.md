# Notification reliability runbook

RC-I3 implements the notification reliability and local/sandbox validation foundation.

## Invariant

One notification decision may create at most one durable outbox item per target/channel/deduplication key. Provider dispatch may be attempted only through the durable outbox state machine.

## Provider modes

Supported modes are `disabled`, `local_fake_provider`, `replay_provider`, `sandbox_provider`, and `production_provider_blocked`. Defaults are safe. Production-live notification activation remains blocked unless separately approved.

Sandbox smoke requires `ELCEO_NOTIFICATION_SANDBOX_SMOKE=1`, `NOTIFICATION_PROVIDER_MODE=sandbox_provider`, `NOTIFICATION_PROVIDER_KIND`, provider sandbox credentials from the environment, and SQL repository/database configuration when durable SQL smoke is required. Replay smoke is not equivalent to real provider sandbox validation.

## Dispatch and retry

Dispatch reads staged/failed due outbox records, marks dispatching, validates payload and target, records exactly one attempt per provider dispatch decision, and then marks delivered, failed with deterministic backoff, or dead/exhausted. Temporary, rate-limit, timeout, ambiguous, and unavailable outcomes remain operator-visible; permanent failures, invalid targets, and unsubscribe/disable decisions become dead/exhausted and are not automatically redispatched.

## Unsubscribe/disable policy

Unsubscribe/disable enforcement is required. Global notification disable overrides channel-level enable. Billing-critical notifications and operator/admin notifications require explicit policy review before production-live notification activation; RC-I3 records the local enforcement hook and audit trail for blocked dispatch.

## Operator inspection

Operators must inspect pending/staged, dispatching, failed retryable, dead/exhausted, delivered, recent failures, recent dead-letter items, safe redacted payload previews, safe redacted target previews, and per-outbox attempt history. Secrets and unsafe PII must not be printed.

## Launch dependencies

RC-I2-CERT remains a mandatory unresolved pre-launch blocker. RC-J remains a mandatory subsequent launch batch. Intelligence Feature Program remains a mandatory pre-launch dependency. RC-K remains final full-repository closure. No remaining launch workflow item is deferred or postponed.
