# Billing Lifecycle and Reconciliation (C4-M2B)

C4-M2B finalizes backend-consumable billing lifecycle read/reconcile surfaces without introducing checkout or payment collection UI.

## Canonical customer model
- Subject-bound canonical customer is keyed to `subjectKind=user` + `subjectId`.
- Provider identity is normalized with `providerKind` + `providerCustomerId`.
- Customer state tracks `active | missing | restricted`.

## Canonical subscription model
- Canonical subscription is subject-scoped and provider-linked.
- Provider references (`providerSubscriptionId`, `providerPriceId`, `providerProductId`, `providerPlanCode`) are retained for reconciliation traceability.
- Canonical plan is normalized to ELCEO plan kinds (`free`, `premium`, `admin_internal`) with plan source precedence metadata.
- Lifecycle state tracks trial/active/degraded/canceled and period timestamps.

## Provider mapping precedence
Plan kind derivation precedence is deterministic:
1. explicit provider-plan mapping
2. manual override
3. internal default fallback

## Reconciliation rules
- Reconciliation is driven by `(providerKind, sourceEventId, subjectId?)`.
- Source event reconciliation updates canonical customer/subscription state and records reconciliation run outputs.
- Reconciliation run result includes status + change flags (customer/subscription/entitlement) and plan transition summary.

## Entitlement sync rules
- Billing lifecycle reconciliation is authoritative for billing-plan transition intent.
- Entitlement state is synchronized during reconciliation and reflected in lifecycle snapshots.
- Account API read routes return lifecycle + entitlement state as a single snapshot envelope.

## API routes in scope
Authenticated account routes:
- `GET /api/account/billing`
- `GET /api/account/billing/reconciliation-runs`

Internal/admin route:
- `POST /api/internal/billing/reconcile`
  - internal token required
  - admin.ops feature access required

## Why C4-M2B stops here
C4-M2B intentionally stops before checkout/payment collection UI, invoice/tax/accounting workflows, and provider-side payment orchestration. This keeps scope limited to canonical lifecycle read/reconcile APIs.

## Next batch expectation
Next billing batch should cover payment lifecycle execution surfaces (checkout/session orchestration, portal/session flow, webhook hardening, and idempotent mutation policy), while reusing this canonical reconciliation foundation.


## C4-M3A billing policy linkage
C4-M3A adds canonical billing policy contracts, durable transition persistence, conservative restriction/recovery evaluation, and runtime query/replay surfaces on top of billing lifecycle reconciliation.


## C4-M4A admin operations linkage
Operational summaries and failure/candidate read models are now available from a canonical billing-admin boundary for future admin routes.


## C4-M4A completion note
Billing lifecycle reconciliation persistence now feeds concrete billing-admin operational summaries, failure classification, and retry candidate read models through the canonical billing-admin runtime boundary.

## RC-I2 payment provider sandbox validation
- RC-I1 local correctness is sealed: one genuine customer payment intention may create at most one provider charge and exactly one local billing, ledger, and entitlement effect.
- RC-I2 foundation validates Stripe-compatible provider normalization/replay behavior, and RC-I2 remains incomplete until real Stripe sandbox smoke has run with credentials; production-live payment activation remains blocked.
- Real sandbox end-to-end completion requires `ELCEO_PAYMENT_SANDBOX_SMOKE=1`, `PAYMENT_PROVIDER_KIND=stripe`, Stripe test public/secret credentials, a Stripe test webhook secret, `APP_STATE_REPOSITORY=sql`, and `DATABASE_URL`; replay smoke is not equivalent to sandbox provider validation.
- Provider modes are explicit: disabled, local_fake_provider, replay_provider_event, sandbox_provider, and production_provider_blocked.
- Webhook sandbox processing verifies the raw Stripe signature before trusting the body; local fixed replay literals are not accepted in sandbox_provider mode.
- Sandbox smoke must confirm provider-paid Stripe sandbox state before any success webhook may create ledger or entitlement effects; locally constructed success payloads without provider-paid truth are replay/simulated only and cannot complete RC-I2.
- Reconciliation inspects unknown/reconciliation_required operations with the existing provider idempotency key/reference and never creates a new provider charge.
- Notification delivery remains mandatory RC-I3; RC-J, the Intelligence Feature Program, and RC-K remain mandatory pre-launch dependency work and not in this RC-I2 scope.
- No launch workflow item is labeled outside the approved language; remaining launch work is a mandatory subsequent launch batch or mandatory pre-launch dependency.
