# Analytics Core Engine (C4-C)

## Scope
C4-C introduces a deterministic, durable, and replayable analytics backend over canonical journal case history. It computes persisted snapshots for performance totals, setup/direction behavior, execution quality, adherence, and review insights. It intentionally stops before any analytics UI/coaching UI.

## Analytics window semantics
`AnalyticsWindow` is defined by:
- `subjectKind`, `subjectId`
- `assetScope` (`CanonicalAssetSymbol | '*'`)
- `timeframeScope` (`Timeframe | '*'`)
- `lookbackDays`
- `generatedAt`

Window selection defaults:
- `lookbackDays=180`
- `maxCases=200`

## Case selection rules
Only canonical journal cases with:
- status `closed` or `reviewed`
- `closure.closedAt` present

Excludes `draft`, `planned`, `executed`, `partially_closed`, `canceled`.

Filtering:
- asset scope exact match unless `'*'`
- timeframe scope exact match unless `'*'`
- `daysSinceCaseClose <= lookbackDays`

Ordering before truncation:
1. `review.reviewedAt DESC` else `closure.closedAt DESC`
2. `createdAt DESC`
3. `caseId ASC`

## Deterministic formulas
### Performance totals
- Counts by closure outcome (`win/loss/breakeven/mixed`)
- `winRate=winCount/closedCaseCount` (or `null`)
- `lossRate=lossCount/closedCaseCount` (or `null`)
- `expectancyR=avg(non-null rMultiple)` (or `null`)
- `median` uses deterministic sorted median, no percentile interpolation variants.

### Setup patterns
Grouped by `plan.setupType` with:
- sample/outcome counts
- avg `rMultiple` / `pnlPercent`
- `disciplineScore` from quality points:
  - disciplined=100, acceptable=75, weak=40, impulsive=10, null=50
- `performanceScore=clampTo100(base - penalty + disciplineScore*0.10)` where:
  - `base=(winRate*60)+(max(0,expectancyR)*20)+min(10,sampleCount*1.5)`
  - `penalty=max(0,-expectancyR)*12`

### Direction patterns
Grouped by `plan.direction` with:
- sample count, averages, win rate
- `performanceScore=clampTo100((winRate*65)+(max(0,avgRMultiple)*18)+min(10,sampleCount*1.2))`

### Execution quality
Bucket counts + `missingQualityCount` + weighted discipline score using the same quality mapping.

### Plan adherence
Comparable case requires non-null planned+executed entry and planned != 0.
- `entryDeviationPercent=abs(executed-planned)/abs(planned)*100`
- `adherenceScore=clampTo100(100-avgDeviation*8)` or `null` when no comparable samples.

### Behavior analytics
Grouped by `review.behaviorTags`.
Per-case weighted contributions with `caseWeight=1/(1+ageDays/45)`:
- win outcome: +18 win
- loss outcome: +24 loss
- mixed outcome: +10 loss
- impulsive quality: +22 impulsive
- weak quality: +10 impulsive
- disciplined quality: +10 win

Scores:
- `winAssociationScore=clampTo100(sumWin/max(1,sampleCount))`
- `lossAssociationScore=clampTo100(sumLoss/max(1,sampleCount))`
- `impulsiveAssociationScore=clampTo100(sumImpulsive/max(1,sampleCount))`
- `importanceScore=clampTo100(max(win,loss,impulsive)+min(10,sampleCount*1.3))`

## Review insight extraction
- `repeatedMistakes`: top 5 tags where loss/impulsive association >= 35
- `repeatedStrengths`: top 5 tags where win association >= 35
- deterministic note templates with max 6 caution and max 6 confidence notes.

## Persistence and replay semantics
Snapshots persist to `app_analytics_snapshots` (migration `0020_analytics_snapshots.sql`) with flattened numeric fields plus JSON fields (`setup_patterns_json`, `summary_json`, etc.).

Replay helpers deserialize persisted JSON using strict schema validation:
- malformed JSON => deterministic failure
- invalid shape => deterministic failure

Query services read from latest persisted snapshot; they do not silently recompute.

## Runtime boundary
`CanonicalAnalyticsBoundaryService` exposes:
- snapshot generation
- snapshot retrieval (by id/latest/list)
- top setup/behavior pattern queries

## Why this stops before UI/coaching
C4-C establishes canonical backend analytics primitives only. Dashboard rendering, coaching narrative UX, and portfolio analytics remain out-of-scope by design.

## C4-D coaching linkage
C4-D now consumes persisted analytics snapshots as one deterministic input to the coaching core engine. Coaching reads persisted analytics/journal influence snapshots with explicit fallback rules and writes durable coaching snapshots for replay/query use.

## C4-D next
C4-D should layer:
- analytics dashboard read APIs/UI wiring
- coaching workflows consuming persisted snapshots
- admin review screens using replay/query services
- portfolio-level analytics once portfolio domain contracts are frozen

## Portfolio domain linkage (C4-E)
The durable portfolio domain core now provides canonical watchlist/position/action queue state and replay/snapshot query surfaces. Analytics and coaching consumers should read this operational layer for current portfolio context instead of deriving ad-hoc mutable state.
