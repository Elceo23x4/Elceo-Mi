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

## C6-R1 — Asset causality map foundation (2026-06-03)

- Added code-backed asset causality map contracts and validation for all launch assets.
- Open loops intentionally remain for R2-R9: direction resolver, FX relative strength, macro surprise normalization, contradiction expansion, confidence upgrade, price reaction/event impulse, provider reliability weighting, and golden scenarios.
- The new map records provider dependencies as must-have, important, or nice-to-have while preserving fixture/dry-run/live-blocked/not-started caveats.
- No UI, live provider, payment, notification, commercial, Super Admin, or 2FA activation occurred.

## C6-R2 — Asset-contextual direction resolver foundation (2026-06-03)

- Added a deterministic asset-contextual direction resolver foundation for reasoning internals.
- Generic metadata direction mapping is no longer the primary weighted-evidence contribution path; the same event can resolve differently by asset through causality map context, asset family, FX orientation, driver kind, policy/risk tone, and caveat flags.
- Open loops remain: R3 FX relative strength, R4 macro surprise normalization, R5 expanded contradiction matrix, R6 confidence calibration, R7 price reaction/impulse, provider reliability, and golden scenario expansion.
- No UI, live provider, payment, notification, commercial entitlement, Super Admin, affiliate, or 2FA behavior changed.

## C6-R2B — Direction resolver issuer-ambiguity cleanup (2026-06-03)

- Policy issuer ambiguity was corrected: missing hawkish/dovish issuer metadata no longer silently defaults to Fed/U.S.
- Explicit Fed/U.S. metadata still resolves through C6-R2 asset-contextual rules and weighted-evidence contribution signs.
- Non-Fed issuer handling remains limited until later issuer-side expansion / R3 FX relative-strength work; R3/R4/R5/R6/R7 remain pending.
- No UI/live provider/payment/notification/commercial/Super Admin/2FA behavior changed.

## C6-R3 — FX relative currency strength engine foundation (2026-06-03)

- Added deterministic FX base-vs-quote pressure modeling for EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, NZD/USD, and USD/CAD.
- Missing side evidence now remains visible and lowers confidence; non-Fed issuer-side handling is improved for launch central banks/currencies.
- DXY is limited read-only broad-USD diagnostic coverage only; full basket weighting is not implemented.
- C6-R3B safety cleanup: unsupported/non-FX weighted snapshots no longer default to EUR/USD; weighted-snapshot FX relative-strength reconstruction is diagnostic/limited because original issuer/currency metadata may be reduced, so evidence-item inputs remain preferred for full FX side attribution.
- Still open: R4 macro surprise normalization, R5 expanded contradiction matrix, R6 confidence calibration, R7 price reaction/impulse engine, provider reliability weighting, and golden scenario expansion.
- No UI, live providers, payments, notifications, commercial behavior, Super Admin behavior, affiliate behavior, route entitlement behavior, or 2FA behavior changed.

## C6-R4 macro surprise normalization open-loop update (2026-06-03)

- Closed foundation gap: macro releases can now be normalized into signed surprise objects using actual vs forecast, previous fallback, revisions, indicator category/kind, directional meaning, severity, confidence, warnings, and reason codes.
- Still open: C6-R5 contradiction expansion, C6-R6 confidence calibration, C6-R7 price reaction/impulse engine, consensus dispersion ingestion, historical distribution calibration, and provider reliability/live macro activation.
- Commercial, billing, Super Admin, affiliate, route entitlement, notification, payment, live provider, and 2FA behavior were not changed in C6-R4.

## C6-R5 expanded contradiction matrix open-loop update (2026-06-04)

- Completed foundation: deterministic expanded contradiction matrix added for policy-vs-risk, rates-vs-gold, FX base/quote, risk-vs-volatility, risk-vs-credit, equities-vs-breadth, crypto-vs-derivatives/liquidity, commodity cross-asset, safe-haven conflict, macro-vs-price-confirmation, stale/fresh conflict, and source disagreement.
- Contradiction means tension/uncertainty or pending confirmation; it is not automatic reversal logic and not direct financial advice.
- Still open: C6-R6 empirical confidence calibration, C6-R7 price reaction/impulse engine, provider reliability weighting, and golden scenario expansion.
- No UI, live provider, payment, notification, commercial, billing, Super Admin, affiliate, route-entitlement, or 2FA behavior changed.

## C6-R5B — Source-disagreement noise cleanup (2026-06-04)

- `source_disagreement` no longer triggers solely because `sourceIndependenceVerified` is false; missing source independence remains a warning/caveat.
- Duplicate-source-risk bursts and scraped/same-headline source evidence still trigger `source_disagreement`.
- Carry-forward: DXY/VIX raw evidence contradiction mapping should be reviewed later if diagnostic assets remain part of launch reasoning.
- Still open: C6-R6 empirical confidence calibration, C6-R7 price reaction/impulse engine, provider reliability weighting, and golden scenario expansion.
- No UI, live provider, payment, notification, commercial, billing, Super Admin, affiliate, route-entitlement, or 2FA behavior changed.

## C6-R6 confidence calibration open-loop update (2026-06-04)

- Closed foundation-level gap: confidence no longer ignores market-realism readiness factors. The deterministic calibration layer now consumes contradiction severity, source independence/duplicate risk, provider/data activation gaps, FX completeness, macro completeness, price-confirmation pending status, stale/fresh conflict, and diagnostic path limitations.
- Still open: C6-R7 price reaction/impulse, provider reliability weighting, golden scenario expansion, empirical backtesting, and live provider activation.
- No UI, live provider, payment, notification, commercial, billing, Super Admin, affiliate, route-entitlement, or 2FA behavior changed.
## C6-R6B confidence calibration provider/source context cleanup (2026-06-04)

- `providerReliabilitySupplied` is input-level provider context for one calibration input, not completion of global provider reliability weighting.
- System-level provider reliability expansion remains pending; C6-R7 price reaction, provider reliability weighting, golden scenarios, empirical backtesting, and live provider activation remain pending.
- Market cognition keeps conservative provider/source defaults when no explicit internal context is supplied, and calibration can reuse a supplied contradiction matrix to reduce future context drift.
- No UI, live provider, payment, notification, commercial, billing, Super Admin, affiliate, route-entitlement, or 2FA behavior changed.

## C6-R7 open-loop update — price reaction / event impulse (2026-06-04)

Closed in this batch:

- Deterministic price reaction/event impulse foundation added for supplied candles and event times.
- Price reaction can now be classified as confirmed, rejected, absorbed, reversed, delayed, ambiguous, or insufficient data.
- Contradiction and confidence layers can consume supplied price reaction diagnostics instead of relying only on pending price-confirmation warnings.

Still open:

- Provider reliability weighting remains pending and is not treated as complete.
- Golden scenario expansion remains pending and is not treated as complete.
- Empirical backtesting remains pending and is not treated as complete.
- Live provider activation/live chart feeds remain pending and blocked by default.
- No UI, live provider, payment, notification, commercial, billing, Super Admin, affiliate, route-entitlement, or 2FA behavior changed.

## C6-R8 — Provider reliability/data-gap weighting open-loop update (2026-06-05)

Closed in this batch:

- Deterministic provider/source reliability and data-gap weighting foundation added.
- Provider reliability is based on available registry/status/metadata/test fixtures only, not live provider activation.
- Source authority, activation state, freshness, independence, extraction quality, evidence-class fit, and asset-critical dependency coverage now affect reliability, evidence weight, diagnostics, and confidence caps.

Still open:

- Live provider activation remains pending.
- Empirical reliability backtesting remains pending.
- Golden scenario expansion remains pending.
- Production live-payload schema verification and provider smoke tests remain pending.
- No UI/live provider/payment/notification/commercial/Super Admin/affiliate/route-entitlement/2FA behavior changed.

## C6-R9 open-loop update — golden scenario acceptance

- Added deterministic C6-R9 golden scenario acceptance suite with 33 fixtures covering all 14 launch/diagnostic assets.
- Verified areas: macro actual-vs-forecast surprise, inverted labor indicators, FX base/quote pressure, safe-haven conflicts, risk/volatility/credit/breadth contradictions, crypto derivatives/liquidity tension, commodity cross-asset distinctions, price-reaction statuses, provider/source reliability, source independence, and diagnostic DXY/VIX limits.
- Still open: live provider activation, empirical reliability/backtesting, and production data calibration.
- No UI/live provider/payment/notification/commercial/Super Admin/affiliate/2FA behavior changed.

## C6-R9B open-loop update — real-engine golden scenarios

- C6-R9B removes the self-fulfilling golden scenario runner path and derives observed acceptance fields from actual reasoning engine outputs.
- The suite remains deterministic and fixture-driven, not live-provider or empirical-backtesting completion.
- Still open: live provider activation, empirical reliability/backtesting, and production data calibration.
- No UI/live provider/payment/notification/commercial/Super Admin/affiliate/2FA behavior changed.

## C6-R9C golden scenario acceptance purity note

- Closed: golden-scenario acceptance no longer satisfies required warnings or contradiction families from fixture/category/source metadata.
- Closed: confidence expectations now apply deterministic bounds/tier/cap checks instead of universal 0–100 acceptance.
- Open: live provider activation remains pending.
- Open: empirical reliability/backtesting remains pending.
- Open: production data calibration remains pending.
- Scope note: no UI/live provider/payment/notification/commercial/Super Admin/affiliate/route-entitlement/2FA behavior changed.

## C6-R9D golden scenario confidence acceptance tightening

- Closed: golden-scenario confidence acceptance now rejects materially too-low, too-high, or wrong-tier actual confidence outputs.
- Closed: default confidence bands are tightened and tier/cap expectations are enforced for diagnostic, fixture-only, and price-reaction scenarios.
- Open: live provider activation remains pending.
- Open: empirical reliability/backtesting remains pending.
- Open: production data calibration remains pending.
- Scope note: no UI/live provider/payment/notification/commercial/Super Admin/affiliate/route-entitlement/2FA behavior changed.

## C6-R9E golden scenario expectation completeness closure

- Closed: all binding golden-scenario expectations now participate in pass/fail, including reason codes, provider warnings, price-reaction status/warnings, severity, and confidence.
- Closed: severity expectations now use the canonical contradiction severity vocabulary.
- Open: live provider activation remains pending.
- Open: empirical backtesting remains pending.
- Open: production-data calibration remains pending.
- Scope note: no adaptive confidence/drift engine, UI, live provider, payment, notification, commercial, Super Admin, affiliate, route-entitlement, or 2FA behaviour changed.

## C6-R9F actual confidence and provider-input purity closure

- Closed: supported golden-scenario confidence now comes from the real confidence-calibration output, not a separate golden-runner confidence formula.
- Closed: provider expectations no longer construct provider-reliability inputs; provider input fixtures now carry deterministic dependency input.
- Closed: price confidence-effect checks are binding, and provider expectation flag failures are individually reported.
- Open: live provider activation remains pending.
- Open: empirical backtesting remains pending.
- Open: production-data calibration remains pending.
- Scope note: no adaptive confidence/drift engine, UI, live provider, payment, notification, commercial, Super Admin, affiliate, route-entitlement, or 2FA behaviour changed.

## C6-R9G fixture input explicitness and canonical confidence tiers

- Closed: confidence-tier thresholds now have one canonical shared definition.
- Closed: golden fixtures now use one visible confidence anchor and explicit economic input rather than hidden scenario-ID inference.
- Closed: category labels no longer inject semantic evidence, and price confidence effects are tested with controlled same-input comparisons.
- Open: live provider activation remains pending.
- Open: empirical backtesting remains pending.
- Open: production-data calibration remains pending.
- Scope note: no adaptive confidence/drift system, UI, live provider, payment, notification, commercial, Super Admin, affiliate, route-entitlement, or 2FA behaviour changed.

## C6-R9G.1 confidence-floor saturation open loop

- Deterministic fixture/dry-run confidence currently exhibits substantial floor saturation: 25 of 33 current golden scenarios produce confidence `0`.
- This may reflect conservative stacked readiness, coverage, confirmation, contradiction, and provider penalties rather than calibrated production confidence.
- Empirical backtesting must determine whether these penalties are correctly composed or over-accumulating.
- Production-data calibration remains required; this is not live confidence validation.
- Do not close this issue merely because the golden fixtures accept the current values.

- RC-C code foundations now include durable commercial repositories, commercial operation idempotency records, consolidated social identifier persistence, and shared SQL pool lifecycle handling. This is code-level foundation only; staging/managed database rehearsal, production activation, live payment readiness, and external social ownership proof remain unclaimed.

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

### RC-F adoption correction (2026-07-08)
- Provider API Gate foundation is now adopted by scheduled ingestion before fixture adapter persistence executes; scheduled replay uses the gate replay/captured-payload path and live staging/production requests remain blocked by default.
- Unmanaged provider-call inventory is executable and fails on runtime direct provider adapter execution outside the gate; direct adapters remain allowed only as fixture/provider-source implementations or tests.
- Live execution remains explicitly not implemented until RC-H (`live_execution_not_implemented_until_rc_h`) even when resolver policy can classify a theoretically live-allowed request.
- RC-G database rehearsal is still required before durable provider orchestration state can be treated as production-rehearsed.

## RC-G migration and database rehearsal update
- Dry-run/order-only rehearsal is performed with `npm run rehearse:migrations:dry-run`; it reads `infra/db/schema/*.sql`, prints the full-filename lexicographic order, and intentionally uses no database connection.
- Mock ledger rehearsal is performed by `npm run test:migrations`; it uses an injected executor for CI-safe clean apply, repeat/idempotency, checksum drift, failure-stop, and DB executor selection/close tests without live credentials.
- Actual local/staging database rehearsal is performed with `ELCEO_MIGRATION_REHEARSAL=1 DATABASE_URL=postgres://... node scripts/rehearse-db-migrations.mjs`; the script dynamically uses the project `pg` driver, creates/verifies the local/staging rehearsal ledger, applies migrations in full-filename lexicographic order, skips matching ledger checksums, fails on checksum drift, stops on first failure, and closes the DB pool.
- Duplicate numeric prefixes (`0027`, `0028`) are non-fatal warnings only because full filenames are the migration identity for this repository. Exact duplicate filenames remain fatal.
- The rehearsal ledger table `elceo_migration_rehearsal_ledger` is a local/staging rehearsal artifact when created by `scripts/rehearse-db-migrations.mjs`; it is not production migration state unless a future explicit migration-state strategy promotes it.
- The script refuses non-dry-run execution unless `ELCEO_MIGRATION_REHEARSAL=1` is present, and it refuses DB execution when `DATABASE_URL` is absent and no injected test DB is supplied.
- Production migration window approval still requires verified backup creation, backup restore rehearsal evidence, staging rehearsal evidence, checksum drift review, and a rollback decision tree before applying production migrations.
- Rollback strategy is restore-first for destructive or unknown migration risk; potentially destructive migrations require explicit mitigation/rehearsal notes before use.
- This document does not claim production DB migration readiness until staging/prod rehearsal with actual managed environment migration state has been performed.

## RC-H provider live-payload and schema validation

RC-H adds a staging-safe provider payload validation layer without enabling production provider activation by default. Provider execution remains constrained to the Provider API Gate; dry-run uses no external call, fixture mode uses adapter fixtures, replay mode validates captured payload metadata, and staging-live mode is opt-in only. Production-live activation remains blocked/not approved.

Validation states are distinguished as follows:
- **fixture validation**: local adapter fixture path only; no credentials and no third-party call.
- **replay validation**: captured-payload contract and schema checks against committed safe fixtures; CI-safe without credentials.
- **staging-live validation**: opt-in operator smoke only with `ELCEO_PROVIDER_STAGING_SMOKE=1`, credentials from environment only, Provider API Gate only, and redacted capture metadata.
- **production-live activation**: not approved by RC-H and still blocked.
- **credentials unavailable**: provider has an official/live-style adapter contract but cannot be claimed live validated without environment credentials.
- **provider manually reviewed**: manual/download provider requires human source review before live claims.
- **provider live validated**: reserved for future batches after real staging credentials and official payload contracts pass.
- **provider blocked**: descriptor-only, placeholder, or later-batch execution.

RC-H replay smoke validates captured payload metadata, pagination cursor fields, nullable/unknown-field policy, duplicate/revision/backfill markers, provider error bodies, rate-limit bodies, and secret redaction proof. Staging smoke refuses to run unless explicitly enabled and never prints secrets. No public production claims, entitlement policy, payment activation, notification sends, formulas, golden scenarios, migrations, or C6 phase numbering are changed by this batch.

## RC-I1 local payment correctness and resilience
- RC-I1 implements local payment correctness only for F-016 local portions.
- Production-live payment activation remains blocked; default runtime uses disabled/local fake/replay boundaries and no real provider credential usage.
- Real provider sandbox behavior remains RC-I2.
- Notifications remain RC-I3.
- Referral/affiliate implementation remains later.
- Unknown and reconciliation_required are safe states that preserve the original provider idempotency key and do not create a second provider charge.
- Duplicate charge prevention is enforced locally by business-idempotency and provider-idempotency uniqueness.
- Exactly-once entitlement and immutable ledger effects are enforced locally by operation/effect keys.

### RC-I1 surgical durability correction
- SQL-backed durable local payment correctness is used only when `APP_STATE_REPOSITORY=sql` and `DATABASE_URL` are configured.
- Memory payment correctness storage is local/test fallback only and is not production durability.
- Local fake/replay provider outcomes remain test-safe boundaries; production-live payment activation remains blocked.
- Real provider sandbox validation remains RC-I2, notification delivery remains RC-I3, and referral/affiliate work remains later.
