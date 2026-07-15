# Historical Market Memory / Analog Engine

IFP-2 adds deterministic historical market memory for persisted IFP-1 event evaluations. It answers which prior event structures were comparable to the information available at the exact point in the query event. It does not produce probabilities, win rates, trade instructions, or predictive calibration.

## Point-in-time feature availability

Analog match features are stored in explicit groups: event context, release/revision context, asset direction, immediate path, confirmation path, follow-through path, related-market context, volatility context, cognition shift, and provenance context. Each group carries an availability state, `availableAt`, source paths, typed values, and limitations.

Availability is derived from persisted IFP-1 timestamps: expectation context from expectation cutoff/issuance, release/revision from observed release evidence, immediate and confirmation paths from their phase ends, follow-through from follow-through end, related-market closure from `relatedEvidenceDecision.decidedAt`, and cognition shift from `postEventCognitionEvaluatedAt`.

## Equal-elapsed-horizon comparison

Retrieval derives `queryCutoffAt` from the persisted evaluation `interpretedAt` and computes elapsed time from the query event `observedAt`. Each historical candidate is sliced at its own observed time plus the same elapsed horizon. A T+3 query cannot use a candidate's T+6 follow-through, related decision, or cognition update.

## Match features versus historical outcome context

`AnalogMatchFeatures` are the only scoring input. `HistoricalOutcomeContext` is stored and returned only after ranking and always carries `usedInSimilarity: false`. Match-feature hashes and historical-outcome-context hashes are calculated separately so outcome-only changes cannot alter similarity, components, or rank.

## Provenance eligibility

Runtime memory indexing accepts only final IFP-1 evaluations with required release, primary reaction, and required related evidence classified as verified or replay. Fixture-only and unverified required evidence are rejected. Optional unverified related evidence is preserved as a limitation and is not positive similarity support.

## Same-event exclusion and deduplication

The event instance key is derived from `eventReleaseId` plus `scheduledReleaseTime`; asset is intentionally excluded so DXY and EUR/USD representations of the same macro release share one event instance. Retrieval excludes the query event instance and returns at most one analog per historical event instance using deterministic tie breaks.

## Component weights and feature coverage

Policy `historical-analog-retrieval-v1` uses component weights: event context 15, surprise/revision 20, asset direction 15, price path 20, related market 10, volatility 10, cognition shift 5, and provenance quality 5. Every match exposes component scores, weights, weighted contributions, coverage, unavailable feature slices, reason codes, and limitations. Poor overlap is labelled and cannot be presented as strong evidence.

## Evidence sufficiency states

Retrieval evidence is classified as `sufficient`, `sparse`, `insufficient_feature_overlap`, `provenance_limited`, or `no_comparable_history`. These are retrieval-sufficiency labels only, not calibration thresholds or predictive confidence.

## Coverage reporting

`AnalogMemoryCoverageReport` summarizes production memory coverage by asset, canonical asset family, indicator category, indicator kind, and query stage (`immediate`, `confirmation`, `follow_through`). It reports unique event instances, verified/replay counts, sparse, structurally unavailable and missing cells, and availability ranges. Golden scenarios are not production historical coverage.

## Limitations and completion language

IFP-2 complete means analog retrieval is deterministic, auditable, leakage-safe, and evidence-qualified. It does not mean ELCEO knows the future direction of an asset, has predictive calibration, or can issue financial advice.

## Implementation surface

The IFP-2 implementation surface is represented by `docs/historical-market-memory-analog-engine.md`, migration `0043_historical_market_memory_analog_engine.sql`, typed contracts including `HistoricalAnalogMemoryRecord`, `AnalogMatchFeatures`, and `HistoricalOutcomeContext`, and retrieval policy `historical-analog-retrieval-v1`.
