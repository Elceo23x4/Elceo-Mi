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
