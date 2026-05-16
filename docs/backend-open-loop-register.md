# Backend Open-Loop Register (C6-A12)

_Date: 2026-05-16_

## Before UI
- [ ] Route-level entitlement mapping for product APIs.
- [ ] Frontend contract connection strategy across routes/components.
- [ ] User profile notification/preference route integration (if product-surface requires).
- [ ] Social identifier profile route integration in purchase flows.
- [ ] Subscription wall response contracts wired to UI.
- [ ] Protected/admin payload separation review.

## Before hosting/staging
- [ ] Environment values populated for target environments.
- [ ] Database migration rehearsal completed.
- [ ] Staging deployment completed.
- [ ] Object storage / Redis / queue confirmation.
- [ ] Smoke base URL configured.
- [ ] Internal tokens configured for smoke/replay/admin checks.
- [ ] Build/runtime warnings reviewed and dispositioned.

## Before live provider activation
- [ ] Provider keys loaded.
- [ ] Provider smoke tests executed per source.
- [ ] Provider rate limits and quota controls verified.
- [ ] Response schema verification against live payloads.
- [ ] Retries/timeouts/circuit breakers verified.
- [ ] Rollback approval recorded.
- [ ] Legal/terms checks completed.

## Before payment activation
- [ ] KoraPay official docs verification refresh.
- [ ] KoraPay webhook signature raw-body verification end-to-end.
- [ ] Sandbox checkout flow validated.
- [ ] Idempotency persistence finalized and tested.
- [ ] Entitlement mutation after verified webhook finalized.
- [ ] Stripe/fallback decision and implementation plan (if retained).

## Before notification activation
- [ ] Email provider decision.
- [ ] WhatsApp provider decision.
- [ ] Opt-in model finalized.
- [ ] Unsubscribe/disable model finalized.
- [ ] Delivery status webhooks integrated.
- [ ] Live send smoke tests completed.

## Before Super Admin live operations
- [ ] Mutation routes finalized (gifts/retractions/restrictions/etc.).
- [ ] DB persistence for gifts/retractions/restrictions finalized.
- [ ] Real 2FA step-up implemented for sensitive mutations.
- [ ] Audit persistence review completed.
- [ ] Unban/reactivation path finalized (if retained).

## Before production launch
- [ ] Staging smoke complete.
- [ ] Attack drill complete.
- [ ] Penetration/security review complete.
- [ ] WAF/rate-limit layer verified.
- [ ] Monitoring/export vendor decision completed.
- [ ] Backup/restore validation completed.
- [ ] Rollback drill completed.
- [ ] Final legal/compliance review completed.
- [ ] Final public claim review completed.

## Known warnings / non-blockers
- [ ] Duplicate migration numeric prefixes tracked.
- [ ] Next.js / jose Edge runtime warning tracked.
- [ ] npm http-proxy environment warning tracked.
- [ ] Missing production env values tracked until deployment stage.
