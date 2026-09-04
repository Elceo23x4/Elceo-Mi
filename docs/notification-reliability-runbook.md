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

RC-I2-CERT remains a mandatory unresolved pre-launch blocker. RC-J remains a mandatory subsequent launch batch. Intelligence Feature Program remains a mandatory pre-launch dependency. RC-K remains final full-repository closure. No remaining launch workflow item is labeled with prohibited launch deferral language.

## RC-J monitoring alignment
Notification production-live activation remains blocked unless separately approved. RC-J monitoring/alert smoke validates alert routing and redaction status only; it does not complete notification sandbox/live certification and does not enable production-live notification delivery.

## RC-I3 provider contract

The launch delivery stack is the existing PostgreSQL outbox plus in-app delivery, Resend email, and exact-subscription OneSignal browser push. Postmark is a dormant, manually selected contingency; there is no automatic provider failover. Credentials never activate `production_provider`, and both `ELCEO_ALLOW_NOTIFICATION_SENDS` and `NOTIFICATION_SENDS_ENABLED` remain manual safety gates.

Resend requires a verified sending domain and a Svix-verified webhook. OneSignal requires its web app ID and a real sandbox browser subscription; iOS/iPadOS web push may require installation to the Home Screen. Postmark callbacks use HTTPS Basic Authentication; provider IP allowlisting belongs at the trusted WAF/proxy boundary. Only `NEXT_PUBLIC_ONESIGNAL_APP_ID` is browser-public; all API keys, webhook credentials, and correlation secrets are server-only.

External certification remains outstanding after repository merge. Explicit smoke forms are `npm run notification:sandbox-smoke -- --provider resend`, `--provider onesignal`, and optional `--provider postmark`; incomplete prerequisites exit non-zero and must never be treated as certification evidence.
