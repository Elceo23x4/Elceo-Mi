# Reasoning Chart Projection Enrichment (C3-C)

## Purpose

C3-C replaces placeholder chart linkage behavior with deterministic, auditable evidence anchoring and projection enrichment.

This layer does **not** render charts. It produces richer chart-intelligence data for downstream consumers.

## Zone sorting rules

Candidate zones for anchoring are sorted by:

1. `finalStrengthScore` descending
2. `recencyScore` descending
3. `touchCount` descending
4. `zoneId` ascending

`selectAnchorCandidateZones(...)` keeps top 8 sorted zones (or fewer when fewer exist).

## Direction-to-zone compatibility mapping

`getDirectionZoneCompatibility(directionHint, zoneSide)` uses exact static mapping:

- bullish evidence: demand 100, neutral 55, supply 15
- bearish evidence: supply 100, neutral 55, demand 15
- neutral evidence: neutral 85, demand 60, supply 60
- mixed evidence: neutral 85, demand 60, supply 60

No additional inference or adaptation is applied.

## Zone proximity formula

`computeZoneProximityScore(zone, recentPriceRange)`:

- `rangeSpan = max(abs(high - low), 0.0000001)`
- `midpointDistance = abs(zone.midpoint - close)`
- `distanceRatio = midpointDistance / rangeSpan`
- base score: `clampTo100(100 - 100 * distanceRatio)`
- midpoint-inside bonus: if midpoint is inside `[low, high]`, add +10 then clamp

This produces near-zero values for very distant midpoints while remaining deterministic.

## Evidence-to-zone link score formula

`computeEvidenceZoneLinkScore(...)` components:

- `zoneStrength = zone.finalStrengthScore`
- `compatibility = getDirectionZoneCompatibility(...)`
- `proximity = computeZoneProximityScore(...)`

Base formula:

`clampTo100(0.45 * zoneStrength + 0.30 * compatibility + 0.25 * proximity)`

Bonuses:

- +10 when evidence kind is one of `zone_reaction`, `price_action`, `market_structure`
- +5 when `zone.timeframe === targetTimeframe`

Each bonus is clamped after application.

## Anchor threshold and top-3 rule

`anchorEvidenceToZones(...)`:

1. score against all candidate zones
2. keep only scores `>= 55`
3. sort kept links by:
   - linkScore descending
   - zone finalStrengthScore descending
   - zoneId ascending
4. keep top 3

Population behavior:

- `linkedZoneIds`: selected zone ids
- `linkedPriceLevels`: selected midpoints, unique, max 3
- `linkedCandleTimes`: evidence `occurredAt` + zone `lastInteractionAt` values, unique, max 4
- `linkedNotes`: explanation first, then deterministic anchor notes, unique, max 4

Fallback when no zone qualifies:

- `linkedZoneIds = []`
- `linkedPriceLevels = []`
- `linkedCandleTimes = [occurredAt]`
- `linkedNotes = [explanation]`
- top link score remains 0

## Zone confluence summary

`buildZoneConfluenceSummary(enrichedEvidence, zones)` returns:

- `activeAnchoredZoneIds`
- `strongestAnchoredZoneId`
- `strongestAnchoredLinkScore`
- anchored evidence counts by directional bucket

`activeAnchoredZoneIds` are unique in first-appearance order from enriched evidence.

Strongest confluence uses highest evidence top anchor score, with tie break on lexicographically smallest zone id.

## Price-level projection order

`buildEmphasisPriceLevels(...)` constructs levels in strict order:

1. primary invalidation price (if present)
2. secondary invalidation prices (existing order)
3. primary zone midpoints (existing order)
4. linked evidence levels from first 5 evidence items in ranked order
5. recent close
6. recent low
7. recent high

Deduping is exact-value only through stable string conversion (`${number}`), no fuzzy merge.
Final output keeps first 10 unique values.

## Annotation and marker-label rules

`buildChartProjection(...)` uses first up to 8 ranked enriched evidence items:

- annotation ids:
  - anchored: `annotation|{evidenceId}|zone|{firstZoneId}`
  - standalone: `annotation|{evidenceId}|standalone`
- marker labels:
  - anchored: `{label} · anchored`
  - standalone: `{label} · standalone`
- `contradictionMarkerVisible = contradictionScore >= 35`

## Explanation enrichment behavior

Explanation remains deterministic and template-driven, now with confluence-aware additions:

- expanded text appends strongest confluence sentence when available
- supporting reasons (non-neutral bias) prioritize anchored aligned evidence before non-anchored aligned evidence
- contradictory reasons prioritize anchored contradictory evidence before non-anchored contradictory evidence
- `whatWouldChangeState` appends zone-confluence failure sentence when strongest confluence exists

## Conservative fallback behavior

When evidence cannot justify a strong zone link:

- anchor output stays minimal and explicit
- no inferred/fuzzy link is added
- standalone annotation path remains active

## C3-D next scope

C3-D should extend deterministic chart intelligence further without weakening replayability:

- tighter multi-timeframe transition carryover between snapshots
- confluence persistence / decay behavior across runs
- deterministic notification policy consumption of enriched linkage outputs
- downstream chart renderer integration (still out of scope in C3-C)
