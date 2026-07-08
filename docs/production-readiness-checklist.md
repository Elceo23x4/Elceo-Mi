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
- [ ] Confidence calibration foundation is complete in C6-R6; empirical backtesting remains pending.
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

## L) C6-R5 expanded contradiction readiness (2026-06-04)

- [x] C6-R5 expanded contradiction matrix foundation implemented with deterministic types, schemas, module logic, canonical boundary methods, and tests.
- [x] Rule families include policy-vs-risk, rates-vs-gold, FX base/quote, risk-vs-volatility, risk-vs-credit, equities-vs-breadth, crypto-vs-derivatives/liquidity, commodity cross-asset, safe-haven conflict, macro-vs-price-confirmation, stale/fresh conflict, and source disagreement.
- [x] Contradiction means tension/uncertainty/pending confirmation, not automatic reversal and not direct financial advice.
- [ ] C6-R6 deterministic confidence calibration foundation is complete; empirical backtesting remains pending.
- [ ] C6-R7 price reaction/impulse engine remains pending.
- [ ] Provider reliability weighting and golden scenario expansion remain pending.
- No UI, live provider, payment, notification, commercial, billing, Super Admin, affiliate, route-entitlement, or 2FA behavior changed.

## M) C6-R5B source-disagreement cleanup (2026-06-04)

- [x] `source_disagreement` no longer triggers solely because `sourceIndependenceVerified` is false.
- [x] Missing source independence remains visible as a warning/caveat.
- [x] Duplicate-source-risk bursts and scraped/same-headline evidence still trigger `source_disagreement` when actual source-conflict evidence exists.
- [ ] C6-R6 deterministic confidence calibration foundation is complete; empirical backtesting remains pending.
- [ ] C6-R7 price reaction/impulse engine remains pending.
- [ ] Provider reliability weighting and golden scenario expansion remain pending.
- No UI, live provider, payment, notification, commercial, billing, Super Admin, affiliate, route-entitlement, or 2FA behavior changed.

## N) C6-R6 confidence calibration readiness (2026-06-04)

- [x] C6-R6 deterministic confidence calibration foundation implemented with types, schemas, module logic, canonical boundary methods, market-cognition integration, and tests.
- [x] Confidence now accounts for contradiction severity, source independence, duplicate/source risk, FX completeness, macro completeness, price-confirmation pending status, provider gaps, freshness, and diagnostic path limitations.
- [x] High/very-high confidence is blocked by severe missing context such as severe contradiction, missing price confirmation, one-sided FX evidence, missing macro forecast, and severe provider activation gaps.
- [ ] Confidence is not empirically backtested.
- [ ] C6-R7 price reaction/impulse engine remains pending.
- [ ] Provider reliability weighting remains pending.
- [ ] Golden scenario expansion remains pending.
- [ ] Live provider activation remains pending.
- No UI, live provider, payment, notification, commercial, billing, Super Admin, affiliate, route-entitlement, or 2FA behavior changed.

## N.1) C6-R6B provider/source context cleanup (2026-06-04)

- [x] `providerReliabilitySupplied` clarified as input-level provider context, not global provider reliability completion.
- [x] System-level provider reliability expansion remains pending.
- [x] Market cognition conservative provider/source defaults remain explicit when no calibration context is supplied.
- [x] Confidence calibration can reuse supplied contradiction context to reduce future drift.
- [ ] C6-R7 price reaction/impulse engine remains pending.
- [ ] Provider reliability weighting, golden scenario expansion, empirical backtesting, and live provider activation remain pending.
- [x] No UI, live provider, payment, notification, commercial, billing, Super Admin, affiliate, route-entitlement, or 2FA behavior changed.

## O) C6-R7 price reaction / event impulse readiness (2026-06-04)

- [x] Deterministic price reaction/event impulse foundation implemented with types, schemas, module logic, canonical boundary methods, and tests.
- [x] Supplied/input-driven candle windows can classify confirmed, rejected, absorbed, reversed, delayed, ambiguous, and insufficient price reactions.
- [x] Reaction logic includes immediate movement, follow-through, volatility-adjusted magnitude, wick rejection, absorption, reversal, warnings, rationale, and pending caveats.
- [x] Contradiction matrix can consume supplied price reaction context for macro-vs-price confirmation/tension.
- [x] Confidence calibration can remove the severe missing-price-confirmation penalty when confirmed reaction context is supplied and remain cautious for rejected/reversed/absorbed/ambiguous/delayed contexts.
- [ ] Provider reliability weighting remains pending.
- [ ] Golden scenario expansion remains pending.
- [ ] Empirical backtesting remains pending.
- [ ] Live provider activation remains pending.
- [x] No UI, live provider, payment, notification, commercial, billing, Super Admin, affiliate, route-entitlement, or 2FA behavior changed.

## C6-R8 provider reliability readiness note (2026-06-05)

- [x] Deterministic provider/source reliability and data-gap weighting foundation added.
- [x] Provider reliability is based on available registry/status/metadata/test fixtures and remains diagnostic/read-only.
- [x] Weak authority, non-live activation, stale data, duplicate/scraped source risk, failed extraction, and missing critical asset dependencies reduce evidence weight and confidence caps.
- [ ] Live provider activation remains pending.
- [ ] Empirical reliability backtesting remains pending.
- [ ] Golden scenario expansion remains pending.
- [ ] Live provider smoke tests and production payload schema verification remain pending.
- [x] No UI/live provider/payment/notification/commercial/Super Admin/affiliate/route-entitlement/2FA behavior changed in C6-R8.

## C6-R9 golden scenario / market-realism acceptance suite

- [x] C6-R9 deterministic golden scenario acceptance suite added.
- [x] 33 deterministic golden scenarios cover all 14 launch/diagnostic assets.
- [x] Covered engines: asset direction, FX relative strength, macro surprise, contradiction matrix, confidence calibration, price reaction, provider reliability, source independence, and diagnostic limitations.
- [x] Covered realism themes: macro actual-vs-forecast, inverted labor indicators, FX base/quote conflict, safe-haven conflict, risk vs volatility/credit/breadth, rates vs gold, crypto funding/liquidity, commodity cross-asset effects, provider/source quality, duplicate-source risk, fixture-only cap, missing critical dependency, DXY/VIX diagnostic limits.
- [ ] Live provider activation remains pending.
- [ ] Empirical reliability/backtesting remains pending.
- [ ] Production data calibration remains pending.
- No UI/live provider/payment/notification/commercial/Super Admin/affiliate/2FA behavior changed.

## C6-R9B golden scenario real-engine execution cleanup

- [x] Golden scenario runner executes actual reasoning modules and compares observed outputs against expected fixture criteria.
- [x] Observed direction, confidence, contradiction families, price-reaction status, provider warnings, and reason codes are derived from engine outputs, not copied from expected outcomes.
- [x] Anti-self-fulfillment tests cover mutated expected direction, required warnings, forbidden warnings, contradiction families, price candles, and provider/source metadata.
- [ ] Live provider activation remains pending.
- [ ] Empirical reliability/backtesting remains pending.
- [ ] Production data calibration remains pending.
- No UI/live provider/payment/notification/commercial/Super Admin/affiliate/2FA behavior changed.

## C6-R9C golden scenario acceptance purity cleanup

- [x] Required golden-scenario warnings are satisfied only by actual engine outputs.
- [x] Expected contradiction families are satisfied only by contradiction matrix signals.
- [x] Scenario confidence acceptance uses deterministic bounds/tier/cap checks instead of universal 0–100 ranges.
- [x] Anti-fixture-derivation tests cover warning purity, contradiction-family purity, source-disagreement purity, and confidence-band purity.
- [ ] Live provider activation remains pending.
- [ ] Empirical reliability/backtesting remains pending.
- [ ] Production data calibration remains pending.
- No UI/live provider/payment/notification/commercial/Super Admin/affiliate/2FA behavior changed.

## C6-R9D golden scenario confidence acceptance tightening

- [x] Golden-scenario confidence acceptance now uses meaningful deterministic bands instead of broad 0–100-like ranges.
- [x] Expected/allowed confidence tiers and cannot-reach caps are enforced in scenario pass/fail logic.
- [x] Anti-confidence-regression tests cover too-low confidence, too-high confidence, excluded tier, diagnostic cap, fixture-only cap, and price-reaction ordering.
- [ ] Live provider activation remains pending.
- [ ] Empirical reliability/backtesting remains pending.
- [ ] Production data calibration remains pending.
- No UI/live provider/payment/notification/commercial/Super Admin/affiliate/2FA behavior changed.

## C6-R9E golden scenario expectation completeness

- [x] Expected reason codes, provider warnings, price-reaction status/warnings, severity, and confidence expectations are binding acceptance criteria.
- [x] Severity expectations reuse the canonical contradiction severity contract and reject universal fixture ranges.
- [x] Fixture schema validation now checks expected outcomes, provider expectations, price expectations, severity/confidence contracts, engines, groups, notes, and duplicate IDs/evidence IDs.
- [ ] Live provider activation remains pending.
- [ ] Empirical backtesting remains pending.
- [ ] Production-data calibration remains pending.
- No adaptive confidence or drift engine was introduced.
- No UI/live provider/payment/notification/commercial/Super Admin/affiliate/route-entitlement/2FA behaviour changed.

## C6-R9F actual confidence and provider-input purity closure

- [x] Supported golden-scenario confidence and tier are sourced from the real confidence-calibration engine.
- [x] Provider expectations are separated from provider input construction.
- [x] Price confidence-effect semantics participate in pass/fail.
- [x] Provider expectation flag failures are individually diagnosable.
- [ ] Live provider activation remains pending.
- [ ] Empirical backtesting remains pending.
- [ ] Production-data calibration remains pending.
- No adaptive confidence/drift engine was introduced.
- No UI/live provider/payment/notification/commercial/Super Admin/affiliate/route-entitlement/2FA behaviour changed.

## C6-R9G fixture input explicitness and canonical confidence tiers

- [x] Confidence-tier thresholds have one canonical shared source.
- [x] Golden fixture confidence expectations have one visible inline anchor.
- [x] Scenario IDs/categories do not manufacture economic evidence or semantic contradiction context.
- [x] Controlled same-input tests verify price-reaction confidence effects.
- [ ] Live provider activation remains pending.
- [ ] Empirical backtesting remains pending.
- [ ] Production-data calibration remains pending.
- No adaptive confidence/drift system was introduced.
- No UI/live provider/payment/notification/commercial/Super Admin/affiliate/route-entitlement/2FA behaviour changed.

## C6-R9G.1 confidence-floor saturation open loop

- [ ] Deterministic fixture/dry-run confidence floor saturation remains open: 25 of 33 golden scenarios currently produce confidence `0`.
- [ ] Empirical backtesting must determine whether stacked readiness, coverage, confirmation, contradiction, and provider penalties are correctly composed or over-accumulating.
- [ ] Production-data calibration remains required before treating confidence levels as live-validated.
- Passing golden fixtures do not close this open loop by themselves.

## RC-A resolution note (2026-07-03)
RC-A corrects terminology, readiness contracts, and asset taxonomy only. Deterministic R1-R9 reasoning foundations exist; live provider activation remains blocked, empirical validation remains pending, and production calibration remains pending. DXY and VIX are reasoning diagnostic assets, not launch-tradable instruments. No reasoning formula, confidence arithmetic, provider activation, or golden-scenario anchor changed in RC-A. RC-D remains the next reasoning-correctness batch and will address structured issuer/region/currency inference.

## RC-A current truth source (2026-07-03)
- Current status: deterministic R1-R9 foundations are implemented and reported through the canonical readiness contract.
- Current status: live provider activation remains blocked; empirical validation and production calibration remain pending.
- Asset taxonomy: DXY and VIX are reasoning diagnostics only; the launch-tradable set remains the 12 `TRADING_ASSET_COVERAGE` instruments.
- RC-A scope: terminology, readiness-contract, and taxonomy correction only; no formula, provider activation, or golden-anchor changes.
- Next reasoning-correctness dependency: RC-D structured issuer/region/currency inference.

## RC-D structured economic-context resolution evidence

RC-D corrects structured economic-context inference across reasoning paths. Provider/source identity is provenance, not issuer authority. Affected currency is not issuer currency. Target asset is not issuer identity. Unresolved or conflicting context must be surfaced, not silently defaulted to US/USD. Live provider activation remains blocked. Empirical validation and production calibration remain pending. RC-A readiness taxonomy remains sealed; this note adds RC-D evidence/status documentation only.

## RC-E route-runtime closure annotation (2026-07-07)

RC-E adds a generated live inventory over `apps/web/app/api/**/route.ts` (145 route files), canonical policy classification, synchronized route-map documentation, and executable route runtime synchronization checks. Historical findings remain preserved above; RC-E status is recorded in `docs/route-entitlement-enforcement-map.md` and enforced by `apps/web/tests/route-runtime.test.ts`.

## RC-F Provider API Gate foundation (2026-07-08)
- Canonical Provider API Gate boundary introduced for provider/source/capability/adapter resolution before execution. Canonical source IDs remain descriptor IDs such as `tiingo_market_data`; capabilities remain registry capabilities such as `market_price_history`; adapter IDs are derived gate IDs such as `tiingo_market_data_market_price_history_adapter`.
- Activation modes are `disabled`, `fixture_only`, `dry_run`, `replay`, `staging_live_allowed`, and `production_live_allowed`. Default resolution is `dry_run`; blocked/live behavior remains default unless explicit staging/production allow policy is supplied. `production_live_allowed` is never default and requires an explicit production allow flag.
- Provider call modes are fixture response, dry-run no external call, replay captured payload, staging live, production live, or blocked live. Fixture/dry-run/replay paths require provenance and response validation contracts and do not require live credentials.
- Policy foundation covers request quotas, provider rate-limit windows, capability cost budgets, cache hit/miss, request dedupe/coalescing by normalized request, circuit open/half-open/closed, and stale-if-error only when explicitly allowed.
- Unmanaged provider calls from reasoning, ingestion, admin, scheduled, or operator paths are prohibited. Direct adapters may exist only behind the Provider API Gate or as fixture/dry-run/replay descriptors.
- RC-H remains responsible for live-provider payload validation and staging smoke with real credentials. This document does not claim live provider readiness.
- RC-G database rehearsal remains required before relying on durable provider orchestration state beyond current memory/SQL repository contracts.
