# RC-I1 Payment Correctness Runbook

RC-I1 implements local payment correctness only. Production-live payment activation remains blocked and no real provider credentials are used by default.

## Invariant
One genuine customer payment intention may create at most one provider charge and exactly one local billing, ledger, and entitlement effect.

## Safe local states
Payment operations are explicit and monotonic: created, pending_provider, processing, succeeded, failed, expired, cancelled, unknown, reconciliation_required, refunded, partially_refunded, reversed, and chargeback. Unknown and reconciliation_required are safe states: operators reconcile with the original provider idempotency key and must not create a replacement charge.

## Local provider boundary
Allowed RC-I1 modes are disabled, local_fake_provider, sandbox_stub_for_tests, and replay_provider_event. Production/live modes remain blocked. The fake/replay boundary models accepted references, response loss, timeout, provider 500 before/after acceptance, redirect disconnects, unknown results, duplicate references/events, refund, partial refund, reversal, and chargeback.

## Idempotency and effects
Business idempotency keys, provider idempotency keys, provider payment/session references, provider event IDs, ledger operation/effect keys, and entitlement transition effect keys are unique in the local runtime. Duplicate checkout returns the same operation. Duplicate webhook is inbox-deduped. Success writes one immutable ledger effect and one entitlement grant. Refund, reversal, and chargeback append separate reversal effects.

## RC-I2 / RC-I3 dependencies
Real provider sandbox behavior remains RC-I2. Notification delivery remains RC-I3. Referral/affiliate implementation remains later.
