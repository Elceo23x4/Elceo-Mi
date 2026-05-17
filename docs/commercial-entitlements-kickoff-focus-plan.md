# C6-A11B Commercial Entitlements (Kick off + Focus Plan)

## Scope
- Implements backend commercial entitlement foundation only.
- No KoraPay integration, no live provider checkout/session/webhooks, no API keys.

## Plan catalog
- `kick_off`: fixed 3-day trial.
- `focus_plan`: paid premium plan.
- Focus Plan monthly price: **70 USD**.
- Quarterly/yearly intervals are present with `pending_price_config` placeholders.

## Kick off enforcement
- Trial access is active only when `now < trialStartedAt + 3 days`.
- Trial allowlist features:
  - `dashboard.chart`
  - `dashboard.evidence_score`
  - `dashboard.macro_headlines`
  - `journal.page`
- Any other feature is denied with `feature_not_in_trial_allowlist`.
- Expired trial returns `subscription_required` and a subscription wall targeting `focus_plan`.

## Focus Plan enforcement
- Active Focus Plan subscription grants premium access.
- Inactive/expired Focus Plan subscription returns subscription wall behavior.
- No payment provider is called.

## Payment readiness prerequisite
- Before payment readiness can be eligible, user must have at least one social identifier:
  - LinkedIn address
  - Telegram ID
  - X/Twitter username
- Missing identifiers returns `blocked/missing_social_identifier`.

## Bypass prevention foundation
- A reusable server-side helper (`guardCommercialFeatureAccess`) is provided.
- Future product API routes must call this guard.
- UI hiding alone is insufficient and not trusted.

## Deferred to later batches
- C6-A11C: Super Admin gift/retract/user-ban/2FA controls.
- C6-A11D: KoraPay readiness and integration.

- C6-A11C implemented Super Admin Focus Plan gift/retract + user ban/suspension with mandatory step-up verification fixture contract, full audit payloads, and explicit IP-ban withdrawal; no KoraPay/live payment wiring in this batch.
\n## C6-A11D KoraPay readiness shell update\n- Added provider-ready KoraPay adapter/webhook security shell only (no live keys/calls/session creation).\n- Official KoraPay webhook signature verification details remain live_activation_required pending docs confirmation.\n- Social identifier remains required for checkout readiness; verified webhook + idempotency required before entitlement grant.\n- Next batch C6-A11E targets Super Admin metrics backend.
\n## C6-A11E update (2026-05-15)\n- Super Admin metrics backend contracts/helpers added for later dashboard UI consumption only.\n- Revenue metrics remain fixture/estimated unless live records are enabled.\n- KoraPay is still shell-only with no live provider calls in this batch.\n- No secrets/raw provider payload exposure; no IP ban metrics.\n- C6-A11F remains notification preferences + email/WhatsApp backend.

## Post-C6-P3 account/profile + notification ownership update (2026-05-17)
- Scope: backend route ownership and payment-readiness guard updates only; no UI changes.
- Focus Plan checkout readiness now enforces social identifiers (linkedin_address, telegram_id, x_username) before eligibility; missing identifiers return `payment_readiness_blocked` + `missing_social_identifier`; liveActivation remains blocked.
- Notification preference foundation remains shell-only (no live email/WhatsApp sends) and owner boundary is enforced for subscription mutation routes.
- Account/profile routes remain authenticated-basic where present; profile/social identifier CRUD route is not_present and needs_follow_up for explicit backend contract.
- No live KoraPay/Stripe checkout created; no live provider activation.
