# Journal Influence Engine (C4-B)

## Purpose

C4-B turns durable journal case history into deterministic influence signals usable by reasoning input assembly.
The engine is backend-only and uses only canonical journal records (`closed`/`reviewed` with durable timestamps).

## Case selection rules

Input dimensions:
- subjectKind + subjectId
- assetScope (`*` or exact)
- timeframeScope (`*` or exact)
- asOfIso
- maxCases (default 30)
- lookbackDays (default 180)

Eligibility rules:
1. status must be `closed` or `reviewed`
2. case must have `closedAt` or `reviewedAt`
3. case anchor timestamp is `reviewedAt ?? closedAt`
4. anchor must be within lookback window

Fallback order when exact scope is sparse:
1. exact asset + exact timeframe
2. exact asset + wildcard timeframe
3. wildcard asset + exact timeframe
4. wildcard asset + wildcard timeframe

Deterministic sort before truncation:
1. `reviewedAt DESC` if present, otherwise `closedAt DESC`
2. `createdAt DESC`
3. `caseId ASC`

## Recency weighting formula

For each selected case:

- `ageDays = (asOfIso - (reviewedAt ?? closedAt)) / 24h`
- `recencyWeight = 1 / (1 + ageDays / 30)`
- rounded to 4 decimals for deterministic replay assertions

Weight bounds are validated at runtime: `0 < recencyWeight <= 1`.

## Aggregation formulas

### Setup patterns

Grouped by `setupType`:
- counts by outcome (`win/loss/breakeven/mixed`)
- averages (`avgRMultiple`, `avgPnlPercent`)
- execution quality breakdown

Formula:

- `winRate = winCount / sampleCount`
- `lossRate = lossCount / sampleCount`
- `qualityPenalty = weakCount*6 + impulsiveCount*10`
- `base = winRate*60 + max(0, avgRMultiple ?? 0)*10 - lossRate*35`
- `influenceScore = clampTo100(base - qualityPenalty + min(15, sampleCount*1.5))`

### Direction patterns

Grouped by `direction`:
- sample count
- averages
- win rate

Formula:

- `base = winRate*70 + max(0, avgRMultiple ?? 0)*12`
- `influenceScore = clampTo100(base + min(10, sampleCount*1.2))`

### Behavior patterns

Grouped from review `behaviorTags` across selected cases.

Per case/tag contributions (each multiplied by `recencyWeight`):
- loss: `+22 negative`
- mixed: `+10 negative`
- impulsive execution: `+20 negative`
- weak execution: `+10 negative`
- win: `+16 positive`
- disciplined execution: `+14 positive`

Then:
- `negativeAssociationScore = clampTo100(sumNegative / max(1, sampleCount))`
- `positiveAssociationScore = clampTo100(sumPositive / max(1, sampleCount))`
- `influenceScore = clampTo100(max(negativeAssociationScore, positiveAssociationScore))`

## Repeated mistakes / strengths

Repeated mistakes:
- behavior tags with `negativeAssociationScore >= 35`
- ordered by negative score desc, sampleCount desc, tag asc
- capped to 5

Repeated strengths:
- behavior tags with `positiveAssociationScore >= 35`
- ordered by positive score desc, sampleCount desc, tag asc
- capped to 5

## Deterministic notes

Caution templates:
- `Repeated mistake detected: {behaviorTag}.`
- `Setup underperformance detected for {setupType}.`
- `Execution quality weakness detected in recent history.`

Confidence templates:
- `Repeated strength detected: {behaviorTag}.`
- `Setup strength detected for {setupType}.`
- `Disciplined execution strength detected in recent history.`

## Persistence and replay semantics

Snapshots persist in `app_journal_influence_snapshots` with:
- scope columns (`subject_kind`, `subject_id`, `asset_scope`, `timeframe_scope`)
- deterministic ordering columns (`generated_at`, `snapshot_id`)
- canonical payload (`summary_json`)

Replay and serialization helpers:
- strict deserialize validation
- malformed JSON errors deterministically return `malformed_json`/invalid-contract errors
- replay surfaces never recompute aggregates

## Reasoning input adoption path

Reasoning input now accepts structured journal influence payloads:
- summary + linked case ids
- influence flag derived from structured scores when needed

Adoption behavior:
- provider failures are warning-only (`journal_provider_failure:*`)
- reasoning input assembly remains non-fatal and falls back to disabled influence state

## C4-C next scope

C4-C should focus on:
- operational API wiring for influence query surfaces
- background snapshot cadence policy (if required)
- tighter historical diff/replay comparison tools for influence drift
- guardrails around overfitting signals across thin sample sets
