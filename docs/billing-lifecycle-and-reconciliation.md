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
