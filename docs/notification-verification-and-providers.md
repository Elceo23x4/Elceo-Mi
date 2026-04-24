# C3-I Notification Verification and Provider Runtime Hardening

## Verification workflow

This batch adds deterministic, durable verification workflows for `email_address` and `push_endpoint` notification targets.

- Issue: a pending verification row is created with a hashed token only.
- Resend: prior pending row for the same target/kind is canceled, then a fresh token is issued.
- Consume: latest pending row is evaluated, attempts are counted, expired rows are marked expired, valid token marks verification consumed and activates the target.
- Expire: stale pending rows (`expires_at < asOf`) are transitioned to `expired`.

`in_app_user` targets are intentionally excluded from token verification.

## Token handling rules

- Raw token is generated at issuance and returned once in the issuance result.
- Raw tokens are never persisted.
- Persistence stores `token_hash` only.
- Token comparison uses deterministic SHA-256 hashing and timing-safe equality.

## Provider configuration loading

`getNotificationDeliveryProviderConfig(env)` resolves provider mode deterministically:

- in-app defaults to `in_app`.
- email resolution order:
  1. explicit `NOTIFICATION_EMAIL_PROVIDER`
  2. SMTP env present => `smtp_email`
  3. HTTP email env present => `http_email`
  4. non-prod-like => `memory`
  5. otherwise => `unsupported`
- push resolution order:
  1. explicit `NOTIFICATION_PUSH_PROVIDER`
  2. web-push env present => `web_push`
  3. otherwise => `unsupported`

## Provider capability semantics

Capabilities are reported per channel with:

- `providerKind`
- `enabled`
- `reason`

Reason values include:

- `configured`
- `missing_required_config`
- `provider_disabled_by_env`
- `unsupported_in_current_runtime`

## Runtime support behavior

- In-app remains durable and first-class.
- HTTP email has a real provider-backed adapter path via `fetch`.
- SMTP and web-push currently use deterministic unsupported/config-gated behavior in this batch runtime.
- No silent fallback from real provider selection to memory provider.

## Dispatch hardening

Outbox dispatch now classifies failures with deterministic codes:

- `payload_deserialization_failed`
- `target_channel_mismatch`
- `target_not_active`
- `provider_not_configured`
- `provider_unsupported`
- `provider_auth_failed`
- `provider_rejected`
- `provider_network_error`
- `provider_timeout`
- `unknown_delivery_error`

Retry/dead policy is unchanged (5 attempts, linear 5-minute backoff multiplier, dead on 5th failure).

## Out of scope

Still out of scope after C3-I:

- frontend verification UX
- notification center/preference UI
- campaign management
- provider onboarding UI flows

## Recommended next scope (C3-J)

- API route layer for issuing/consuming verification
- SMTP adapter implementation with library-backed provider integration
- web-push execution adapter and delivery receipts
- admin-grade verification/provider observability endpoints
