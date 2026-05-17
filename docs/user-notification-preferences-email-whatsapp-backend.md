# C6-A11F — User Notification Preferences + Email/WhatsApp Backend Foundation

Date: 2026-05-15

This batch adds backend-only notification preference contracts and helper logic for:
- macro summary
- evidence score change
- market reasoning update
- risk/contradiction alert
- scheduled digest

Channels: email, WhatsApp.

Safety constraints:
- no live email sends
- no live WhatsApp sends
- no provider API keys/secrets
- no raw token/session/auth fields
- no buy/sell/hold or profit-promise language in generated summaries

Runtime scope:
- preference defaults and updates
- deterministic event trigger eligibility
- quiet-hours and rate-limit suppression/defer decisions
- delivery draft/outbox/log shell objects
- provider readiness descriptors only (shell mode)

Next batch (C6-A11G): provider activation checklist and env templates.

## C6-A11G update (2026-05-15)
- Provider activation checklist and env templates added with placeholders only.
- Live provider/payment/notification activation remains blocked by default.
- Smoke definitions are plan-only; no live calls executed in this batch.
- Approval gates + rollback plans are required before staging/production activation.
- C6-A11H remains next for SEO/programmatic contract feeds.
\n## C6-A11I update (2026-05-16)\n- Internal observability/audit/structured logging contracts + validators + redaction helpers + diagnostic error envelopes added.\n- No external vendor integration yet; no live provider calls; no API keys; no secrets in diagnostic payloads.\n- Structured logging export integration remains production-pending; route-by-route adoption may still be pending.\n- C6-A12 remains final backend readiness refresh and pre-activation review.\n

## Post-C6-P3 account/profile + notification ownership update (2026-05-17)
- Scope: backend route ownership and payment-readiness guard updates only; no UI changes.
- Focus Plan checkout readiness now enforces social identifiers (linkedin_address, telegram_id, x_username) before eligibility; missing identifiers return `payment_readiness_blocked` + `missing_social_identifier`; liveActivation remains blocked.
- Notification preference foundation remains shell-only (no live email/WhatsApp sends) and owner boundary is enforced for subscription mutation routes.
- Account/profile routes remain authenticated-basic where present; profile/social identifier CRUD route is not_present and needs_follow_up for explicit backend contract.
- No live KoraPay/Stripe checkout created; no live provider activation.
