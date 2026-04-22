# Ingestion Runtime Boundary (Core Batch 2C / C2-D hardening)

## Canonical runtime boundary

Runtime ingestion now flows through `CanonicalWorkerBoundaryService.executeAssetWindow(...)`.
The worker default path (`runIngestionTick`) resolves runtime config and executes this boundary.
This canonical boundary now persists run reports and canonical output event snapshots via the configured ingestion persistence repository.

## Execution modes

`IngestionExecutionMode`:

- `canonical`
- `legacy`
- `shadow`

Default runtime config:

- `mode = canonical`
- `legacyFallbackOnCanonicalFailure = false`
- `strictCanonicalFailure = false`
- `boundaryVersion = c2c.0.0`

## Runtime config loading

`getIngestionRuntimeConfig(env)` reads:

- `INGESTION_RUNTIME_MODE`
- `INGESTION_LEGACY_FALLBACK_ON_CANONICAL_FAILURE`
- `INGESTION_STRICT_CANONICAL_FAILURE`
- `INGESTION_BOUNDARY_VERSION`

Invalid/missing values deterministically fall back to defaults.

## Fallback policy

### canonical mode

- canonical path is executed and active boundary is canonical.
- if canonical fails and fallback enabled, legacy path becomes active with `partial_success` and fallback reason `canonical_failure_legacy_fallback`.
- if canonical fails and no fallback, status is `failed` with no active boundary.

### legacy mode

- legacy runtime adapter executes only legacy provider path.
- active boundary is legacy.
- this mode is compatibility-only.

### shadow mode

- canonical and legacy paths both execute.
- canonical remains active boundary when successful.
- comparison metrics are emitted from dedupeKey overlap.
- if canonical fails and fallback enabled, legacy becomes active with reason `canonical_failure_shadow_legacy_fallback`.

## Run report contract

Each execution emits `IngestionRunReport` with:

- run identity (`runId`, timing, duration)
- mode and active boundary
- status (`success`, `partial_success`, `failed`)
- canonical/legacy/output counts
- fallback metadata
- boundary version
- comparison block (shadow mode when both paths succeed)
- diagnostics summary counts
- provider capability diagnostics

## Comparison logic

`IngestionRunComparison` uses dedupe keys:

- overlap count = intersection(canonicalKeys, legacyKeys)
- canonical-only and legacy-only counts
- union count
- overlap ratio = `roundScore(overlap/union * 100)`
- if union is zero, overlap ratio is 100

## Legacy containment

Legacy execution is isolated in `LegacyRuntimeAdapter` and legacy compatibility worker function (`runLegacyCompatibilityTick`).
It is no longer the default worker runtime path.

## Scope boundary after C2-E

Scheduler orchestration, slot/request identity, and runtime leases are now in scope through the ingestion scheduler layer.
Kafka transport publishing is still out of scope at this stage.
