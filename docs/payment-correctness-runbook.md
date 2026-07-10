# RC-I1 Payment Correctness Runbook

RC-I1 implements local payment correctness only. Production-live payment activation remains blocked and no real provider credentials are used by default.

## Durable local correctness
When `APP_STATE_REPOSITORY=sql` and `DATABASE_URL` are configured, RC-I1 uses SQL-backed local correctness tables for payment operations, provider event inbox rows, immutable ledger effects, entitlement effects, and reconciliation audit records. Durable uniqueness is enforced by primary keys, unique constraints, and partial unique indexes for nullable provider references.

The memory repository is an explicit local/test fallback only. It is useful for deterministic unit tests and local development, but it is not production durability and must not be described as production local correctness.

## Invariant
One genuine customer payment intention may create at most one provider charge and exactly one local billing, ledger, and entitlement effect.

## Safe local states
Payment operations are explicit and monotonic: created, pending_provider, processing, succeeded, failed, expired, cancelled, unknown, reconciliation_required, refunded, partially_refunded, reversed, and chargeback. Unknown and reconciliation_required are safe states: operators reconcile with the original provider idempotency key and must not create a replacement charge.

## Local provider boundary
Allowed RC-I1 modes are disabled, local_fake_provider, sandbox_stub_for_tests, and replay_provider_event. Production/live modes remain blocked. The fake/replay boundary models accepted references, response loss, timeout, provider 500 before/after acceptance, redirect disconnects, unknown results, duplicate references/events, refund, partial refund, reversal, and chargeback.

Client-directed fake checkout outcomes are disabled unless `ELCEO_PAYMENT_FAKE_OUTCOMES_ENABLED=1` is set for tests. Local webhook replay is disabled unless `ELCEO_PAYMENT_LOCAL_WEBHOOK_REPLAY=1` and `ELCEO_PAYMENT_LOCAL_WEBHOOK_SECRET` are configured. The local replay signature is not live provider verification.

## Idempotency and effects
Business idempotency keys, provider idempotency keys, provider payment/session references, provider event IDs, ledger operation/effect keys, and entitlement transition effect keys are unique in the durable SQL repository and in the local/test memory fallback. Duplicate checkout returns the same operation. Duplicate webhook is inbox-deduped. Success writes one immutable ledger effect and one entitlement grant. Refund, reversal, and chargeback append separate reversal effects.

## RC-I2 / RC-I3 dependencies
Real provider sandbox validation remains RC-I2. Notification delivery remains RC-I3. Referral/affiliate implementation remains a mandatory subsequent launch batch.

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
