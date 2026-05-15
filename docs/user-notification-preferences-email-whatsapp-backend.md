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
