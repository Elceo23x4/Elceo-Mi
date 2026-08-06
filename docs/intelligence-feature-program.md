# Intelligence Feature Program

Status: **IFP-1 closed; IFP-2 closed; IFP-3 active approved intelligence capability; IFP-4 not started; complete IFP not finished; RC-K not started; RC-I2-CERT and RC-J-ENV remain external blockers**. This document defines the controlled Intelligence Feature Program before any IFP runtime development begins. IFP-0 implements no intelligence feature and does not complete IFP.

## Program purpose

The Intelligence Feature Program moves ELCEO from merged deterministic intelligence foundations to validated, product-consumable, production-calibrated intelligence. It is the evidence, calibration, evaluation, auditability, interpretation, alert-readiness, and production-data validation program that follows the C6-R1 through C6-R9 deterministic reasoning foundations.

IFP is not another C6-R phase, C6-R9H, C6-R10, live provider activation, payment certification, infrastructure certification, affiliate/referral/coupon implementation, general fragility UI redesign, or RC-K. Live provider activation remains behind the Provider API Gate. RC-I2-CERT and RC-J-ENV continue in parallel. RC-K begins only after all eight IFP phases are closed.

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
- Exact objective: freeze pre-event expectation records, bind actual and forecast, previous and revised previous, normalized surprise, primary-asset price reaction, follow-through, related-market response, volatility adjustment, confidence shift, and immutable audit trail into an event interpretation record.
- Problem being closed: ELCEO can form cognition and classify price reactions, but it needs a product-safe event engine proving what was expected before release versus what the release, revision, primary market, related markets, and post-event cognition actually showed.
- Source requirements: pre-event cognition snapshot, scheduled release metadata, actual release payload, forecast, previous, revised previous, normalized macro-surprise output, provider/source provenance, primary and related observation identity, post-event cognition snapshot, and no future-data leakage.
- Existing modules reused: macro surprise normalization, asset causality, asset direction resolution, price reaction, confidence and contradiction cognition snapshots, provider provenance contracts, reasoning persistence.
- Likely permitted files: expectation-reality contracts, event/path engines, repositories, migration 0042, reasoning runtime wiring, IFP documentation/checks, and focused tests.
- Prohibited scope: confidence formula changes, golden scenario changes, asset taxonomy changes, provider activation, frontend behavior, financial-advice language, caller-fabricated directions, unrelated related-market confirmation.
- Dependencies: merged deterministic foundations.
- Implementation outputs: frozen event expectation, event reality, release-alignment delta, price-path assessment, related-market confirmation, confidence/contradiction shift, immutable SQL/memory persistence, idempotent observation hash enforcement, and audit rationale.
- Tests and evaluation evidence: release ID mismatch, pre/post cognition persistence derivation, canonical asset direction differences, hotter inflation bearish equity and bullish USD implication, observation hash identity across horizons, mispricing gate non-fabricability, SQL/memory immutability parity, and unchanged existing reasoning/golden tests.
- Merge blockers: configuration versioning, dataset-only evidence, backtesting-only evidence, alert validation or explanation review presented as a substitute for the approved engine; actual/forecast/revision missing; cognition-only OHLC path marketed as the event engine; related markets inheriting primary direction; pre/post confidence accepted from caller; observation identity not content-bound; direct provider calls; confidence/golden changes.
- External data/environment requirements: certified replay or Provider API Gate data only; no live provider activation in this phase.
- Truthful completion language: IFP-1 complete means event expectations are frozen, event reality is bound and interpreted, and immutable evidence is persisted; it does not mean the full IFP or production calibration is complete.
- Stop condition: every IFP-1 evaluation can prove pre-release expectation state, release/revision reality, canonical direction resolution, primary and related reactions, confidence shift, observation identity, warnings/limitations, and idempotent audit persistence.

### IFP-2 — Historical Market Memory / Analog Engine

- Phase ID: IFP-2
- Canonical phase name: Historical Market Memory / Analog Engine
- Exact objective: build an analog retrieval engine that compares new frozen IFP-1 event expectation-reality records with historical events using event kind, normalized surprise, revision effect, asset direction, price path, related-market response, volatility context, confidence shift, and provenance quality.
- Problem being closed: ELCEO cannot call a new event historically familiar until similar prior expectation-reality paths are stored, retrievable, and leakage-safe.
- Source requirements: closed IFP-1 records, certified replay or Provider API Gate data, mandatory launch assets or approved asset groups, required event classes, required horizons, minimum sample or evidence-sufficiency policy, sparse or structurally unavailable slices, calibration/evaluation separation, mandatory launch coverage matrix, event-time-safe historical inputs, analog evidence/calibration separation, source provenance, sample-size and sparse-slice limitations.
- Existing modules reused: IFP-1 event records, macro surprise normalization, price reaction, asset direction resolution, provider provenance, observation hashing, cognition snapshots.
- Likely permitted files: analog memory contracts, similarity scoring, historical retrieval repositories, evidence manifests, replay fixtures, tests, docs.
- Prohibited scope: changing confidence formulas, changing golden scenarios, live provider activation, using post-event outcome fields as pre-event analog inputs, replacing analog retrieval with manifest lists alone.
- Dependencies: IFP-1 closed; certified/captured data may depend on provider readiness but no activation is performed here.
- Implementation outputs: versioned analog-memory records, similarity features, retrieval API/service, nearest-analog explanations, evidence-sufficiency classifications, source limitations, and immutable analog audit payloads.
- Tests and evaluation evidence: leakage tests, deterministic analog retrieval tests, sample-size and sparse-slice tests, replay provenance tests, cross-asset similarity tests, and unchanged IFP-1/golden tests.
- Merge blockers: analogs selected using future outcome leakage; missing provenance; missing event-time cutoffs; fixture-only production claims; generic dataset indexing presented as historical memory.
- External data/environment requirements: historical market/release data through replay or Provider API Gate boundaries.
- Truthful completion language: IFP-2 complete means analog retrieval is deterministic, auditable, leakage-safe, and evidence-qualified; it does not mean predictive calibration is accepted.
- Stop condition: every analog result exposes source events, similarity components, unavailable slices, event-time cutoff proof, and why the retrieved history is or is not comparable.

### IFP-3 — Contradiction-to-Action Protocol

- Phase ID: IFP-3
- Canonical phase name: Contradiction-to-Action Protocol
- Exact objective: implement protocol states that convert confirmed expectation-reality contradictions into review, wait, invalidate, escalate, or archive decisions without issuing buy/sell/hold advice or modifying confidence formulas.
- Problem being closed: contradictions currently remain explanatory artifacts instead of deterministic operational states with evidence thresholds and safe next-step language.
- Source requirements: IFP-1 outcomes, IFP-2 analog context, frozen invalidation state, confidence/contradiction deltas, related-market conflict state, provenance limitations, and no-advice wording.
- Existing modules reused: IFP-1 delta anatomy, contradiction matrix, invalidation state, cognition snapshots, notification safety language, audit persistence.
- Likely permitted files: protocol contracts, state machine, policy thresholds, repositories if needed, no-advice rationale tests, docs.
- Prohibited scope: direct trade instructions, confidence formula changes, golden scenario changes, provider activation, frontend alert behavior changes unless explicitly scoped later.
- Dependencies: IFP-2 closed.
- Implementation outputs: versioned contradiction-action protocol states, deterministic transition reasons, review prompts, blocked-action limitations, and audit records linking back to IFP-1/IFP-2 evidence.
- Tests and evaluation evidence: state-transition tests for confirmed/rejected/absorbed/reversed/mispricing-candidate evidence, no-advice language tests, invalidation precedence tests, related-market conflict tests.
- Merge blockers: action protocol emits buy/sell/hold; protocol ignores evidence limitations; contradictions without source provenance produce hard actions; formula changes are smuggled into action states.
- External data/environment requirements: none beyond persisted IFP-1/IFP-2 evidence and certified replay fixtures.
- Truthful completion language: IFP-3 complete means contradictions map to auditable review states; it does not authorize trading decisions.
- Stop condition: every protocol output is traceable to evidence, has a safe state label, records limitations, and can be reproduced deterministically from persisted inputs.

### IFP-4 — Market Cleanliness Ranking

- Phase ID: IFP-4
- Canonical phase name: Market Cleanliness Ranking
- Exact objective: rank market cleanliness by measuring how clearly releases, primary reactions, follow-through, related markets, liquidity/session context, and analog history agree or conflict.
- Problem being closed: ELCEO needs to distinguish clean markets from noisy or conflicted markets before downstream fragility and action protocols rely on the signal.
- Source requirements: IFP-1 event/path evaluations, IFP-2 analog distributions, session/liquidity context, volatility context, related-market state, source provenance, insufficient-data markers.
- Existing modules reused: expectation-reality event evaluations, price reaction, observation identity, provider provenance, asset causality, analog memory.
- Likely permitted files: cleanliness scoring policy, ranking service, persistence/reporting, tests, methodology docs.
- Prohibited scope: single aggregate score without component evidence, direct advice, asset taxonomy changes, live provider activation, replacing cleanliness with generic backtest pass rates.
- Dependencies: IFP-3 closed.
- Implementation outputs: versioned cleanliness score with visible components, conflict/ambiguity flags, insufficient-data classification, per-asset/event/horizon reports, and audit rationale.
- Tests and evaluation evidence: component-weight tests, conflict blocking tests, insufficient-context tests, session/liquidity edge tests, replay reproducibility, no-advice tests.
- Merge blockers: cleanliness hides conflicts; missing related-market or volatility evidence is treated as clean; score cannot be traced to components; fixture-only validation is claimed as production evidence.
- External data/environment requirements: certified replay or Provider API Gate observations for market/session evidence.
- Truthful completion language: IFP-4 complete means market cleanliness is ranked with auditable components and limitations; it does not mean markets are tradable.
- Stop condition: every cleanliness output exposes release, primary, follow-through, related, volatility, session, analog, provenance, and insufficiency components.

### IFP-5 — News Half-Life / Narrative Decay

- Phase ID: IFP-5
- Canonical phase name: News Half-Life / Narrative Decay
- Exact objective: calculate how long a release narrative remains active by tracking reaction persistence, follow-through decay, revisions, source updates, related-market fade, analog decay, and cognition confidence shift.
- Problem being closed: ELCEO needs a deterministic decay clock so stale narratives do not remain active merely because the original event was material.
- Source requirements: IFP-1 release/evaluation records, revision versions, post-event observation windows, related-market reactions, IFP-2 analog half-life evidence, post-event cognition snapshots, source provenance.
- Existing modules reused: macro release versioning, price reaction, expectation-reality horizons, cognition snapshots, provider provenance, analog memory.
- Likely permitted files: narrative decay policy, half-life calculator, persistence/reporting, tests, docs.
- Prohibited scope: provider activation, direct news scraping outside Provider API Gate, confidence formula changes, treating source freshness alone as narrative truth.
- Dependencies: IFP-4 closed; RC-H/Provider API Gate evidence may be an additional evidence dependency if live-provider data is used, but it does not change the canonical execution order.
- Implementation outputs: versioned narrative half-life, active/decaying/expired states, revision impact, decay rationale, source limitations, and audit links to event/analog evidence.
- Tests and evaluation evidence: persistence-decay tests, revision-reset/offset tests, stale-source tests, related-market fade tests, insufficient-data tests.
- Merge blockers: half-life inferred without observations; revisions ignored; missing related-market/context treated as persistence; stale source freshness substituted for narrative survival.
- External data/environment requirements: certified replay/provider release updates and post-event observation windows.
- Truthful completion language: IFP-5 complete means narrative decay is measurable and auditable; it does not activate live news providers.
- Stop condition: every narrative state exposes age, event versions, reaction persistence, related-market decay, analog context, confidence shift, and limitation text.

### IFP-6 — Crowd Pain / Positioning Stress Map

- Phase ID: IFP-6
- Canonical phase name: Crowd Pain / Positioning Stress Map
- Exact objective: map crowd pain and positioning stress from expectation-reality failures, whipsaws, absorption, reversal, crowded analog patterns, volatility expansion, and related-market stress.
- Problem being closed: ELCEO needs a market-stress map that explains where participants are likely pressured without fabricating positions or issuing trade instructions.
- Source requirements: IFP-1 deltas, IFP-2 analog crowd-pain patterns, IFP-4 cleanliness, IFP-5 narrative decay, positioning data where certified, volatility context, related-market conflicts, provenance limitations.
- Existing modules reused: expectation-reality path classifications, analog memory, cleanliness score, narrative decay, provider provenance, analytics/coaching safety boundaries.
- Likely permitted files: positioning stress contracts, stress-map service, evidence adapters, tests, docs.
- Prohibited scope: direct advice, notification delivery changes, fabricated positioning when data is missing, live provider activation, payment or entitlement behavior.
- Dependencies: IFP-5 closed.
- Implementation outputs: versioned stress-map states, crowd-pain components, source sufficiency flags, positioning limitations, cross-market stress rationale, and immutable audit records.
- Tests and evaluation evidence: whipsaw/reversal stress tests, missing-positioning insufficient-data tests, conflicting-market tests, no-advice tests, replay reproducibility.
- Merge blockers: missing positioning data treated as known crowding; stress map bypasses cleanliness/decay limitations; outputs imply trade commands; fixture-only production readiness claim.
- External data/environment requirements: certified replay/provider positioning inputs where available; explicit unavailable state otherwise.
- Truthful completion language: IFP-6 complete means positioning stress is mapped with evidence and limitations; it does not prove crowd positioning where sources are absent.
- Stop condition: every stress-map output exposes evidence source, stress component, unavailable data, related-market support/conflict, and safe interpretation language.

### IFP-7 — Fragility Score

- Phase ID: IFP-7
- Canonical phase name: Fragility Score
- Exact objective: compute a final Fragility Score from accumulated contradiction, absorption, reversal, mispricing-candidate, cleanliness, narrative decay, crowd-pain, volatility and provenance evidence while preserving component visibility.
- Problem being closed: ELCEO needs a single evidence-qualified fragility assessment that remains explainable rather than hiding uncertainty inside an opaque score.
- Source requirements: IFP-1 through IFP-6 outputs, immutable audit references, component limitations, confidence/contradiction shifts, volatility context, source provenance, no-advice rationale.
- Existing modules reused: expectation-reality delta anatomy, analog memory, contradiction protocol, cleanliness ranking, narrative half-life, crowd-pain map, explanation builder.
- Likely permitted files: fragility policy, scoring service, persistence/reporting, explanation tests, docs.
- Prohibited scope: opaque aggregate score, unscoped UI redesign, direct advice, confidence formula changes, replacing missing components with generic defaults.
- Dependencies: IFP-6 closed.
- Implementation outputs: versioned fragility score, component ledger, severity thresholds, limitations, explanation/audit payload, and downstream acceptance evidence for IFP-8.
- Tests and evaluation evidence: component visibility tests, missing-data severity tests, no-advice tests, deterministic replay, trace-to-source tests, threshold boundary tests.
- Merge blockers: score cannot be decomposed; missing components silently default; conflicting evidence hidden; direct trade language appears; score is marketed as predictive certainty.
- External data/environment requirements: persisted IFP evidence and certified replay/provider data referenced by upstream phases.
- Truthful completion language: IFP-7 complete means fragility is scored, decomposed, and auditable; it does not mean production calibration is accepted.
- Stop condition: every fragility output can trace to all contributing phase outputs, component weights, severity boundary, missing-data treatment, and limitation rationale.

### IFP-8 — Production-Data Calibration and Intelligence Acceptance Evidence Gate

- Phase ID: IFP-8
- Canonical phase name: Production-Data Calibration and Intelligence Acceptance Evidence Gate
- Exact objective: close IFP with versioned, reversible production-data calibration evidence, apply any approved evidence-supported calibration through a cross-cutting configuration/version record, and run an acceptance gate across all previous IFP outputs.
- Problem being closed: the repository needs a final intelligence acceptance record before RC-K can reconcile full launch closure.
- Source requirements: production-data calibration; intelligence acceptance evidence; production calibration must remain versioned and reversible.
- Existing modules reused: all IFP-1 through IFP-7 outputs, release gates, readiness contracts, provider readiness documents.
- Likely permitted files: acceptance evidence docs, calibration reports, release-gate docs/scripts, tests, cross-cutting configuration/version records, and versioned configuration artifacts only when an evidence-backed configuration change is explicitly approved.
- Prohibited scope: RC-K, RC-I2-CERT completion, RC-J-ENV completion, live provider activation, affiliate/referral/coupon work.
- Dependencies: IFP-7 closed and all preceding IFP evidence closed; certified data/environment evidence available as appropriate.
- Implementation outputs: IFP acceptance report, production-calibration version, evidence-supported configuration application record, held-out evaluation result, previous-configuration recovery proof, rollback plan, residual risk register, mandatory coverage acceptance decision, RC-K handoff checklist.
- Tests and evaluation evidence: full IFP evidence audit, release-gate integration, production-like data calibration reports with limitations, held-out evaluation not used to select the calibration change, recovery/rollback tests for previous configuration versions, and verification that fixture pass-rate improvement alone was not used as justification.
- Merge blockers: fixture-only validation claim; production acceptance based only on fixture/golden-scenario results; missing rollback; missing residual limitations; unresolved insufficient-data status for mandatory launch intelligence coverage; missing predeclared evidence-sufficiency policy; calibration selected and evaluated on the same data; formula or algorithm change treated silently as calibration; RC-K started or marked complete.
- External data/environment requirements: production-like certified data; IFP does not itself complete external provider/payment/infrastructure certifications.
- Truthful completion language: IFP-8 complete means IFP evidence is accepted for RC-K review and any approved configuration calibration is versioned, reversible, supported by IFP-2 through IFP-5 empirical evidence, and evaluated on held-out data; it does not permit silent formula/algorithm changes and RC-K still remains after IFP.
- Stop condition: acceptance gate references all eight phase outputs, records evidence versions, known limitations, held-out evaluation, previous-version recovery, rollback, mandatory coverage resolution, and RC-K handoff without claiming RC-K closure.

## IFP-1 product-contract requirements

IFP-1 requires pre-event expectation; actual and forecast; previous and revised previous; normalized surprise; primary-asset price reaction; follow-through; related-market response; volatility adjustment; confidence shift; immutable audit trail. Cognition-path OHLC assessment may exist only as an internal component, not the complete event engine.

IFP-1 and IFP-2 are closed. IFP-3 is active until its PR is accepted and merged. IFP-4 has not started. The full IFP is not complete. Configuration versioning, confidence-floor diagnosis, auditability and empirical validation are cross-cutting requirements; they do not replace the seven approved engines.

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


## Intelligence feature program status

IFP-1 and IFP-2 are closed. IFP-3 is active until its PR is accepted and merged. IFP-4 has not started. The complete IFP is unfinished, and RC-K has not started. Configuration versioning, confidence-floor diagnosis, auditability and empirical validation are cross-cutting requirements; they do not replace the seven approved engines.

Note: IFP retains a cross-cutting requirement to diagnose confidence-floor saturation empirically; it does not mean formulas were changed.
