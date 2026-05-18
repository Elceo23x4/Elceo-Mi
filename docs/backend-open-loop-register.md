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

## Post-C6-P1 update (2026-05-16)
- Route-level entitlement enforcement is being completed before any UI work.
- Kick off is limited to: dashboard.chart, dashboard.evidence_score, dashboard.macro_headlines, journal.page.
- Focus Plan is required for premium surfaces; expired trial returns subscription_required wall.
- Restricted users are denied before trial/gift/paid entitlement evaluation.
- Admin/internal routes remain separate and require internal token + admin/super-admin gates.
- Live providers/payments/notifications remain blocked in this phase.
- Route inventory and unresolved families are tracked in docs/route-entitlement-enforcement-map.md.


## Post-C6-P1B runtime enforcement update (2026-05-16)
- Implemented runtime foundation artifacts: typed route entitlement map and shared route entitlement helper.
- Implemented route-level runtime denial contract on checkout for payment-readiness and blocked live activation.
- Representative runtime map coverage is implemented; broad family completion remains tracked as needs_follow_up/policy-only where not yet wired.
- Route-runtime and lower-level tests were added for the new map/helper foundation.

## Post-C6-P1D update
- Added representative commercial runtime guards for /api/analytics/latest, /api/coaching/latest, /api/portfolio/watchlist (GET/POST), and /api/notifications/summary via guardRouteCommercialEntitlement.
- Status: commercial_runtime_guarded (representative only).
- requireFeatureAccess remains separate feature-permission layer from commercial entitlement.
- Remaining families: needs_follow_up for full runtime commercial snapshot binding beyond test header fixtures.


## Post-C6-P1E (2026-05-17)
- Final route-family audit completed for product-facing families.
- Commercial runtime guarded (confirmed): analytics, coaching, portfolio watchlist (GET/POST), notifications summary.
- Feature-permission guarded only: workspace family.
- Helper/lower-level tested: dashboard, journal, billing checkout payment-readiness and live-block, frontend contracts/mock payload families.
- Route runtime tested: admin/internal/scheduled-ingestion/operator-inspection/observability audit representative handlers.
- Policy only: account/profile, auth, provider activation, super-admin metrics.
- Needs follow-up: market-evidence product-facing route family classification remains policy-ambiguous without new public handlers.
- Not present: public SEO/programmatic route family and dedicated KoraPay public checkout route family.
- `requireFeatureAccess` remains separate from commercial entitlement runtime guards.
- Live provider/payment/notification activation remains blocked in this phase.
- No UI changes were made in Post-C6-P1E.
- Enforcement status: representative runtime enforcement complete with documented follow-up families (not full exhaustive route-runtime simulation).

## Post-C6-P2 (2026-05-17) core intelligence commercial guard closure
- Scope: market-evidence/admin-intelligence route re-audit, dashboard/journal/frontend-contract route classification only; no UI changes, no provider/payment/notification live activation.
- User-facing market-evidence premium intelligence routes are currently not present; existing market-evidence handlers are admin/internal and remain gated by internal/admin guard layers.
- Dashboard kick-off allowlist remains limited to dashboard.chart, dashboard.evidence_score, dashboard.macro_headlines; premium cognition remains Focus Plan required.
- Journal basic page remains kick-off allowed; deep-analysis/cognition-linked journal routes are not present and remain documented as not_present.
- Public SEO product-intelligence routes remain not_present; admin SEO feed/sitemap routes remain internal/admin-only.
- Feature-permission gates and commercial entitlement gates remain separate and both required where applicable.


## Post-C6-P3 account/profile + notification ownership update (2026-05-17)
- Scope: backend route ownership and payment-readiness guard updates only; no UI changes.
- Focus Plan checkout readiness now enforces social identifiers (linkedin_address, telegram_id, x_username) before eligibility; missing identifiers return `payment_readiness_blocked` + `missing_social_identifier`; liveActivation remains blocked.
- Notification preference foundation remains shell-only (no live email/WhatsApp sends) and owner boundary is enforced for subscription mutation routes.
- Account/profile routes remain authenticated-basic where present; profile/social identifier CRUD route now exists at /api/account/profile/social-identifiers (GET/PATCH), authenticated + owner-scoped; persistence is durable when APP_STATE_REPOSITORY=sql with DATABASE_URL; otherwise explicit memory_fallback persists only for test/local runtime.
- No live KoraPay/Stripe checkout created; no live provider activation.


## Post-C6-P4 update (2026-05-17)
- Added internal-only admin commercial control route foundations for gift/retract/restrict and control snapshot under `/api/admin/commercial/users/[userId]/*`.
- Mutation routes require internal token, `admin.ops`, security decision/idempotency/audit flow, and verified step-up contract checks.
- Step-up state remains **fixture/readiness** (`fixture_verified_for_tests` / `step_up_readiness_only`); production 2FA provider wiring is pending.
- IP ban is explicitly rejected; user restriction supports only `suspended` or `banned`.
- No UI changes, no payment provider activation/calls, no checkout/session activation, no notification sends.
- Persistence caveat: super-admin commercial control records are currently in-memory foundation state, not durable production storage.

## Post-C6-P5 Update (2026-05-18)
- Super Admin gift/restrict persistence now supports SQL durability when `APP_STATE_REPOSITORY=sql` and `DATABASE_URL` are configured; otherwise explicit `memory_fallback`.
- Step-up/2FA classification: `provider_pending` (readiness only, fixture verification in tests).
- Routes remain backend-only; no Admin UI wiring done.
- No payment provider, notification, or live 2FA activation in this batch.
- IP ban remains intentionally unsupported.
