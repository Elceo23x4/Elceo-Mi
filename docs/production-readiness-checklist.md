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


## Post-C6-P6 (2026-05-18)
- Added production step-up/2FA contract foundation: challenge creation, verification, freshness window, replay protection, rate-limit/lockout policy, and safe audit metadata.
- Provider readiness remains blocked: totp/webauthn/authenticator_app are provider_pending; fixture_test_only is test-mode only.
- Super Admin commercial mutation routes still require verified step-up and do not expose OTP/proof/token secrets.
- Persistence status for step-up challenge runtime is memory_fallback; durable provider activation remains deferred.
- No UI work, no payment/provider/notification live activation in this batch.

## C6-R0 — Market Realism Truth-Source Audit (2026-06-03)

- Market-realism audit status: completed for C6-R0 as a documentation/truth-source foundation.
- No UI was built or modified in this batch.
- No live provider activation was performed; fixture, dry-run, and not-started provider states remain explicitly tracked.
- No live payments, live notifications, commercial entitlement behavior, Super Admin behavior, or 2FA/step-up behavior were changed.
- Reasoning gaps are now formally tracked in `docs/market-realism-truth-source-map.md` and `docs/market-realism-code-gap-audit.md`.
- R1-R9 remain required before ELCEO can claim final market-intelligence realism: asset-contextual direction, FX relative pressure, macro surprise normalization, expanded contradictions, confidence calibration, price reaction/impulse confirmation, provider reliability weighting, golden scenario expansion, and integrated acceptance gates.

## C6-R1 readiness note (2026-06-03)

- Typed asset causality map foundation added and tested for all launch assets.
- Downstream realism engines remain unchecked/pending: direction resolver, FX relative strength, macro surprise normalization, contradiction expansion, confidence calibration upgrade, price reaction/event impulse, provider reliability weighting, and golden scenario expansion.
- No UI or live activation changes were made for providers, payments, notifications, commercial controls, Super Admin controls, or 2FA.

## C6-R2 — Asset-contextual direction resolver foundation (2026-06-03)

- Added a deterministic asset-contextual direction resolver foundation for reasoning internals.
- Generic metadata direction mapping is no longer the primary weighted-evidence contribution path; the same event can resolve differently by asset through causality map context, asset family, FX orientation, driver kind, policy/risk tone, and caveat flags.
- Open loops remain: R3 FX relative strength, R4 macro surprise normalization, R5 expanded contradiction matrix, R6 confidence calibration, R7 price reaction/impulse, provider reliability, and golden scenario expansion.
- No UI, live provider, payment, notification, commercial entitlement, Super Admin, affiliate, or 2FA behavior changed.

## C6-R2B — Direction resolver issuer-ambiguity cleanup (2026-06-03)

- [x] Missing hawkish/dovish policy issuer metadata no longer defaults to Fed/U.S. pressure.
- [x] Explicit Fed metadata still resolves asset-contextually; weighted-evidence tests cover DXY positive and EUR/USD negative contributions for the same hawkish Fed evidence.
- [ ] Non-Fed issuer handling remains limited until later issuer-side expansion / R3 FX relative-strength work; R3/R4/R5/R6/R7 remain pending.
- No UI, live provider, payment, notification, commercial, Super Admin, route entitlement, or 2FA behavior changed.

## C6-R3 — FX relative currency strength engine foundation (2026-06-03)

- [x] FX base-vs-quote relative pressure foundation added for EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, NZD/USD, and USD/CAD.
- [x] Missing base or quote evidence lowers confidence and remains visible.
- [x] Non-Fed issuer side handling improved for launch FX currencies/central banks when metadata identifies issuer or affected currency.
- [x] C6-R3B weighted snapshot safety cleanup: unsupported/non-FX weighted snapshots no longer default to EUR/USD, DXY remains limited diagnostic, and weighted-snapshot FX relative-strength reconstruction is explicitly diagnostic/limited because original issuer/currency metadata may be reduced. Evidence-item inputs remain preferred for full FX side attribution.
- [ ] Macro surprise normalization remains R4.
- [ ] Expanded contradiction matrix remains R5.
- [ ] Confidence calibration remains R6.
- [ ] Price reaction/impulse remains R7.
- [ ] Provider reliability/golden scenarios remain pending.
- No UI, live provider, payment, notification, commercial, Super Admin, affiliate, route entitlement, or 2FA behavior changed.

## K) C6-R4 macro surprise readiness (2026-06-03)

- [x] Deterministic macro surprise normalization foundation added.
- [x] Actual-vs-forecast primary comparison implemented; previous-only fallback is warning-gated and lower confidence.
- [x] Asset direction resolver, FX relative strength, canonical boundary, schemas, and weighted evidence reason propagation updated.
- [ ] C6-R5 expanded contradiction matrix.
- [ ] C6-R6 empirical confidence calibration.
- [ ] C6-R7 price reaction/impulse engine.
- [ ] Live macro provider reliability, consensus dispersion, and historical distribution activation.
