# Reasoning Input Boundary (C3-A)

## Purpose

C3-A introduces a durable canonical intake boundary from persisted ingestion artifacts into reasoning execution.

This batch intentionally stops at:
- deterministic input assembly,
- evidence projection,
- reasoning execution boundary,
- cognition snapshot persistence,
- replay helpers.

It does **not** yet implement full contradiction/confidence sophistication upgrades or notification delivery.

## Source selection rules

`ReasoningInputSourceSelector.selectReasoningInputSource(...)` reads persisted ingestion storage only.

Selection:
1. If `sourceIngestionRunId` is supplied:
   - run must exist,
   - run `asset/timeframe` must match requested window,
   - run status must be `success` or `partial_success`,
   - run active boundary must be `canonical` or `legacy`.
2. If not supplied:
   - list recent runs for asset/timeframe,
   - keep only usable statuses/boundaries,
   - sort by `endedAt DESC`, then `createdAt DESC`, then `runId ASC`,
   - choose first.

Snapshot loading:
- if `outputEventCount > 0` and no snapshots: deterministic failure,
- if `outputEventCount = 0` and snapshots empty: allowed,
- persisted snapshots are deserialized and validated as canonical events.

Error codes:
- `missing_ingestion_run`
- `unusable_ingestion_run`
- `missing_event_snapshots`
- `corrupt_event_snapshot`
- `asset_timeframe_mismatch`

## Market context loading rules

`ReasoningMarketContextLoader.load(...)` requires:
- `latestPrice`
- `recentPriceRange { high, low, close }`

Rules:
- marketData adapter must exist,
- latest price must be finite,
- range fields must be finite,
- range high must be >= low.

Error codes:
- `missing_market_data_adapter`
- `missing_latest_price`
- `missing_recent_price_range`
- `invalid_market_context`

## Optional providers and fallback policy

### Zones

`ReasoningZoneInputProvider` is optional.
Default is `EmptyReasoningZoneInputProvider` returning `[]`.

If a custom provider throws or returns invalid zone payload:
- reasoning assembly does **not** fail,
- warning is added,
- zones fallback to `[]`.

### Journal influence

`ReasoningJournalInfluenceProvider` is optional.
Default is `DisabledJournalInfluenceProvider` returning:

```ts
{ enabled: false, influenceFlag: 'none', linkedEntryIds: [] }
```

If provider throws or returns invalid shape:
- reasoning assembly does **not** fail,
- warning is added,
- disabled default is used.

## Prior cognition loading and corruption policy

During assembly, latest prior snapshot is loaded for the same asset/timeframe where `evaluatedAt < asOf`.

- none found => `priorCognition = null`
- found => deserialize and validate canonical cognition
- malformed/invalid stored cognition => deterministic failure (`corrupt_prior_cognition_snapshot`)

Corrupt prior cognition is not silently ignored in C3-A.

## Evidence projection formulas

`projectCanonicalEventToEvidenceItem(...)` implements deterministic formulas:

### Impact mapping
- low => 25
- medium => 55
- high => 80
- critical => 95

### Confirmation score
`clamp((min(confirmationCount, 5) / 5) * 100)`

### Direction hint
Tag-set only (lowercase exact matching), no NLP:
- bullish tags: bullish, hawkish, risk_on, supportive, breakout_up, upside
- bearish tags: bearish, dovish, risk_off, weakening, breakdown_down, downside
- neutral tags: neutral, balanced, range

Rules:
1. bullish present and bearish absent => bullish
2. bearish present and bullish absent => bearish
3. neutral present and bullish absent and bearish absent => neutral
4. else => mixed

### Price proximity score
- eventKind in `{market_structure, price_action, zone_reaction}` and relatedAssets includes target => 80
- else relatedAssets includes target => 65
- else currency matches target base/quote => 50
- else region GLOBAL => 40
- else region matches target primary region => 50
- else => 20

### Confidence contribution
`clamp(0.35*relevance + 0.20*impact + 0.15*sourceReliability + 0.15*recency + 0.15*confirmation)`

### Contradiction contribution
1. direction mixed => 70
2. no prior cognition => 25
3. prior bias neutral => 25
4. direction neutral => 20
5. direction opposes prior bullish/bearish => 85
6. direction matches prior bias => 10
7. else => 25

### Final rank score
`clamp(0.30*relevance + 0.20*impact + 0.15*recency + 0.15*sourceReliability + 0.10*confirmation + 0.10*priceProximity)`

### Linked fields (C3-A conservative)
- linkedZoneIds = []
- linkedPriceLevels = []
- linkedCandleTimes = []
- linkedNotes = [event.normalizedNarrative]

### Evidence identity
`evidenceId = "evidence|" + event.id`

## Ranked evidence sorting

`buildRankedEvidenceCandidates(...)` sorts by:
1. `finalRankScore DESC`
2. `impactScore DESC`
3. `recencyScore DESC`
4. `sourceReliabilityScore DESC`
5. `evidenceId ASC`

No in-place mutation of source events.

## Reasoning input assembly contract

`assembleReasoningInput(...)` executes in strict order:
1. source selection
2. market context loading
3. prior cognition loading
4. zone loading (warning fallback)
5. journal loading (warning fallback)
6. evidence projection + ranking
7. frame assembly + validation

Returns `ReasoningInputAssemblyResult`:
- `input`
- `sourceRunId`
- `sourceRequestKey`
- `priorSnapshotId`
- `warnings`
- `selectedEventCount`
- `projectedEvidenceCount`
- `zoneCount`

## Durable persistence model

Migration `0009_reasoning_snapshots.sql` adds:
- `app_reasoning_runs`
- `app_cognition_snapshots`

Reasoning runs persist metadata, source linkage, counts, warnings, and failure reason.
Cognition snapshots persist full canonical JSON plus query-friendly top-level fields.

## Runtime boundary and report

`CanonicalReasoningBoundaryService.executeAssetWindow(...)` order:
1. start timing
2. assemble input
3. invoke engine
4. validate cognition output
5. persist snapshot (if valid cognition)
6. persist run record
7. return cognition + report + assembly

`ReasoningRunReport` is durable and explicit.

Failure policy:
- assembly failure => failed run, no cognition
- engine failure => failed run, no cognition
- invalid cognition => failed run, no cognition
- snapshot persistence failure after valid cognition => `partial_success`, cognition returned in memory, failure reason explicit

## Replay semantics

Replay helpers:
- `getCognitionReplayBundleByReasoningRunId(...)`
- `getLatestCognitionReplayBundle(...)`

Both load persisted run + persisted cognition JSON, then validate cognition on deserialize.
Malformed payload fails deterministically.

## Why C3-A stops here

C3-A establishes operational intake and durability first.
Without this boundary, advanced reasoning logic has no stable replay/audit substrate.

## C3-B default engine adoption

From C3-B onward, `createCanonicalReasoningBoundaryService(...)` defaults to `DeterministicReasoningEngine` when no engine is injected.
The default engine is deterministic, replayable, and emits fully-populated canonical cognition anatomy (bias/confidence/contradiction/freshness/invalidation/explanation/chart placeholders) using frozen C3-B formulas.

## C3-D drift persistence integration

From C3-D onward, successful reasoning executions can persist deterministic cognition drift reports by comparing:

- latest prior persisted snapshot for same asset/timeframe (`evaluatedAt < current`), and
- current persisted snapshot.

Drift persistence is additive:

- no prior snapshot => drift is null,
- prior snapshot present => deterministic drift report is built/persisted,
- drift persistence failure after cognition snapshot persistence => run may downgrade to `partial_success` with explicit drift failure reason.

## What C3-B should cover next

C3-B should focus on:
- richer evidence-to-price/zone linkage,
- deeper contradiction/confidence anatomy enrichment,
- advanced multi-timeframe reasoning policies,
- downstream notification decision integration using durable snapshots.

## C4-A journal domain availability note

From Core Batch C4-A onward, a durable canonical journal case domain exists in application-state.
Reasoning input currently remains conservative and does not automatically ingest journal lifecycle history.
Future batches can add explicit journal influence policies using the new replayable/queryable journal boundary without coupling reasoning execution to journal storage internals.
