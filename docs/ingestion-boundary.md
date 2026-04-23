# Ingestion Boundary (Core Batch 2B)

## Canonical boundary

The active ingestion boundary for new code is:

- `createCanonicalIngestionFacade(...)`
- `CanonicalIngestionFacade.collectAssetWindow(...)`

This boundary returns canonical events and diagnostics and internally delegates to the deterministic core service (`CompositeEventIngestionService`).

## Provider suite composition

`buildCanonicalProviderSuite(env, dependencies?)` composes adapters in deterministic category order:

1. marketData
2. macroCalendar
3. macroContext
4. news
5. geopolitics

Each category is composed through explicit bridge wrappers that produce `CanonicalEvent[]`.

## Config gating

`getIngestionProviderConfig(env)` resolves provider gating using:

- global gate: `INGESTION_CANONICAL_ENABLED`
- category gates: `INGESTION_CATEGORY_<CATEGORY>_ENABLED`
- provider gates: `INGESTION_PROVIDER_<PROVIDER>_ENABLED`
- runtime support flag: `INGESTION_DISABLE_SCRAPE_ADAPTERS`
- required API keys by provider

Deterministic disable reasons:

- `missing_api_key`
- `provider_disabled_by_env`
- `unsupported_in_current_runtime`
- `construction_failed`
- `no_adapter_registered`

## Provider capability diagnostics

The facade extends core ingestion diagnostics with:

- `providerCapabilities[]`
- `activeProviderCount`
- `activeProvidersByCategory`
- `canonicalBoundaryVersion`

This provides explicit ops visibility when providers are disabled or unavailable.

## Legacy bridge wrappers

Legacy/semi-normalized provider interfaces are isolated in bridge wrappers:

- `LegacyMarketEvidenceBridge`
- `LegacyCalendarBridge`
- `LegacyNewsBridge`
- `LegacyGeopoliticsBridge`
- `LegacyMacroContextBridge`

Each wrapper:

1. calls legacy provider contracts,
2. maps through canonical bridge discipline (`normalizeEvent` + `mapInternalNormalizedEventToCanonicalEvent`),
3. validates canonical output,
4. drops malformed bridged records deterministically,
5. exposes bridge drop diagnostics.

Lossy/defaulted fields are explicit in bridge mapping helpers and are recomputed by enrichment in the core ingestion flow.

## Coexistence with legacy ingestion

Legacy ingestion pipelines under `services/ingestion/src/pipelines/*` and `runIngestionTick` remain for compatibility.
They are explicitly non-canonical legacy paths.

Canonical ingestion is now the preferred boundary for new code via facade exports from `services/ingestion/src/index.ts`.

## What remains legacy

Still legacy:

- normalized-event pipelines,
- Kafka publishing path,
- legacy persistence append path,
- old ingestion worker tick orchestration.

## What C2-C should handle

Core Batch C2-C should add:

- scheduler/cron orchestration on top of canonical facade,
- persistence/replay integration for canonical events,
- event publishing transport integration,
- operational replay and run controls.


## Runtime adoption (C2-C)

Worker/runtime execution now defaults to canonical boundary mode via `CanonicalWorkerBoundaryService` and explicit execution modes (`canonical`, `legacy`, `shadow`).
Legacy runtime behavior remains available only through explicit compatibility paths and fallback policy controls.
