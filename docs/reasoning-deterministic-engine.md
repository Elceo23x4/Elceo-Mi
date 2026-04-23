# Deterministic Reasoning Engine (C3-B)

## Scope

C3-B introduces the production deterministic reasoning engine used behind the canonical reasoning boundary. The engine consumes `ReasoningInputFrame` and emits validated `CanonicalCognitionState` deterministically.

## Engine metadata constants

Defined in `services/reasoning/src/engine/constants.ts`:

- `DETERMINISTIC_REASONING_ENGINE_NAME = elceo.deterministic.reasoning`
- `DETERMINISTIC_REASONING_VERSION = c3b.v1`
- `DETERMINISTIC_SCORING_VERSION = c3b.scoring.v1`
- `TOP_EVIDENCE_LIMIT = 5`
- `PRIMARY_ZONE_LIMIT = 3`
- `SECONDARY_ZONE_LIMIT = 5`

## Directional support formulas

Using ranked evidence `finalRankScore`:

- `bullishWeight = sum(score where directionHint=bullish)`
- `bearishWeight = sum(score where directionHint=bearish)`
- `mixedWeight = sum(score where directionHint=mixed)`
- `neutralWeight = sum(score where directionHint=neutral)`

Derived:

- `totalWeight = bullish + bearish + mixed + neutral`
- `comparableDirectionalWeight = bullish + bearish`
- `netDirectionalEdge = bullish - bearish`
- `biasStrengthScore = clampTo100(abs(netDirectionalEdge)/comparableDirectionalWeight*100)` (0 if comparable <= 0)

## Bias selection thresholds

Applied in strict order:

1. `comparableDirectionalWeight < 40 -> neutral`
2. `abs(netDirectionalEdge) < 15 -> neutral`
3. `biasStrengthScore < 12 -> neutral`
4. `netDirectionalEdge > 0 -> bullish`
5. `netDirectionalEdge < 0 -> bearish`
6. else neutral

Bias label mapping:

- neutral + contradiction >= 60 -> `Balanced / conflicted`
- neutral otherwise -> `Neutral / awaiting resolution`
- bullish/bearish with strength >= 60 and confidence >= 70 -> strong
- bullish/bearish with strength >= 35 -> moderate
- otherwise cautious

## Contradiction formulas

Computed components:

1. **narrativeConflict**
   - if `totalWeight <= 0`: 20
   - else `clamp(((mixed + 0.5*neutral)/totalWeight)*100)`
2. **eventConflict**
   - neutral bias: subordinate/dominant directional ratio
   - directional bias: opposingWeight/comparableDirectionalWeight
3. **priceConflict**
   - neutral: `100 - weightedAverage(priceProximity)`
   - directional: `((opposingAvgProximity * oppositionRatio)/100) + max(0, 50 - alignedAvgProximity)`
4. **macroConflict** using kinds `{macro_calendar, macro_context, news, geopolitics, cross_asset}`
   - if no macro total: 15
   - else `(min(macroBullish, macroBearish)+macroMixed)/macroTotal*100`
5. **timeframeConflict** from `input.events` with contribution:
   - no related timeframes -> 20
   - includes target -> 0
   - includes adjacent -> 35
   - otherwise -> 75
   - weighted by `max(event.relevanceScore, 1)`

Then:

- `weightedScore = computeContradictionWeightedScore(...)`
- `regime = mapContradictionRegime(weightedScore)`

## Confidence formulas

Components:

- `sourceIntegrity = weightedAverage(sourceReliabilityScore, by finalRankScore)` default 50
- `eventAlignment`
  - neutral: `100 - biasStrengthScore`
  - directional: `alignedWeight/(bullish+bearish+mixed)*100` (50 fallback)
- `priceAcceptance`
  - neutral: weighted average of all price proximity
  - directional: weighted average aligned evidence (fallback all-evidence average, fallback 50)
- `contradictionPenalty = contradiction.weightedScore`
- `stalenessPenalty = 100 - freshnessScore`

Then:

- `weightedScore = computeConfidenceWeightedScore(...)`

## Freshness derivation

- `lastMaterialUpdateAt = max(events.map(max(occurredAt, detectedAt)))`
- no events => `lastMaterialUpdateAt = asOf`, hours since update = 0
- `hoursSinceLastMaterialUpdate = max(0, asOf - lastMaterialUpdateAt in hours)`
- computed with `computeFreshnessState(timeframe, hours, lastMaterialUpdateAt)`

ISO parsing is strict. Malformed timestamps fail deterministically.

## Invalidation composition rules

Primary severity:

`0.50*contradiction + 0.25*(100-confidence) + 0.25*(100-freshness)`

Bias-specific levels:

- bullish primary at `recentPriceRange.low`
- bearish primary at `recentPriceRange.high`
- neutral primary at `recentPriceRange.close`
- secondary levels follow C3-B formulas and deterministic IDs:
  - `invalidation|primary|asset|timeframe`
  - `invalidation|secondary|asset|timeframe|index`

Shared behavior:

- linkedEvidenceIds = top 3 ranked evidence ids
- linkedZoneIds = first up to 5 unique from top evidence plus top zones
- `riskLabel = mapInvalidationRiskLabel(primarySeverity)`

## Explanation templates

- concise:
  - `{BiasLabel} with {confidenceScore} confidence, {contradictionRegime} contradiction, and {evidenceCount} ranked evidence items.`
- expanded includes bias label, confidence, contradiction score/regime, freshness, primary invalidation, top evidence labels.
- bullet reasons: top 3 evidence labels
- supporting reasons: top 5 aligned explanations (or top 5 overall for neutral)
- contradictory reasons: deterministic opposing/mixed selection by bias
- what would change state includes primary invalidation, contradiction escalation, freshness decay, optional zone-quality degradation

## Chart projection placeholder behavior

Deterministic conservative placeholder output:

- `annotationIds`: top 5 evidence ids
- `markerLabels`: top 5 evidence labels
- `emphasisPriceLevels`: unique primary + secondary invalidation prices
- `contradictionMarkerVisible`: true when contradiction score >= 35

## Deterministic guarantees

- No random scoring or fuzzy NLP in reasoning stage
- No unstable ordering (sorted evidence/zones and explicit tie-breakers)
- Same `ReasoningInputFrame` produces byte-stable cognition JSON
- Output validated before boundary returns/persists

## C3-C next scope

C3-C should focus on:

- richer zone/price linkage across evidence and chart context
- deeper multi-timeframe thesis transitions and regime carryover
- notification decision integration using deterministic cognition snapshots
- stronger chart intelligence bindings beyond placeholders
