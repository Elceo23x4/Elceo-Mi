# Final Production Status Report (C6-A12)

_Date: 2026-05-16_

## Overall status
ELCEO backend foundation is **ready for the next phase** (UI integration + staged activation planning) once validation gates pass.

This is **not** final production launch approval.

## C6-A12 final backend foundation status
- Backend foundation consolidation through C6-A11I is complete.
- Live provider activation remains blocked by design pending env keys, approvals, and live smoke tests.
- Hosting/staging/live testing is not yet completed.
- UI integration is not yet completed.
- KoraPay remains readiness shell status until activation + verified webhook/idempotency flow.
- Notification system remains readiness shell status until provider activation and live delivery verification.
- Super Admin metrics remain fixture/estimated until live billing/payment materialization.
- Observability is internal readiness only; no external vendor export integration yet.
- Provider activation requires environment keys and explicit operational approval.
- Production launch is not approved until hosting/staging/security smoke and attack drills complete.

## Truth constraints
- Do not label fixture/dry-run systems as live.
- Do not claim live payment revenue availability.
- Do not claim live email/WhatsApp notification delivery.
- Do not claim external AI model-provider runtime dependency.

## Current readiness class
- Backend foundation: **Ready for pre-activation phase progression**.
- Live operations: **Blocked pending activation gates**.
- Production launch: **No-go until deployment + security + smoke evidence is complete**.

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

## C6-R1 production status note (2026-06-03)

- Asset causality mapping is now a typed, schema-validated, tested foundation for all ELCEO launch assets.
- This improves production readiness documentation and contract coverage only; it does not activate live providers or complete downstream market-realism engines.
- R2-R9 remain required before ELCEO can claim final market-intelligence realism.
- No UI, live payment, live notification, commercial entitlement, Super Admin, or 2FA behavior changed.

## C6-R2 — Asset-contextual direction resolver foundation (2026-06-03)

- Added a deterministic asset-contextual direction resolver foundation for reasoning internals.
- Generic metadata direction mapping is no longer the primary weighted-evidence contribution path; the same event can resolve differently by asset through causality map context, asset family, FX orientation, driver kind, policy/risk tone, and caveat flags.
- Open loops remain: R3 FX relative strength, R4 macro surprise normalization, R5 expanded contradiction matrix, R6 confidence calibration, R7 price reaction/impulse, provider reliability, and golden scenario expansion.
- No UI, live provider, payment, notification, commercial entitlement, Super Admin, affiliate, or 2FA behavior changed.

## C6-R2B — Direction resolver issuer-ambiguity cleanup (2026-06-03)

- Corrected the C6-R2 policy issuer ambiguity so missing policy issuer metadata no longer defaults to Fed/U.S. direction pressure.
- Explicit Fed metadata still resolves asset-contextually, and weighted-evidence tests now verify differing contribution signs for DXY versus EUR/USD.
- Non-Fed issuer-side expansion remains limited and pending with later issuer-side/R3 FX relative-strength work; R3/R4/R5/R6/R7 remain pending.
- No UI, live provider, payment, notification, commercial, Super Admin, route entitlement, or 2FA behavior changed.

## C6-R3 — FX relative currency strength engine foundation (2026-06-03)

- Added typed, schema-validated, tested FX relative currency strength foundation for all seven ELCEO launch FX pairs.
- FX reasoning now has a base-vs-quote pressure model; missing base or quote evidence lowers confidence and remains visible in warnings/reason codes.
- Non-Fed issuer side handling is improved for ECB/EUR, BoE/GBP, BoJ/JPY, SNB/CHF, RBA/AUD, RBNZ/NZD, and BoC/CAD, while missing issuer remains ambiguous.
- C6-R3B safety cleanup: unsupported/non-FX weighted snapshots no longer default to EUR/USD; weighted-snapshot FX relative-strength reconstruction is diagnostic/limited because original issuer/currency metadata may be reduced, so evidence-item inputs remain preferred for full FX side attribution and DXY remains limited diagnostic.
- Macro surprise normalization remains R4; expanded contradiction matrix remains R5; confidence calibration foundation is complete in C6-R6; price reaction/impulse remains R7; provider reliability/golden scenarios remain pending.
- No UI, live provider, payment, notification, commercial, Super Admin, affiliate, route entitlement, or 2FA behavior changed.

## C6-R4 production-status note — macro surprise normalization (2026-06-03)

C6-R4 added a fixture-only/read-only macro surprise normalization engine. It improves market realism by making actual-vs-forecast the primary macro comparison and by preserving indicator-specific interpretation for inflation, labor, growth/activity, and policy-rate decisions. It does not activate live providers, payments, notifications, or frontend payload changes. R5/R6/R7/provider reliability remain pending.

## C6-R5 production-status note — Expanded contradiction matrix (2026-06-04)

C6-R5 added a deterministic expanded contradiction matrix foundation and read-only canonical boundary methods. The matrix broadens contradiction/tension detection beyond the old four market-cognition pairs and now covers policy-vs-risk, rates-vs-gold, FX base/quote, risk-vs-volatility, risk-vs-credit, equities-vs-breadth, crypto-vs-derivatives/liquidity, commodity cross-asset, safe-haven conflict, macro-vs-price-confirmation, stale/fresh conflict, and source disagreement. Contradiction is uncertainty context, not automatic reversal and not financial advice. R6 confidence calibration, R7 price reaction/impulse, provider reliability weighting, and golden scenario expansion remain pending. No UI, live provider, payment, notification, commercial, billing, Super Admin, affiliate, route-entitlement, or 2FA behavior changed.

## C6-R5B production-status note — Source-disagreement cleanup (2026-06-04)

C6-R5B keeps source independence as a warning/caveat while preventing `source_disagreement` from firing solely because `sourceIndependenceVerified` is false. Duplicate-source-risk bursts and scraped/same-headline source evidence still create `source_disagreement` when actual source-conflict evidence exists. R6 confidence calibration, R7 price reaction/impulse, provider reliability weighting, and golden scenario expansion remain pending. No UI, live provider, payment, notification, commercial, billing, Super Admin, affiliate, route-entitlement, or 2FA behavior changed.

## C6-R6 production-status note — Confidence calibration foundation (2026-06-04)

C6-R6 adds deterministic confidence calibration and read-only canonical boundary methods. Confidence now accounts for contradiction severity, source independence, duplicate/source risk, FX completeness, macro completeness, price-confirmation pending status, provider gaps, freshness, and diagnostic path limitations. This is foundation-level deterministic calibration, not empirical backtesting. C6-R7 price reaction/impulse, provider reliability weighting, golden scenario expansion, and live provider activation remain pending. No UI, live provider, payment, notification, commercial, billing, Super Admin, affiliate, route-entitlement, or 2FA behavior changed.
## C6-R6B confidence calibration provider/source context cleanup (2026-06-04)

- `providerReliabilitySupplied` is input-level provider context for one calibration input, not completion of global provider reliability weighting.
- System-level provider reliability expansion remains pending; C6-R7 price reaction, provider reliability weighting, golden scenarios, empirical backtesting, and live provider activation remain pending.
- Market cognition keeps conservative provider/source defaults when no explicit internal context is supplied, and calibration can reuse a supplied contradiction matrix to reduce future context drift.
- No UI, live provider, payment, notification, commercial, billing, Super Admin, affiliate, route-entitlement, or 2FA behavior changed.

## C6-R7 production-status addendum — deterministic price reaction foundation (2026-06-04)

- C6-R7 adds the first deterministic price reaction / event impulse layer for market-cognition reasoning.
- The layer is input/fixture driven and can classify event-window price behavior as confirmed, rejected, absorbed, reversed, delayed, ambiguous, or insufficient data.
- The layer checks immediate move, follow-through, volatility-adjusted impulse, wick rejection, absorption, reversal, warnings, rationale, and incomplete/pending status.
- Contradiction and confidence calibration can use supplied reaction context, but confirmed reaction never overrides severe contradiction or provider gaps.
- Provider reliability weighting, golden scenario expansion, empirical backtesting, and live provider activation remain pending.
- No UI, live provider, payment, notification, commercial, billing, Super Admin, affiliate, route-entitlement, or 2FA behavior changed.

## C6-R8 provider reliability foundation status (2026-06-05)

C6-R8 added deterministic provider/source reliability and data-gap weighting. The implementation uses registry/status/metadata/test-fixture context only and does not activate live providers or prove empirical reliability. Source authority, activation state, freshness, independence, extraction quality, provider/evidence-class fit, and asset dependency coverage now reduce or cap evidence strength and confidence when context is weak. Live provider activation, empirical reliability backtesting, and golden scenario expansion remain pending. No UI, live provider, payment, notification, commercial, Super Admin, affiliate, route-entitlement, or 2FA behavior changed.

## C6-R9 production status note — market-realism acceptance

- C6-R9 adds a deterministic golden-scenario acceptance suite for the market-realism reasoning layer.
- The suite includes 33 scenarios covering all 14 launch/diagnostic assets and checks macro surprise, FX relative strength, contradictions, confidence calibration, price reaction, provider reliability, source independence, and diagnostic limitations.
- This improves production-readiness evidence for deterministic reasoning behavior only.
- It is not live provider activation, not empirical backtesting, and not production data calibration.
- Live provider activation, empirical reliability/backtesting, and production data calibration remain pending.
- No UI/live provider/payment/notification/commercial/Super Admin/affiliate/2FA behavior changed.

## C6-R9B production status note — real-engine acceptance harness

- C6-R9B upgrades the market-realism golden scenario suite so observed scenario results are produced by actual reasoning modules rather than copied expected fixture values.
- This strengthens deterministic production-readiness evidence for reasoning behavior only.
- It is not live provider activation, not empirical backtesting, and not production data calibration.
- Live provider activation, empirical reliability/backtesting, and production data calibration remain pending.
- No UI/live provider/payment/notification/commercial/Super Admin/affiliate/2FA behavior changed.

## C6-R9C production status note — acceptance purity

- C6-R9C removes remaining fixture-derived warning and contradiction-family shortcuts from the market-realism golden scenario suite.
- Scenario acceptance now requires actual engine warnings, actual contradiction matrix families, and meaningful confidence bounds/tier/cap checks.
- This strengthens deterministic real-engine acceptance evidence only; it is not live provider activation, empirical backtesting, or production data calibration.
- Live provider activation, empirical reliability/backtesting, and production data calibration remain pending.
- No UI/live provider/payment/notification/commercial/Super Admin/affiliate/2FA behavior changed.

## C6-R9D production status note — confidence acceptance tightening

- C6-R9D tightens market-realism golden scenario confidence acceptance so deterministic scenarios can fail on actual confidence range or tier mismatches.
- Default confidence bands are now meaningful rather than broad 0–100-like ranges, and tier/cap expectations are enforced for diagnostic, fixture-only, and price-reaction scenarios.
- This strengthens deterministic real-engine acceptance evidence only; it is not live provider activation, empirical backtesting, or production data calibration.
- Live provider activation, empirical reliability/backtesting, and production data calibration remain pending.
- No UI/live provider/payment/notification/commercial/Super Admin/affiliate/2FA behavior changed.

## C6-R9E production status note — expectation completeness

- C6-R9E makes every binding golden-scenario expectation participate in deterministic pass/fail: reason codes, provider warnings, price-reaction status/warnings, severity, and confidence.
- Severity now uses the canonical contradiction severity contract, and schema validation rejects misleading universal severity/confidence contracts.
- This strengthens deterministic real-engine acceptance evidence only; it is not live provider activation, empirical backtesting, or production-data calibration.
- No adaptive confidence or drift engine was introduced.
- No UI/live provider/payment/notification/commercial/Super Admin/affiliate/route-entitlement/2FA behaviour changed.

## C6-R9F production status note — actual confidence and provider-input purity

- C6-R9F makes deterministic golden-scenario confidence use actual confidence-calibration engine outputs for supported assets, with explicit diagnostic fallback only where required.
- Provider expectations no longer construct provider engine inputs; provider flag failures and price confidence-effect expectations are binding and diagnosable.
- This strengthens deterministic real-engine acceptance evidence only; it is not live provider activation, empirical backtesting, or production-data calibration.
- No adaptive confidence or drift engine was introduced.
- No UI/live provider/payment/notification/commercial/Super Admin/affiliate/route-entitlement/2FA behaviour changed.

## C6-R9G production status note — fixture input explicitness

- C6-R9G canonicalizes confidence-tier thresholds and removes hidden fixture confidence anchors.
- Economic and semantic evidence inputs are now explicit fixture data rather than scenario-ID/category-derived engine input.
- Price-reaction confidence effects are verified through controlled same-input comparisons.
- This remains deterministic real-engine acceptance evidence only; it is not live provider activation, empirical backtesting, or production-data calibration.
- No adaptive confidence/drift system, UI, live provider, payment, notification, commercial, Super Admin, affiliate, route-entitlement, or 2FA behaviour changed.

## C6-R9G.1 confidence-floor saturation note

- The C6-R9 deterministic fixture suite still shows substantial confidence-floor saturation: 25 of 33 golden scenarios currently produce confidence `0`.
- The saturation may be caused by conservative stacked readiness, coverage, confirmation, contradiction, and provider penalties.
- Empirical backtesting and production-data calibration remain required to determine whether these penalties are correctly composed or over-accumulating.
- This is fixture-driven dry-run acceptance, not live confidence validation, and should not be treated as closed only because the golden scenarios pass.

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
