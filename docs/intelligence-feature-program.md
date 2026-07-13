# Intelligence Feature Program

Status: **IFP-1 active approved intelligence capability**. This document defines the controlled Intelligence Feature Program before any IFP runtime development begins. IFP-0 implements no intelligence feature and does not complete IFP.

## Program purpose

The Intelligence Feature Program moves ELCEO from merged deterministic intelligence foundations to validated, product-consumable, production-calibrated intelligence. It is the evidence, calibration, evaluation, auditability, interpretation, alert-readiness, and production-data validation program that follows the C6-R1 through C6-R9 deterministic reasoning foundations.

IFP is not another C6-R phase, C6-R9H, C6-R10, live provider activation, payment certification, infrastructure certification, affiliate/referral/coupon implementation, general frontend redesign, or RC-K. Live provider activation remains behind the Provider API Gate. RC-I2-CERT and RC-J-ENV continue in parallel. RC-K begins only after all eight IFP phases are closed.

## Truth sources inspected

- `docs/elceo-math-checklist.md`
- `docs/market-realism-truth-source-map.md`
- `docs/market-realism-code-gap-audit.md`
- `docs/backend-open-loop-register.md`
- `docs/final-production-status-report.md`
- `docs/production-readiness-checklist.md`
- `docs/final-backend-foundation-readiness-review.md`
- `docs/backend-foundation-completion-map.md`
- `docs/provider-live-activation-readiness.md`
- `docs/post-r9-cleanup-execution-plan.md`
- `docs/post-r9-repository-closure-audit.md`
- `packages/types/src/market-*`
- `packages/schemas/src/market-*`
- `services/reasoning/src/**`
- `services/reasoning/src/tests/**`
- `services/analytics/src/**`
- `services/notifications/src/**`
- `apps/web/app/api/**/route.ts`

## Current implementation baseline

| Capability | Classification | Evidence baseline | IFP implication |
| --- | --- | --- | --- |
| asset causality | implemented_deterministic_foundation | Asset-specific causality, diagnostic assets, and tests exist in market causality modules and source maps. | Reuse; validate with empirical outcomes and product explanations. |
| economic-context resolution | implemented_deterministic_foundation | Economic context schemas forbid provider/title authority inference and reasoning tests cover resolution. | Reuse; preserve structured authority precedence. |
| FX relative-strength reasoning | implemented_deterministic_foundation | FX pressure modeling exists with relative base/quote logic and tests. | Reuse; empirical direction validation required. |
| macro surprise normalization | implemented_but_requires_empirical_validation | Indicator categories, normalized surprise fields, and tests exist. | Validate reaction windows and event-class methodology. |
| contradiction matrix | implemented_but_requires_empirical_validation | Contradiction families, severity, and tests exist. | Stress test contradiction/freshness behavior against historical regimes. |
| confidence calibration | implemented_but_requires_empirical_validation | Confidence decomposition and calibration tests exist; 25 of 33 golden scenarios currently produce confidence 0. | Mandatory empirical diagnosis; no formula changes in IFP-0. |
| price-reaction classification | implemented_but_requires_empirical_validation | Price reaction modules and tests exist. | Validate horizons, asset/event direction, and reaction labels. |
| provider reliability weighting | implemented_but_requires_production_calibration | Provider reliability weighting and Provider API Gate contracts exist; live activation remains blocked. | Version and govern reliability evidence after provider certification. |
| golden-scenario acceptance | implemented_deterministic_foundation | 33 deterministic golden scenarios and acceptance report schemas exist. | Fixtures remain deterministic coverage, not empirical proof. |
| readiness contracts | implemented_deterministic_foundation | Market reasoning readiness schemas and release gates exist. | Extend with IFP evidence gates without changing C6 phase numbering. |
| analytics/coaching/journal intelligence | implemented_but_not_product-integrated | Analytics and coaching services link reasoning to journal behavior. | Human/trader interpretation review must prove safe product consumption. |
| chart intelligence | implemented_but_not_product-integrated | Chart projection, zone, price-level, and annotation logic exists. | Validate readability and audit path from chart object to decision evidence. |
| alert-readiness foundations | implemented_but_requires_production_calibration | Notification policy, cooldown, material-change, dedupe, and outbox foundations exist. | Validate trade-readiness and throttling using market outcomes and user safety constraints. |
| live provider activation | external_environment_blocked | Provider readiness docs and API Gate keep production-live providers blocked. | Not completed by IFP; IFP consumes certified data only when available. |
| payment provider certification | not_in_ifp_scope | RC-I2-CERT remains mandatory. | Parallel blocker, not an IFP phase. |
| infrastructure and DR certification | not_in_ifp_scope | RC-J-ENV remains mandatory. | Parallel blocker, not an IFP phase. |
| affiliate/referral/coupon system | not_in_ifp_scope | Commercial referral/affiliate work is separately tracked. | Must not appear in IFP branches. |

## Confidence-floor issue

Existing observation: **25 of 33 deterministic golden scenarios currently produce confidence 0**. This is classified as **mandatory empirical diagnosis** owned by **IFP-3 — Contradiction-to-Action Protocol**.

IFP-0 does not raise confidence values, change confidence bands, weaken readiness penalties, remove contradiction penalties, change golden-scenario expectations, or create an adaptive self-modifying confidence engine.

## Canonical IFP-1 through IFP-8 map

### IFP-1 — Expectation-Reality Delta Engine

- Phase ID: IFP-1
- Canonical phase name: Expectation-Reality Delta Engine
- Exact objective: establish versioned, reversible parameter/model configuration records for deterministic intelligence inputs, evidence windows, horizons, and calibration metadata without changing formulas for fixture pass rates.
- Problem being closed: deterministic foundations expose behavior but do not yet have an IFP-wide configuration evidence ledger suitable for calibration comparisons and rollback.
- Source requirements: versioned parameter and model configuration; production-data calibration; readiness contracts.
- Existing modules reused: market readiness contracts, confidence calibration contracts, provider reliability contracts, runtime reasoning reports.
- Likely permitted files: documentation, market configuration types/schemas if needed, deterministic tests for configuration serialization.
- Prohibited scope: reasoning formulas, confidence arithmetic, confidence tier thresholds, asset taxonomy, provider activation, C6 phase numbering.
- Dependencies: merged deterministic foundations.
- Implementation outputs: canonical config version record, changelog/audit fields, rollback language, fixture/current-runtime config snapshots.
- Tests and evaluation evidence: schema validation, serialization tests, diff/rollback tests, documentation consistency checks.
- Merge blockers: unversioned calibration knobs; any fixture-pass-driven formula change.
- External data/environment requirements: none.
- Truthful completion language: IFP-1 complete means configuration is versioned and auditable; it does not mean calibration is empirically validated.
- Stop condition: every IFP-relevant parameter family has an owner, version, rationale, rollback path, and no runtime formula change.

### IFP-2 — Historical Market Memory / Analog Engine

- Phase ID: IFP-2
- Canonical phase name: Historical Market Memory / Analog Engine
- Exact objective: define and ingest separated historical calibration and evaluation datasets with event-time-safe fields for asset/event reaction studies, and establish the predeclared evidence-sufficiency policy before evaluation begins.
- Problem being closed: fixtures and golden scenarios are deterministic coverage, not empirical evidence.
- Source requirements: historical calibration and reaction-study evidence; calibration/evaluation separation; training/evaluation dataset separation; no historical outcome leakage; predeclared evidence coverage for mandatory launch assets or approved asset groups, required event classes, required horizons, sparse or structurally unavailable slices, and minimum sample or evidence-sufficiency policy.
- Existing modules reused: macro surprise normalization, price reaction, asset direction resolution, provider payload/replay contracts.
- Likely permitted files: dataset manifests, evidence schemas, replay fixtures, tests, docs.
- Prohibited scope: live provider activation, provider credentials, golden expectation changes, confidence recalibration.
- Dependencies: IFP-1 closed; certified/captured data may depend on provider readiness but no activation is performed here.
- Implementation outputs: calibration/evaluation manifests, event-time availability rules, versioned predeclared evidence-sufficiency policy, mandatory launch coverage matrix, sparse-slice handling rules, sample metadata by period/asset/event class/horizon.
- Tests and evaluation evidence: leakage tests, manifest validation, predeclared coverage-policy validation, mandatory launch coverage matrix validation, sample-size reports, event-time field assertions.
- Merge blockers: training/evaluation mixing; outcome fields available as inputs; evaluation starting before the versioned predeclared evidence-sufficiency policy exists; sample reports without limitations.
- External data/environment requirements: historical datasets or certified replay exports; credentials only through approved provider gates if used.
- Truthful completion language: IFP-2 complete means evidence sets are valid and separated; it does not mean model performance is acceptable.
- Stop condition: every dataset has period, asset, event class, horizon, sample size, source, input-availability cutoff, train/eval assignment, and a versioned evidence-sufficiency classification before IFP-4 evaluation begins.

### IFP-3 — Contradiction-to-Action Protocol

- Phase ID: IFP-3
- Canonical phase name: Contradiction-to-Action Protocol
- Exact objective: diagnose confidence-floor saturation empirically, including the current 25/33 zero-confidence golden-scenario observation, without hiding it through anchor or penalty changes.
- Problem being closed: production calibration cannot be claimed while floor saturation causes many deterministic scenarios to emit confidence 0 without empirical diagnosis.
- Source requirements: confidence-floor saturation diagnosis; no confidence formula changes merely to improve fixtures; no IFP phase may claim production validation from fixtures alone.
- Existing modules reused: confidence calibration, contradiction matrix, provider reliability weighting, golden-scenario reports.
- Likely permitted files: diagnostic reports, calibration evaluation harnesses, tests, docs.
- Prohibited scope: raising confidence values, weakening penalties, confidence tier changes, adaptive self-modifying confidence engine, golden expectation edits.
- Dependencies: IFP-2 closed.
- Implementation outputs: saturation taxonomy, empirical factor attribution, false-zero/true-zero analysis, recommended future config changes if evidence supports them.
- Tests and evaluation evidence: reproducible diagnostic runs, factor ablation reports as evidence only, separated evaluation confirmation.
- Merge blockers: arithmetic changes in same phase; fixture-only proof; missing explanation of contradiction/provider/price-confirmation contributors.
- External data/environment requirements: historical evaluation data from IFP-2.
- Truthful completion language: IFP-3 complete means saturation is diagnosed and evidence-backed; it does not mean formulas were changed.
- Stop condition: each zero-confidence class has empirical attribution, sample support, limitations, and a documented decision to keep or propose later versioned changes.

### IFP-4 — Market Cleanliness Ranking

- Phase ID: IFP-4
- Canonical phase name: Market Cleanliness Ranking
- Exact objective: evaluate asset-specific direction, event-class reaction, and horizon behavior using separated empirical datasets.
- Problem being closed: deterministic direction logic needs evidence-backed direction validation across assets and event families.
- Source requirements: empirical backtesting and evaluation methodology; asset/event direction validation; no single aggregate accuracy score as universal proof.
- Existing modules reused: asset causality, FX relative-strength, macro surprise normalization, price reaction, economic context.
- Likely permitted files: backtest harnesses, reports, tests, methodology docs.
- Prohibited scope: inferring direction from scenario titles/IDs/categories/expected outputs; asset taxonomy changes; direct financial-advice outputs.
- Dependencies: IFP-3 closed.
- Implementation outputs: per-asset/per-event/horizon evaluation reports, confusion tables, limitations, invalidation cases.
- Tests and evaluation evidence: backtest reproducibility, period split validation, asset/event/horizon sample reporting, leakage checks.
- Merge blockers: universal aggregate score as proof; missing sample size/period/asset/event class/horizon; direction inferred from labels.
- External data/environment requirements: historical market/event data.
- Truthful completion language: IFP-4 complete means evaluated evidence exists by slice; it does not mean production-live validation is complete.
- Stop condition: every launch reasoning asset/event class under evaluation has a documented pass/fail/insufficient-data decision with limitations.

### IFP-5 — News Half-Life / Narrative Decay

- Phase ID: IFP-5
- Canonical phase name: News Half-Life / Narrative Decay
- Exact objective: validate provider/source reliability weighting, freshness decay, contradiction handling, and regime stress behavior under documented evidence versions.
- Problem being closed: reliability, freshness, contradiction, and stress controls exist but require drift review and regime-specific validation.
- Source requirements: provider/source reliability governance and drift review; freshness, contradiction and regime stress testing; evidence-backed versioned reliability.
- Existing modules reused: provider reliability, evidence quality, scheduled ingestion staleness, contradiction matrix, freshness composer.
- Likely permitted files: governance docs, drift reports, stress fixtures/replays, tests.
- Prohibited scope: provider credentials, provider activation, unmanaged direct third-party calls, weakening contradiction penalties.
- Dependencies: IFP-4 closed; RC-H/Provider API Gate evidence may be an additional evidence dependency if live-provider data is used, but it does not change the canonical execution order.
- Implementation outputs: reliability version registry, drift review cadence, regime stress suite, contradiction/freshness outcome reports.
- Tests and evaluation evidence: source drift tests, duplicate-burst tests, stale-evidence tests, contradiction stress scenarios.
- Merge blockers: unversioned provider weights; fixture-only production claim; direct live calls outside Provider API Gate.
- External data/environment requirements: certified provider/replay data for production-like drift; none for deterministic stress fixtures.
- Truthful completion language: IFP-5 complete means governance and stress evidence exist; it does not activate providers.
- Stop condition: every source/reliability class has version, evidence basis, drift owner, freshness rules, and stress-test result.

### IFP-6 — Crowd Pain / Positioning Stress Map

- Phase ID: IFP-6
- Canonical phase name: Crowd Pain / Positioning Stress Map
- Exact objective: validate whether intelligence is safe to surface as trade-readiness context and alert/coaching guidance without fabricating direction or over-alerting.
- Problem being closed: alert, notification, journal, and coaching foundations exist but require intelligence acceptance evidence and throttling validation.
- Source requirements: trade-readiness and alert-throttling validation; behavioral coaching must not fabricate market direction.
- Existing modules reused: notification policy/cooldown/material-change/dedupe, analytics coaching, journal influence, reasoning link summaries.
- Likely permitted files: validation reports, alert policy tests, coaching interpretation tests, docs.
- Prohibited scope: notification provider activation, payment runtime, entitlement behavior, affiliate behavior, financial advice commands.
- Dependencies: IFP-5 closed.
- Implementation outputs: alert threshold evidence, cooldown/dedupe acceptance, trader safety language review, coaching-market-boundary tests.
- Tests and evaluation evidence: alert replay tests, over-trigger/under-trigger reports, coaching boundary tests, user-safety review evidence.
- Merge blockers: coaching invents market direction; alerts bypass cooldown/dedupe; fixture-only trade-readiness claim.
- External data/environment requirements: historical/replay alert streams; no live notification send required.
- Truthful completion language: IFP-6 complete means trade-readiness and alert behavior is validated for product consumption; notification delivery certification remains separate.
- Stop condition: each alert/coaching surface has threshold evidence, suppression proof, safe language, and known limitations.

### IFP-7 — Fragility Score

- Phase ID: IFP-7
- Canonical phase name: Fragility Score
- Exact objective: persist and review deterministic explanation paths so trader-facing interpretation remains readable, attributable, and auditable.
- Problem being closed: deterministic explanation objects exist but must be product-consumable and traceable across reasoning, chart, analytics, coaching, and journal surfaces.
- Source requirements: explanation auditability and decision-path persistence; human readability and trader interpretation review; deterministic explanation preservation.
- Existing modules reused: explanation builder, chart projection builder, reasoning runtime reports, analytics/coaching boundaries, API market-evidence routes.
- Likely permitted files: persistence contracts, audit reports, interpretation review fixtures/tests, docs.
- Prohibited scope: frontend redesign, API behavior changes outside necessary audit persistence, runtime market formula changes.
- Dependencies: IFP-6 closed.
- Implementation outputs: decision-path persistence model, explanation trace IDs, readability review rubric, audited sample outputs.
- Tests and evaluation evidence: trace persistence tests, no-advice/readability tests, chart-to-evidence audit path tests.
- Merge blockers: output lacking deterministic path; unreadable trader interpretation accepted without review; chart intelligence detached from evidence.
- External data/environment requirements: replay/evaluation runs; no live activation required.
- Truthful completion language: IFP-7 complete means explanations are persistent, readable, and auditable; it does not claim live production calibration.
- Stop condition: every product-consumable intelligence surface can trace to inputs, rules/config version, decision path, and limitation text.

### IFP-8 — Production-Data Calibration and Intelligence Acceptance Evidence Gate

- Phase ID: IFP-8
- Canonical phase name: Production-Data Calibration and Intelligence Acceptance Evidence Gate
- Exact objective: close IFP with versioned, reversible production-data calibration evidence, apply any approved evidence-supported configuration calibration through the IFP-1 configuration registry, and run an acceptance gate across all previous IFP outputs.
- Problem being closed: the repository needs a final intelligence acceptance record before RC-K can reconcile full launch closure.
- Source requirements: production-data calibration; intelligence acceptance evidence; production calibration must remain versioned and reversible.
- Existing modules reused: all IFP-1 through IFP-7 outputs, release gates, readiness contracts, provider readiness documents.
- Likely permitted files: acceptance evidence docs, calibration reports, release-gate docs/scripts, tests, the IFP-1 configuration registry, and versioned configuration artifacts only when an evidence-backed configuration change is explicitly approved.
- Prohibited scope: RC-K, RC-I2-CERT completion, RC-J-ENV completion, live provider activation, affiliate/referral/coupon work.
- Dependencies: IFP-7 closed and all preceding IFP evidence closed; certified data/environment evidence available as appropriate.
- Implementation outputs: IFP acceptance report, production-calibration version, evidence-supported configuration application record, held-out evaluation result, previous-configuration recovery proof, rollback plan, residual risk register, mandatory coverage acceptance decision, RC-K handoff checklist.
- Tests and evaluation evidence: full IFP evidence audit, release-gate integration, production-like data calibration reports with limitations, held-out evaluation not used to select the calibration change, recovery/rollback tests for previous configuration versions, and verification that fixture pass-rate improvement alone was not used as justification.
- Merge blockers: fixture-only validation claim; production acceptance based only on fixture/golden-scenario results; missing rollback; missing residual limitations; unresolved insufficient-data status for mandatory launch intelligence coverage; missing predeclared evidence-sufficiency policy; calibration selected and evaluated on the same data; formula or algorithm change treated silently as calibration; RC-K started or marked complete.
- External data/environment requirements: production-like certified data; IFP does not itself complete external provider/payment/infrastructure certifications.
- Truthful completion language: IFP-8 complete means IFP evidence is accepted for RC-K review and any approved configuration calibration is versioned, reversible, supported by IFP-2 through IFP-5 empirical evidence, and evaluated on held-out data; it does not permit silent formula/algorithm changes and RC-K still remains after IFP.
- Stop condition: acceptance gate references all eight phase outputs, records evidence versions, known limitations, held-out evaluation, previous-version recovery, rollback, mandatory coverage resolution, and RC-K handoff without claiming RC-K closure.

## Dependency graph

```text
merged deterministic foundations
        ↓
IFP-1 → IFP-2 → IFP-3 → IFP-4 → IFP-5 → IFP-6 → IFP-7 → IFP-8
        ↓
RC-K final full-repository closure
```

Parallel mandatory blockers that are not completed by IFP:

```text
RC-I2-CERT — Credentialed Payment Provider Sandbox Certification
RC-J-ENV — External Infrastructure and Disaster-Recovery Certification
```

## Program-wide invariants

- No confidence formula may be changed merely to improve fixture pass rates.
- Confidence-floor saturation must be diagnosed empirically, not hidden by raising anchors or weakening penalties.
- Training/calibration and evaluation datasets must be separated.
- No historical outcome may leak into an input that would not have been available at decision time.
- Asset-specific direction must remain explicit and must not be inferred from scenario titles, IDs, categories or expected outputs.
- Provider/source reliability must be evidence-backed and versioned.
- Backtest results must include sample size, period, asset, event class, horizon and known limitations.
- No single aggregate accuracy score may be used as universal proof.
- Intelligence outputs must preserve deterministic explanation and audit paths.
- Behavioral coaching may alter execution guidance but must not fabricate market direction.
- Production data calibration must remain versioned and reversible, and any evidence-supported configuration change must use the IFP-1 registry.
- Live provider activation remains behind the Provider API Gate.
- No IFP phase may claim production validation from fixtures alone.
- Formula or algorithm defects require a separate explicitly approved reasoning-correction dependency rather than being changed inside IFP-8.
- IFP-8 must block unresolved insufficient-data status for mandatory launch intelligence coverage unless the affected slice is explicitly classified as non-required by an approved product/intelligence coverage contract or a documented risk decision removes that slice from the launch intelligence claim without silently changing asset taxonomy.
- Affiliate-1 through Affiliate-9 are not IFP phases.
- Referral commission, coupons, affiliate wallets and withdrawals are not intelligence calibration.
- Affiliate work must not be introduced in an IFP branch.
- Remaining launch work must not use prohibited delay labels.


## IFP-1 active status

IFP-1 is the active approved intelligence capability. IFP-2 follows only after IFP-1 is closed. The full IFP is not complete.
