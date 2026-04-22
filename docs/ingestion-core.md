# Ingestion Core (Core Batch 2A)

## Purpose

The ingestion core is the deterministic canonical-event ingestion layer for ELCEO.
It collects `CanonicalEvent` arrays from provider adapters, validates them, enriches them, deduplicates/merges them, emits diagnostics, and returns sorted canonical output for downstream consumers.

## Collection Order

`CompositeEventIngestionService.collectForAssetWindow(...)` calls adapters in this order:

1. `marketData.getStructuredMarketEvidence(asset, timeframe)`
2. `macroCalendar.getUpcomingEvents(fromIso, toIso)`
3. `macroCalendar.getRecentPublishedEvents(fromIso, toIso)`
4. `news.getRecentNewsEvidence(asset, fromIso, toIso)`
5. `geopolitics.getRecentGeopoliticalEvidence(asset, fromIso, toIso)`
6. `macroContext.getMacroContext(asset, asOf)`

If an adapter is missing, it is skipped.
If an adapter throws, failure is recorded and collection continues.

## Enrichment Order

For each fetched event:

1. Validate with `validateCanonicalEvent` from `@elceo/schemas`
2. Compute effective source reliability score
3. Compute temporal state (`recencyScore`, `freshnessHours`, `stale`)
4. Compute relevance score for `(asset, timeframe, asOf)`
5. Rebuild deterministic dedupe key

Invalid events are dropped and recorded in diagnostics.

## Source Reliability Model

### Category defaults

- `market_data = 92`
- `macro_calendar = 90`
- `macro_context = 88`
- `news = 72`
- `geopolitics = 70`
- `internal = 85`
- `user = 55`

### Provider defaults

- `IMF = 96`
- `OECD = 95`
- `World Bank = 95`
- `FRED = 95`
- official central bank/statistics sources = `95`
- `Finnhub = 82`
- `FinancialModelingPrep/FMP = 80`
- `AlphaVantage = 76`
- `Marketaux = 72`
- `NewsAPI = 68`
- `GDELT = 70`
- investing calendar scrape = `74`
- firecrawl-derived extraction = `64`

### Effective score formula

If `event.sourceReliabilityScore` is valid in `0..100`:

`effective = roundScore(0.6 * providedScore + 0.4 * defaultProviderOrCategoryScore)`

Otherwise:

`effective = defaultProviderOrCategoryScore`

Score is clamped to `0..100`.
Precedence: provider default > category default.

## Recency / Staleness Model

### Scheduled future events

If `status = scheduled` and `occurredAt > asOf`:

- `hoursUntilEvent = max(0, (occurredAt - asOf) in hours)`
- `freshnessHours = 0`
- `stale = false`
- recency uses imminence decay by impact:
  - low: `score = clamp(100 - 8 * hoursUntilEvent)`
  - medium: `score = clamp(100 - 5 * hoursUntilEvent)`
  - high: `score = clamp(100 - 3 * hoursUntilEvent)`
  - critical: `score = clamp(100 - 1.5 * hoursUntilEvent)`

### Historical events

For statuses `live/published/revised/resolved/stale/cancelled` and non-future events:

- `hoursSinceEvent = max(0, (asOf - occurredAt) in hours)`
- `freshnessHours = hoursSinceEvent`
- `recencyScore = clamp(100 - decayRatePerHour * hoursSinceEvent)`
- `stale = hoursSinceEvent > staleThresholdHours`

`detectedAt` is fallback only when `occurredAt` is missing/malformed.

### Decay rates (points/hour)

- market_structure 2.0
- price_action 3.0
- macro_calendar 4.0
- macro_context 1.0
- news 6.0
- geopolitics 3.0
- sentiment 8.0
- volume 5.0
- volatility 5.0
- zone_reaction 2.0
- cross_asset 4.0
- journal_behavior 0.5
- system 12.0

### Stale thresholds (hours)

- market_structure 48
- price_action 24
- macro_calendar 72
- macro_context 168
- news 24
- geopolitics 72
- sentiment 12
- volume 12
- volatility 12
- zone_reaction 48
- cross_asset 48
- journal_behavior 720
- system 24

Boundary rule: stale if strictly greater than threshold (`>`), not `>=`.

## Relevance Formula

`final = clamp(assetLinkage + evidenceKindAlignment + impactContribution + timeframeContribution + recencyContribution + reliabilityContribution)`

Where:

- `assetLinkage` max `35`
  - relatedAssets contains targetAsset -> 35
  - else currency matches target base/quote -> 20
  - else region matches target primaryRegions -> 12
  - else region GLOBAL -> 8
  - else 0
- `evidenceKindAlignment` max `15`
  - deterministic by asset class (fx/index/commodity/crypto tables)
- `impactContribution` max `10`
  - low 2, medium 5, high 8, critical 10
- `timeframeContribution` max `10`
  - none provided 5
  - exact timeframe 10
  - adjacent timeframe 6
  - unrelated 2
- `recencyContribution = round(event.recencyScore * 0.15)` max 15
- `reliabilityContribution = round(effectiveSourceReliability * 0.15)` max 15

Timeframe adjacency:

- M5 <-> M15
- M15 <-> M5/H1
- H1 <-> M15/H4
- H4 <-> H1/D1
- D1 <-> H4

## Dedupe Key Structure

Readable key format:

`sourceCategory|eventKind|regionKey|currencyKey|assetKey|bucketIso|titleSlug`

- `regionKey = uppercase region or GLOBAL`
- `currencyKey = uppercase currency or NA`
- `assetKey = sorted unique relatedAssets joined by +`
- `bucketIso = occurredAt floored in UTC by kind bucket`
- `titleSlug = lowercase/trim/collapse whitespace/remove punctuation/swap spaces to hyphens/limit 80`

Buckets:

- 1h: news, sentiment, system
- 30m: macro_calendar
- 4h: macro_context, geopolitics, cross_asset, market_structure, price_action, zone_reaction, volume, volatility
- 24h: journal_behavior

## Duplicate Merge Precedence

### Primary selection

1. highest effective source reliability
2. then highest impact
3. then newest detectedAt
4. then lexicographically smallest sourceName

### Status precedence

`live > published > revised > scheduled > resolved > stale > cancelled`

### Impact precedence

`critical > high > medium > low`

After merge, recompute source reliability, temporal state, relevance score, and dedupe key.

## Diagnostics Contract

`CompositeIngestionDiagnostics` carries:

- `adapterFailures[]`
- `invalidEvents[]`
- `merges[]`
- `droppedEvents[]`
- `totalFetched`
- `totalValidated`
- `totalMergedGroups`
- `totalOutput`

Dropped reasons include:

- `invalid`
- `duplicate_secondary`
- `adapter_failure`
- `bridge_failure`

## Deterministic Final Sort

Final events are sorted by:

1. relevanceScore descending
2. impact descending
3. recencyScore descending
4. detectedAt descending
5. id ascending

## Out of Scope (Still Not Done)

- scheduler/cron
- Kafka publishing integration
- DLQ behavior
- persistent ingestion storage
- full orchestration wiring

## Core Batch 2B (later)

Core Batch 2B should handle orchestration/scheduling, persistent storage, replay tooling integration, transport publishing, and operational controls layered on this deterministic core.
