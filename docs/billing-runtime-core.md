# Billing Runtime Core (C4-L1)

C4-L1 introduces provider-agnostic billing runtime primitives for subscriptions, lifecycle events, state mapping, and entitlement synchronization.

- Subscription states: `trialing`, `active`, `past_due`, `canceled`, `expired`, `paused`.
- Lifecycle operations: trial start, activation, renewal, plan change, past due, cancel-at-period-end, expiration, pause/resume, manual override marker.
- Commercial mapping: billing drives plan/account state with deterministic fallback to `free` on expiration and `restricted` on pause.
- Entitlements sync: billing commercial state is synchronized into account entitlements without reimplementing entitlement decision logic.
- Provider agnostic by design: supports `internal_manual` and `stripe_placeholder` contracts only.
- Stops before Stripe payment flow, checkout UI, invoicing, and tax concerns.

## C4-L2 next
- Real payment-provider adapter implementation and webhook signature validation.
- Idempotent provider event ingestion pipeline.
- Retry policies and dead-letter handling for provider delivery failures.
