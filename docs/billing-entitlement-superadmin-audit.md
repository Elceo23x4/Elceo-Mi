# C6-A11A — Billing / Subscription / Entitlement Rules Audit

## 1) Executive summary
This batch audited existing backend foundations for billing, subscriptions, entitlements, access control, profile constraints, Super Admin controls, payments, and notifications. The codebase already contains significant provider-agnostic billing and entitlement primitives, internal/admin protected mutation routes, idempotency/audit security runtime, and notification infrastructure. However, required commercial rules for **Kick off** (3-day trial), **Focus Plan** pricing/billing options, social-identifier pre-payment gating, Super Admin gift/retract/ban workflows with mandatory 2FA step-up, and KoraPay-specific integration are **not implemented as required yet**.

This is documentation-only; no billing/payment/entitlement logic was changed in C6-A11A.

## 2) Existing billing/subscription inventory
- `services/billing` contains billing provider adapters and webhook-to-subscription mapping, including Stripe + mock adapter paths.
- Canonical billing runtime/persistence exists in `services/application-state` (`billing`, `billing-lifecycle`, `billing-policy`, `billing-orchestration`, `payment-providers`).
- Billing types/schemas exist in `packages/types/src/billing*.ts` and `packages/schemas/src/billing*.schema.ts`.
- DB contains billing lifecycle, external customer/subscription/event, provider-plan mapping, reconciliation, orchestration, policy transition tables (`infra/db/schema/0005`, `0027`, `0028`, `0029`).
- Admin/internal billing surfaces exist under `/api/admin/billing/*` and `/api/internal/billing/*`.

## 3) Existing payment/KoraPay status
- **KoraPay status:** no KoraPay/Korapay integration found.
- Existing payment provider integration is Stripe-oriented + provider-agnostic abstractions:
  - Stripe-like normalizer, translator, ingest/query services.
  - Webhook signature verification exists for Stripe-style signatures in `services/billing/src/provider.ts`.
  - External events dedupe table and runtime dedupe path exist (`app_billing_external_events` primary key by provider+event ID and event deduper service).
- Payment abstractions exist; no KoraPay adapter exists yet.
- Checkout/portal routes exist (`apps/web/app/api/billing/checkout`, `portal`) and are Stripe/mock oriented.

## 4) Existing entitlement/access-control inventory
- Canonical entitlements boundary exists with account state + plan state + feature-level decisions.
- Route access gates use `requireFeatureAccess` and internal token checks (`requireInternalRouteAccess`) across admin/internal routes.
- Plan/account primitives support `free`, `premium`, `admin_internal` and account states `active/suspended/restricted/canceled`.
- Access decisions are persisted and usage counters supported for limited features.
- Admin feature gates `admin.read` and `admin.ops` are broadly wired.
- No explicit Kick off section-level API allowlist model exists yet.
- No explicit post-trial subscription-wall-only backend policy is wired as a dedicated commercial mode.

## 5) Existing user profile/social identifier support
- User profile table currently stores core identity/auth and basic app state fields.
- No dedicated persisted/profile-validated fields found for required pre-payment social identifiers:
  - LinkedIn address
  - Telegram ID
  - X/Twitter username
- No explicit pre-payment validation gate enforcing one-of-these identifiers before checkout was found.

## 6) Existing Super Admin control inventory
- Admin/internal gating exists (`admin.read`, `admin.ops`) and mutation security/audit/idempotency runtime exists.
- No explicit Super Admin role model with unique privilege tier beyond existing admin feature gates was found.
- No dedicated backend flows found for:
  - gift Focus Plan by user ID
  - gift duration restriction (2 weeks / 1 month only)
  - gift retraction/reversal lifecycle
  - mandatory 2FA step-up for gift/retract/ban actions
  - ban/suspend workflows tied to explicit Super Admin command surfaces
- Security audit event infrastructure exists and can support these events when implemented.

## 7) Existing notification infrastructure inventory
- Strong notification backend foundation exists (`services/notifications`): target management, subscription rules, outbox/delivery, provider config/capabilities, verification, feedback processing, diagnostics.
- Channels currently modeled include in-app/email/push (plus schema-level sms/webhook enums in some contracts).
- Email transport adapters exist (memory/http/smtp capability model).
- WhatsApp-specific provider integration is not implemented.
- Preference and delivery logging infrastructure exists; asset-specific commercial notification policy for required categories is not fully mapped to the new commercial rules yet.

## 8) Existing database/migration inventory
### Present
- users/profiles/auth/session: present.
- billing customers/subscriptions/lifecycle/reconciliation/orchestration/policy transitions/provider mappings: present.
- external payment records + provider events + plan mappings: present.
- entitlement state/usage/access decisions: present.
- security idempotency/rate-limit/audit tables: present.
- notification targets/subscriptions/outbox/attempts/receipts/feedback/verifications: present.

### Missing or not explicit for required rules
- dedicated Kick off trial policy table/constraints (3-day fixed commercial rule).
- explicit gifted-plan assignment/retraction ledger.
- explicit Super Admin dangerous-action step-up challenge records.
- dedicated ban/suspension command/audit reason taxonomy (business-layer, beyond generic security audit metadata).
- dedicated metrics aggregation materializations for requested Super Admin KPI list.

## 9) Gap analysis vs required product rules
1. **Kick off (3-day fixed trial):** not enforced as fixed commercial policy.
2. **Kick off section/API allowlist:** no strict backend allowlist mapped exactly to Chart + Evidence Score + Macro Headlines + Journal only.
3. **Expired trial wall:** no explicit global backend mode forcing subscription page only after trial expiry.
4. **Focus Plan pricing options:** `monthly/quarterly/yearly` commercial packaging not finalized end-to-end.
5. **Social identifier prerequisite before payment:** missing gate and fields.
6. **Super Admin gifts/retractions:** missing dedicated workflow + domain model.
7. **Mandatory 2FA step-up for dangerous admin actions:** missing dedicated enforcement layer.
8. **Ban/suspend business workflows:** partially possible via account states, but no explicit operational control flow matching requested ruleset.
9. **KoraPay:** not integrated.
10. **WhatsApp notifications:** not integrated.
11. **Metrics set requested:** no complete dedicated aggregation/report surface yet.

## 10) Security risk analysis
- **Payment bypass risk:** if checkout eligibility is not server-enforced against entitlement + profile prerequisites.
- **Webhook spoofing risk:** current Stripe signature checks exist; future KoraPay path must implement strict signature verification + replay controls.
- **Entitlement bypass risk:** frontend-only hiding would be insufficient; all protected APIs must continue backend gate enforcement.
- **Trial bypass risk:** without strict trial-expiry state transitions + route/API policy, users may retain broader access.
- **Super Admin abuse risk:** dangerous operations need role hardening, reason capture, immutable audit, and 2FA step-up.
- **Missing 2FA step-up risk:** high-risk admin actions currently lack explicit step-up challenge binding.
- **Gift abuse risk:** without duration constraints/idempotent mutation/audit/retraction controls.
- **Notification abuse/spam risk:** requires per-user preferences, throttles/cooldowns, verified targets, and abuse monitoring across channels.

## 11) Recommended implementation sequence
- **C6-A11B**: Kick off + Focus Plan entitlement foundation (fixed 3-day trial, post-expiry lock, section/API allowlist, pricing config shape).
- **C6-A11C**: Super Admin controls (role/scope hardening, ban/suspend, gift/retract flows, mandatory 2FA step-up, audit taxonomy).
- **C6-A11D**: KoraPay readiness + webhook security (provider adapter, signature verification, replay/idempotency hardening, event translation).
- **C6-A11E**: Super Admin metrics backend (requested KPI model, query/report surfaces).
- **C6-A11F**: Notification preferences + email/WhatsApp backend (preference model refinement, channel adapters, policy enforcement).

## 12) Explicit note
- **IP ban withdrawn.**
- Required enforcement target is **user ban/suspension only**.

## 13) Definition of done for commercial access foundation
Complete when all of the following are true:
1. Kick off is fixed to 3 days with backend-enforced allowed areas/APIs only.
2. Trial expiry triggers backend subscription-required enforcement across protected APIs/routes.
3. Focus Plan commercial options and entitlement mapping are server authoritative.
4. Social identifier prerequisite is validated server-side before payment session creation.
5. Super Admin dangerous actions require mandatory 2FA step-up and produce immutable audit events.
6. Gift/retract lifecycle works with strict duration constraints and deterministic reversal semantics.
7. KoraPay integration (when added later) has verified webhook authenticity, replay/idempotency protection, and secure entitlement synchronization.
8. Notification preferences + delivery governance support requested channels and abuse controls.


## C6-A11B update (2026-05-15)
- Kick off fixed 3-day trial and Focus Plan entitlement foundation implemented server-side.
- Focus Plan monthly price is 70 USD; quarterly/yearly remain configurable (`pending_price_config`).
- Social identifier (LinkedIn/Telegram/X) is now required for payment readiness eligibility.
- No KoraPay integration and no live payment provider calls in C6-A11B.
- Server-side entitlement guard added to prevent subscription-wall bypass from direct API access.
- Super Admin gift/retract/user-ban/2FA deferred to C6-A11C.
- KoraPay readiness deferred to C6-A11D.

- C6-A11C implemented Super Admin Focus Plan gift/retract + user ban/suspension with mandatory step-up verification fixture contract, full audit payloads, and explicit IP-ban withdrawal; no KoraPay/live payment wiring in this batch.
\n## C6-A11D KoraPay readiness shell update\n- Added provider-ready KoraPay adapter/webhook security shell only (no live keys/calls/session creation).\n- Official KoraPay webhook signature verification details remain live_activation_required pending docs confirmation.\n- Social identifier remains required for checkout readiness; verified webhook + idempotency required before entitlement grant.\n- Next batch C6-A11E targets Super Admin metrics backend.
