# ELCEO Launch-Readiness Closure Checklist

## Blockers (must be green before public launch)
- [x] Billing provider integration supports real Stripe checkout + portal flows when `BILLING_PROVIDER=stripe`.
- [x] Webhook signatures are verified with Stripe-compatible `t=...,v1=...` HMAC validation using `STRIPE_WEBHOOK_SECRET`.
- [x] External error transport can emit to Sentry Store API when `SENTRY_DSN` is set.
- [x] Workspace `quality-gate` (`typecheck` + `test`) is green in CI/local harness.
- [x] Billing API responses are no-store and unauthorized cases return 401.

## Non-blockers (post-launch hardening)
- [ ] Add webhook replay protection with persisted event-id dedupe window.
- [ ] Add Stripe customer lookup caching to reduce portal open latency.
- [ ] Expand Sentry payload with release/dist metadata and source-map integration.
- [ ] Add provider-specific billing integration tests against Stripe test mode.
