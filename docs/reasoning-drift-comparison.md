# Reasoning Drift Comparison (C3-D)

## Purpose

C3-D adds deterministic cognition drift detection between persisted canonical cognition snapshots.

This layer compares previous vs current reasoning state to produce an auditable, replayable drift report.

## Delta contracts

`CognitionDriftReport` is composed from explicit deterministic sub-deltas:

- `BiasDelta`
- `NumericDelta` (confidence/contradiction/freshness)
- `EvidenceDelta` (topEvidenceIds only)
- `InvalidationDelta`
- `ChartProjectionDelta`
- severity, summary, and key changes

No fuzzy semantic comparison is used.

## Bias delta rules

`buildBiasDelta(previousBias, currentBias)`:

- `changed = previousBias !== currentBias`
- `flip = true` only for bullish→bearish or bearish→bullish
- transitions involving neutral are changes but not flips

## Numeric delta rules

`buildNumericDelta(previous, current)`:

- `absoluteDelta = roundScore(abs(current - previous))`
- direction:
  - `up` when current > previous
  - `down` when current < previous
  - `flat` when equal

## Evidence delta rules

`buildEvidenceDelta(previous, current)` compares only `topEvidenceIds`:

- entered: in current not previous (current order)
- exited: in previous not current (previous order)
- retained: in both (current order)
- reranked: retained ids with changed index (current retained order)
- counts from topEvidenceIds lengths

Full ranked evidence is intentionally out of scope for C3-D.

## Invalidation delta rules

`buildInvalidationDelta(previous, current)`:

- compares primary invalidation price (`null` when missing)
- computes absolute price delta only when both prices exist
- compares risk label exactly

## Chart projection delta rules

`buildChartProjectionDelta(previous, current)`:

- entered/exited annotation ids with deterministic order
- `emphasisLevelChanged` via exact ordered numeric equality
- contradiction marker visibility exact boolean comparison

## Severity formula

Sub-signals:

- `biasFlipCriticality`: 100 for flip, 45 for changed-not-flip, else 0
- confidence/contradiction/freshness magnitudes from `NumericDelta.absoluteDelta`
- invalidation risk-shift magnitudes from explicit symmetric mapping table
- evidence change magnitude: `clampTo100(20*entered + 20*exited + 8*reranked)`
- chart change magnitude:
  - +25 if contradiction visibility changed
  - +min(20, 5*entered annotations)
  - +15 if emphasis levels changed

Composite:

`clampTo100(0.25*bias + 0.15*confidence + 0.15*contradiction + 0.10*freshness + 0.15*invalidationRisk + 0.10*evidence + 0.10*chart)`

Severity mapping:

- `< 10` => `none`
- `10..24.999` => `minor`
- `25..44.999` => `moderate`
- `45..69.999` => `major`
- `>= 70` => `critical`

## Summary and key-change templates

Summary template:

`{asset} {timeframe} drift is {severity}: bias {previousBias}->{currentBias}, confidence {confidenceDirectionText}, contradiction {contradictionDirectionText}, freshness {freshnessDirectionText}.`

Direction text:

- `flat` => `unchanged`
- `up/down` => `{direction} {absoluteDelta}`

Key changes are deterministic ordered checks, capped at 6 entries.
Fallback when no rules trigger:

- `No material cognition drift detected.`

## Persistence and replay semantics

Drift records are stored in `app_cognition_deltas`:

- full report JSON in `drift_json`
- query-friendly fields (`severity`, `summary`, key numeric deltas)
- deterministic id `drift|{previousSnapshotId}|{currentSnapshotId}`

Replay helpers:

- `getDriftReplayBundleById(driftId)`
- `getLatestDriftReplayBundle(asset, timeframe)`

Both deserialize and validate persisted drift JSON; malformed payloads fail deterministically.

## Boundary integration semantics

After cognition snapshot persistence:

1. load prior snapshot strictly before current `evaluatedAt`
2. if prior exists, build drift report (`prior -> current`)
3. persist drift record
4. return drift on boundary output/report

Failure behavior:

- no prior snapshot => `drift = null`
- drift persistence failure after cognition persistence => status downgrades to `partial_success` with explicit drift failure reason

## Why this batch comes before notifications

Notifications require reliable, deterministic change signals.
C3-D provides durable replayable drift primitives so notification policy can consume stable drift semantics later.

## What C3-E should cover next

C3-E should layer deterministic notification policy on top of drift reports:

- trigger conditions based on severity and key deltas
- cooldown/suppression with replay-safe rules
- durable dispatch audit trail using drift ids and reasoning run ids
