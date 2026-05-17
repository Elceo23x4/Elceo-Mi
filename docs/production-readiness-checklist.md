# Production Readiness Checklist (C6-A12 Refresh)

_Date: 2026-05-16_

## A) Completed in backend foundation
- [x] Provider/source registry foundation (C6-A1).
- [x] Launch-asset fixture expansion (C6-A2).
- [x] Official macro source shells and expansions (C6-A3/C6-A3B).
- [x] News/extraction/filings source shells (C6-A4).
- [x] Crypto/risk/liquidity source shells (C6-A5).
- [x] Golden scenario reasoning tests (C6-A6).
- [x] Cognition calibration hardening (C6-A7).
- [x] Scheduled ingestion audit/replay/inspection readiness (C6-A8).
- [x] Admin/internal operator inspection surfaces (C6-A9).
- [x] Frontend contract + mock payload foundation (C6-A10).
- [x] Billing/entitlement/Super Admin foundations (C6-A11A/B/C).
- [x] KoraPay adapter + webhook security shell (C6-A11D).
- [x] Super Admin metrics backend foundation (C6-A11E).
- [x] Notification preference backend foundation (C6-A11F).
- [x] Provider activation checklist + env templates (C6-A11G).
- [x] SEO programmatic feed contracts (C6-A11H).
- [x] Observability/audit/structured logging readiness (C6-A11I).

## B) Fixture/dry-run complete but live-blocked
- [ ] Live provider calls (blocked by design pending keys/approval).
- [ ] Live payment session + settlement activation.
- [ ] Live email/WhatsApp sending.
- [ ] External observability vendor export.

## C) Pending before UI
- [ ] Route-level entitlement enforcement map across APIs.
- [ ] UI contract wiring plan for subscription walls/denials.
- [ ] Protected vs admin/internal payload separation confirmation per UI-consumed route.

## D) Pending before hosting/staging
- [ ] Staging/production env values populated.
- [ ] DB migration rehearsal in target environment.
- [ ] Staging deployment complete.
- [ ] Storage/Redis/queue dependencies verified.
- [ ] Smoke base URLs/internal tokens configured.

## E) Pending before live provider activation
- [ ] Provider keys provisioned + approved.
- [ ] Per-provider live smoke tests executed.
- [ ] Live schema/rate-limit/retry/timeout/circuit-breaker checks passed.
- [ ] Provider rollback plan approved.
- [ ] Legal/terms checks complete.

## F) Pending before production launch
- [ ] Staging smoke suite passed.
- [ ] Attack drill passed.
- [ ] Security/penetration review passed.
- [ ] WAF/rate-limit edge controls verified.
- [ ] Backup/restore and rollback drills passed.
- [ ] Final legal/compliance and public-claims review complete.

## G) Known warnings / non-blockers
- Duplicate migration numeric prefixes.
- Next.js / jose Edge runtime warning.
- npm http-proxy env warning.
- Missing production env values prior to deployment stage.

## H) Final release gate commands
- `npm run check:migrations`
- `npm run check:c5-readiness`
- `npm run check:infra-security`
- `npm run security:gate`
- `npm run release:gate`

## I) Smoke/attack drill commands
- `npm run smoke:production` (run only with `ELCEO_SMOKE_BASE_URL` configured)
- `npm run attack-drill:staging` (run only with `ELCEO_STAGING_BASE_URL` configured)

## J) Migration notes
- Unchecked items are not automatically failures; many represent deferred deployment/live-activation gates.
- Apply DB migrations in strict lexicographic order.
- Keep fixture-only and live-activation states explicitly separated in all release communications.


## Security policy carry-forward
- [ ] HSTS configuration verified at edge/load balancer before production launch.
- [ ] CORS policy reviewed and restricted to approved origins before production launch.
- [ ] Secret rotation runbook verified (provider keys, JWT/signing secrets, internal tokens).

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

