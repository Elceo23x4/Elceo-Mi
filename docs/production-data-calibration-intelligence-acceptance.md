# IFP-8 — Production-data calibration and intelligence acceptance

## Purpose and current truth

IFP-8 is an empirical evidence and calibration-governance boundary around the unchanged IFP-1 through IFP-7 services. It is not a reasoning engine, provider activation, or RC-K. The repository contains no adequate certified non-fixture corpus, so the current deterministic state is `blocked_missing_certified_evidence`; fixture and golden runs always have `productionAcceptance = false`. IFP-8 remains active and RC-K remains untouched.

## Repository replay inventory

| Material | Evidence class | Production acceptance use |
| --- | --- | --- |
| launch asset and provider fixtures | synthetic fixture | regression only |
| 33 golden scenarios | golden deterministic fixture | regression only |
| Provider API Gate smoke/replay inputs | captured fixture replay or dry-run | boundary validation only |
| scheduled-ingestion replay | captured fixture replay | operational replay validation only |
| notification/payment replay material | out of intelligence scope | none |
| certified replay | absent | required |
| staging-live capture | absent | required/acceptable when certified |
| production-like certified corpus | absent | required/acceptable |

Unknown material is treated as unverifiable, never promoted. IFP-8 makes no provider network calls.

## Immutable corpus and decision-time boundary

The `intelligence-acceptance-v1` manifest binds dataset identity/version/class, time range, registry version/hash, source IDs, asset/event/horizon coverage, counts, provenance, raw hashes, normalization/outcome/split policies, and all three partition hashes. Only `certified_replay`, `staging_capture`, and `production_like_certified` can satisfy the empirical-class gate.

Each case separates `decisionTimeEvidence` from `evaluationOutcome`. Every runtime source has observed, available, provider/capture, content-hash and qualification fields. Missing `availableAt`, `availableAt` after cutoff, or an injected outcome fails before the production chain or persistence. Outcomes can be attached only after IFP outputs are frozen and persisted.

## Chronological split and single-use holdout

Event instances are fixed chronologically as calibration → embargo → holdout. Membership hashes reject overlap and release-family leakage. The embargo must exceed the maximum outcome horizon, and calibration outcome windows must end before holdout. Candidate selection freezes before the single-use holdout opens. A failed holdout is recorded and cannot mutate the selected candidate; retuning requires a new versioned cycle and uncontaminated tranche.

## Calibration and configuration governance

The ledger records every candidate, including rejection, sequence, parent configuration, changed parameters, rationale and calibration-metrics hash. Immutable configuration snapshots bind all IFP policy versions and parameter hashes. Permitted change classes are `no_change` and explicitly approved parameter calibration. Codex does not approve a candidate. Formula/algorithm findings become blocking `reasoning_correction_required` residual risks and are not repaired in IFP-8.

Version-ID resolution, an exact parameter hash, rollback target, and replay-output hash evidence prove recovery. Tests may use an alternate test-only snapshot; production semantics remain unchanged. Missing recovery evidence blocks acceptance.

## Coverage contract

The mandatory matrix reports every asset × event/indicator class × horizon/stage cell, required evidence families, minimum sample, structural decision and reason. The 12 launch assets remain XAU/USD, eight FX pairs, BTC/USD, Nasdaq 100, S&P 500 and DE30. DXY and VIX are separate diagnostics. Structural unavailability requires an existing approved decision. IFP-2 minimums remain 10 unique comparable events and 5 strong analogs. Any unresolved required cell blocks.

## Diagnostics and invariants

Diagnostics are segmented by asset, event class, horizon/stage, regime and provenance quality. IFP-1 reports alignment/reaction/impulse/follow-through/reversal and insufficiency. IFP-2 reports retrieval sufficiency, counts, stability, orientation and outcome-family dispersion without outcome reranking or probability claims. IFP-3 retains sole invalidation authority. IFP-4 cleanliness, IFP-5 interval-censored decay, IFP-6 direct-positioning qualification, and non-predictive ordinal IFP-7 fragility retain their accepted semantics.

Cross-engine checks reject hidden insufficiency, proxy promotion, expired narrative support, IFP-7 invalidation authority, lineage loss, future evidence, fabricated zero strength, nondeterminism, and financial-advice output.

Every case carries confidence pre/post clamp, components, penalties, completeness, provider qualification, price confirmation, contradiction, FX/macro completeness, coverage effects, reasons and sources. Zero rates are segmented; `unexplainedZeroCount` must be zero. Numerical diagnostics include quantiles, null/zero and exact/near-boundary occupancy. Sensitivity probes diagnose explicit discontinuities but never mutate thresholds.

## Acceptance, persistence, and risks

The evidence-integrity, mandatory-coverage, and empirical-intelligence gates are independent. Leakage, contaminated holdout, wrong lineage, invariant failure, missing coverage, unexplained zero, blocking residual risk, nondeterminism or missing rollback cannot be offset by aggregate results. Immutable memory/SQL repositories are idempotent for identical content and reject identity conflicts; SQL transactions prohibit partial runs.

Residual risks identify scope, severity, evidence, affected cells, classification, resolution, owner and blocking status. Current blocking risk: no certified non-fixture corpus and therefore no empirical per-engine result, candidate discovery, or truthful acceptance. The exact next evidence need is certified cases for every required launch coverage cell with decision-time source timestamps, mechanically reproducible later outcomes, chronological families, and sufficient embargo.

## Approval and RC-K handoff

Truthful completion requires a persisted accepted record backed by qualified held-out evidence, complete coverage, zero correctness violations, explained confidence floors and replayable rollback. Until supplied, machinery acceptance is not empirical acceptance, IFP-8 stays active, and RC-K does not start. An eventual immutable evidence package may be hash-validated by CI; CI fixture success cannot close IFP-8.

## Integrity closure

Production acceptance is exposed only through `IntelligenceAcceptanceService`. The service loads the persisted manifest, independent certification, fixed split, complete configuration, durable holdout lifecycle and typed rollback record. It executes the production IFP service adapter, freezes each case before mechanically finalized outcomes are attached, derives diagnostics and canonical coverage, then saves one linked atomic bundle. The pure final policy is intentionally not exported from the package boundary.

A dataset class is only a claim. Independent certification binds the manifest hash, artifacts, registry, sources, capture provenance, reliability, contamination checks and certification evidence. Relabeling a fixture changes its manifest hash and invalidates the existing certification. No approved complete launch event-class/horizon coverage contract currently exists, so the canonical coverage policy fails closed with `blocked_missing_approved_coverage_contract` rather than accepting a caller-selected subset.

Decision time has one canonical cutoff: the outer case cutoff must exactly equal the production-chain cutoff before IFP-1 is loaded, and the persisted event evaluation must match the same cutoff, asset, event class and assessment stage. Holdout lifecycle state is durable (`selected`, `opened`, `completed`, `failed`), and dataset plus holdout-partition identity is globally single-use across run families.

Rollback evidence is nonempty and case-bound; equality is derived for each case rather than inferred from independently sorted hash sets. Outcomes use `ifp8-outcome-observation-v1` to derive only supported price-path properties from timestamped captured observations. Unsupported labels remain explicitly not evaluable. Every engine receives an independent empirical state, and any required `insufficient_evidence` blocks production acceptance. Confidence anatomy is derived from and hash-bound to the persisted IFP-1 event evaluation rather than supplied by the holdout caller.

Implementation integrity is separated from external empirical prerequisites. Runtime parameter calibration is unsupported by the accepted static engines and therefore fails closed; only an exact `no_change` baseline snapshot can be replayed. Acceptance finalization and the `opened` → `completed` holdout transition share one transaction, while exposed evaluation failures durably transition to `failed`.

External blockers are explicit: no certified non-fixture corpus, no approved complete launch event/horizon coverage contract, no approved policy for the currently unsupported mandatory outcome labels, and no approved empirical performance acceptance policy. These produce `blocked_missing_certified_evidence`, `blocked_missing_approved_coverage_contract`, `blocked_missing_approved_outcome_policy`, and `blocked_missing_approved_empirical_acceptance_policy`; certified data alone cannot close IFP-8.

Rollback execution is configuration-bound. The static accepted engines permit only a canonical `no_change` snapshot; an approved parameter calibration fails with `unsupported_runtime_parameter_calibration` until an architect approves a real runtime configuration mechanism. Rollback records bind dataset, split, run family, configurations, case identities and decision-evidence hashes. Persisted cognition snapshots are canonically deserialized for confidence anatomy; missing post-event cognition remains provisional with null confidence and is never fabricated as zero.

Coverage qualification is projected from actual IFP output sufficiency and effective provenance, never caller family strings. Outcome observations must bind to certification source IDs, capture evidence, raw artifact hashes and verified/replay reliability. Every IFP-8 entity is canonical-hash validated on save and reload. Final bundle persistence, links, and the holdout `completed` transition are atomic.

Certification and split records use `datasetId` as their persisted lookup and link identity; their semantic `certificationId` and `splitId` remain canonical payload identities. Non-holdout preflight resolves certification, split, the canonical static runtime baseline, rollback metadata, and all coverage/outcome/empirical policy authorities before `openHoldout`, so known governance blockers leave the tranche `selected` and unconsumed.

The empirical policy schema supports approved scoped criteria (`gte`, `lte`, `between`, `zero_required`, `monotonic_order_required`, and `no_correctness_violation`) with metric, engine, asset/event/horizon/segment scope, sample minimum, structural treatment and rationale. No production thresholds are populated by IFP-8.
