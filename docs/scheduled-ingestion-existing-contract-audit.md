# C6-A8A — Scheduled Ingestion Existing Contract Audit + Extension Plan

## 1) Executive summary
This audit confirms the repository already has a canonical scheduled-ingestion foundation spanning shared types/schemas, reasoning runtime services, persistence repositories, internal/admin API routes, and route/runtime tests. The prior C6-A8 failure mode (duplicate symbol exports and incompatible run-record shape additions) is consistent with current repo state: core scheduled-ingestion contracts already exist and are consumed across package boundaries.

C6-A8 proper should **extend existing contracts in place** (or add clearly namespaced adjunct helper contracts) rather than introducing replacement/duplicate scheduled-ingestion primitives.

## 2) Existing scheduled-ingestion architecture

### Shared contract layer
- Canonical scheduled-ingestion type contracts are defined in `packages/types/src/market-evidence-ingestion-schedule.ts` and include status/run-mode/cadence/retry/staleness enums plus policy/run/report payload types.
- App-route request/query type contracts are defined in `packages/types/src/app-api.ts`.

### Shared schema/validator layer
- Scheduled-ingestion validators and query/body parsers live in:
  - `packages/schemas/src/market-evidence-ingestion-schedule.schema.ts`
  - `packages/schemas/src/app-api.schema.ts`
- Dry-run request validation explicitly blocks runtime mode override and provider key injection fields (`runMode`, `production_live`, `providerApiKey`, etc.).

### Reasoning runtime/orchestration layer
- Scheduled ingestion module surface: `services/reasoning/src/scheduled-ingestion/index.ts`.
- Orchestrator service: `services/reasoning/src/scheduled-ingestion/scheduled-ingestion-service.ts`.
- Policy registry helpers: `services/reasoning/src/scheduled-ingestion/schedule-policies.ts`.
- Retry and staleness policy helpers: `retry-policy.ts`, `staleness-policy.ts`.
- Replay/serialization helpers: `replay.ts`, `serialization.ts`.
- Read/query helper: `query-service.ts`.

### Persistence/boundary layer
- Run repository contract + memory/SQL implementations:
  - `services/reasoning/src/persistence/scheduled-ingestion-repository.ts`
  - Backed by `infra/db/schema/0034_market_evidence_scheduled_ingestion_runs.sql`
- Runtime boundary methods are exposed through canonical market-intelligence boundary and consumed by API routes.

### API route layer (internal/admin)
- `GET /api/admin/market-evidence/scheduled-ingestion/policies`
- `GET /api/admin/market-evidence/scheduled-ingestion/runs`
- `GET /api/admin/market-evidence/scheduled-ingestion/replay`
- `POST /api/admin/market-evidence/scheduled-ingestion/dry-run`

These routes already include internal-token + feature-access enforcement and (for dry-run mutation) security decisioning and audit integration.

### Tests/docs layer
- Core reasoning scheduled-ingestion tests: `services/reasoning/src/tests/scheduled-ingestion.test.ts`.
- Route/runtime security + validation coverage: `apps/web/tests/route-runtime.test.ts`.
- Existing docs: `docs/ingestion-scheduler.md`, `docs/scheduled-market-evidence-ingestion.md`, and operational references in broader readiness docs.

## 3) Existing type/schema inventory

### Existing symbol inventory and collision assessment

| Symbol from failed C6-A8 ask | Existing symbol present? | Current location | Current shape summary | Recommendation |
|---|---|---|---|---|
| `ScheduledIngestionJobId` | No exact exported alias | N/A (jobId is `string`) | `jobId` fields are plain strings validated as safe identifiers at API boundaries | **Do not add globally named alias** unless namespaced (e.g., `C6ScheduledIngestionJobId`) and non-breaking |
| `ScheduledIngestionJobFamily` | No | N/A | No job-family enum in shared types | Add only as **new namespaced adjunct type** if needed |
| `ScheduledIngestionExecutionMode` | No exact name; equivalent exists | `packages/types/src/market-evidence-ingestion-schedule.ts` | `ScheduledIngestionRunMode = 'dry_run_fixture' | 'staging_live' | 'production_live'` | **Reuse existing `ScheduledIngestionRunMode`**, do not duplicate |
| `ScheduledIngestionRunStatus` | No exact name; equivalent exists | `packages/types/src/market-evidence-ingestion-schedule.ts` | `ScheduledIngestionJobStatus = pending/running/succeeded/failed/skipped/blocked` | **Reuse existing `ScheduledIngestionJobStatus`**, avoid alias duplication |
| `ScheduledIngestionRunRecord` | Yes | `packages/types/src/market-evidence-ingestion-schedule.ts` | Canonical run record with identity/provider/mode/status/timestamps/request-response/error/retry/staleness/warnings fields | **Must be reused/extended compatibly only** |
| `ScheduledIngestionRunRequest` | No exact name | `packages/types/src/app-api.ts` has `InternalScheduledIngestionDryRunRequest` | Existing request supports `jobId` + optional `startedAt`; validator blocks mode/key injection | Reuse existing request type; add new request types only with distinct names |
| `ScheduledIngestionReplayRequest` | No exact name | `packages/types/src/app-api.ts` has `ScheduledIngestionReplayQuery` | Query requires safe `runId` | Reuse existing query type |
| `ScheduledIngestionDryRunResult` | No exact name | Existing `ScheduledIngestionRunReport` | Report envelope with run + pass + warnings | Reuse existing run report shape |
| `ScheduledIngestionReplayResult` | No exact name | Replay returns `ScheduledIngestionRunRecord \| null` via service/repo | Replay is run lookup by runId | Keep existing replay semantics; add new wrapper types only namespaced |
| `ScheduledIngestionCoverageReport` | No | N/A | No dedicated coverage report contract currently | Safe to add as new namespaced additive type in docs/ops module |

## 4) Existing API/runtime/test inventory details

### Current run record shape
`ScheduledIngestionRunRecord` currently includes:
- identity: `runId`, `jobId`, `providerId`, `capability`, `asset`, `region`
- execution: `runMode`, `status`, `startedAt`, `completedAt`
- provider/persistence results: `requestId`, `responseStatus`, `payloadCount`, `persistedPayloadIds`
- failure/retry: `errorCode`, `errorMessage`, `retryStatus`, `retryCount`, `nextRetryAt`
- freshness: `stalenessStatus`
- diagnostics: `warnings`

### Current dry-run behavior
- Dry-run endpoint and service invoke fixture adapters only.
- `production_live` is blocked with deterministic blocked status.
- `staging_live` is blocked/not enabled.
- Unsupported jobs are persisted as skipped runs.
- Successful dry runs persist run records with payload metadata.

### Current replay behavior
- Replay route/service currently performs run lookup by `runId` and returns persisted run record (or null).
- No alternate replay execution pipeline yet (i.e., no "re-execute run" mode).

### Duplicate prevention behavior
- Persistence uses `run_id` as primary conflict key in SQL (`ON CONFLICT (run_id) DO UPDATE`), preventing duplicate-row fanout for same runId.
- Run IDs are deterministic (`run-${jobId}-${startedAt}`), so repeated same-slot execution updates existing row.

### Freshness/staleness behavior
- Deterministic helper derives `fresh/stale/expired/unknown` from latest observed timestamp + policy thresholds.
- Staleness report builder exists in service and policy thresholds are embedded per job policy.

### Provider/source readiness behavior
- Runtime defaults to fixture-safe execution.
- Live activation remains blocked by default at service/route contract level.
- Request validator explicitly rejects API-key style fields.

## 5) Collision analysis from failed C6-A8 attempt
Primary collision vectors already present in repo architecture:
1. **Duplicate symbol names** where requested contracts attempted to redefine concepts already represented by existing symbols (e.g., run mode/status/run record/report).
2. **Incompatible `ScheduledIngestionRunRecord` shapes**; many runtime, schema, repository, and route surfaces rely on the canonical existing shape.
3. **Export collision cascade** via `packages/types` and `packages/schemas` barrel imports consumed by both reasoning and web layers.
4. **Boundary mismatch risk** if new run/replay request/result wrappers shadow existing app-api request/query contracts.

## 6) Gap analysis against C6-A8 goal

| C6-A8 goal item | Status | Notes |
|---|---|---|
| 1. canonical job registry | **implemented (extend)** | Existing policy registry via `DEFAULT_POLICIES`; extend in place if needed |
| 2. fixture-mode execution | **implemented** | Dry-run fixture adapters wired |
| 3. dry-run execution | **implemented** | Route + service + persistence in place |
| 4. replay execution | **partially implemented** | Lookup replay exists; no re-exec replay workflow |
| 5. duplicate-run prevention | **implemented (basic)** | Deterministic runId + SQL upsert; no explicit lease/lock dedupe layer |
| 6. run status lifecycle | **partially implemented** | Status enums present; runtime mostly emits succeeded/failed/skipped/blocked; limited explicit pending/running transitions |
| 7. evidence freshness/staleness checks | **implemented (extend)** | Deterministic staleness helper/report exists |
| 8. provider/source readiness checks | **partially implemented** | Live blocked/default fixture behavior exists; explicit readiness report contract can be added |
| 9. job result summaries | **implemented (basic)** | `ScheduledIngestionRunReport` exists; richer summaries can be additive |
| 10. operator/admin inspection payloads | **implemented (basic)** | Policies/runs/replay/dry-run routes exist |
| 11. boundary methods | **implemented (extend)** | Boundary methods exist for dry-run/query/replay |
| 12. tests and docs | **partially implemented** | Baseline exists; C6-A8 should add targeted extension tests/docs only |

## 7) Safe implementation plan

## Chosen approach
**Approach D: split C6-A8 into smaller implementation batches**, using **Approach A for core contract reuse** and **Approach C for helper-first additions** where possible.

Why safest:
- Existing cross-package scheduled-ingestion contracts are already in active use.
- Broad contract replacement creates high blast radius.
- Small additive batches isolate risk and avoid export/shape regressions.

### Reuse without renaming
Reuse these existing contracts directly:
- `ScheduledIngestionRunRecord`
- `ScheduledIngestionRunReport`
- `ScheduledIngestionRunMode`
- `ScheduledIngestionJobStatus`
- `InternalScheduledIngestionDryRunRequest`
- `ScheduledIngestionReplayQuery`

### Safe extensions (additive only)
- Add optional fields to `ScheduledIngestionRunRecord` only if strictly necessary and backward compatible.
- Prefer additive helper/result contracts in **new namespaced files** (e.g., `C6ScheduledIngestionCoverageReport`) rather than new global `ScheduledIngestion*` symbols.
- Keep existing route request/query contracts unchanged unless adding optional, validated parameters that do not alter existing behavior.

### Names to avoid
Avoid introducing these exact new top-level names to prevent future confusion/collision:
- `ScheduledIngestionExecutionMode`
- `ScheduledIngestionRunStatus`
- `ScheduledIngestionRunRequest`
- `ScheduledIngestionReplayRequest`
- `ScheduledIngestionDryRunResult`
- `ScheduledIngestionReplayResult`

### Proposed file-change scope for C6-A8 proper (next batch)
1. `services/reasoning/src/scheduled-ingestion/*` (helper-level enhancements first)
2. `services/reasoning/src/runtime/canonical-market-intelligence-boundary.ts` (additive methods only)
3. `packages/types/src/market-evidence-ingestion-schedule.ts` (minimal additive optional fields only if justified)
4. `packages/schemas/src/market-evidence-ingestion-schedule.schema.ts` (validator parity for additive fields)
5. `apps/web/app/api/admin/market-evidence/scheduled-ingestion/*` (only if new read-only inspection paths are required)
6. Tests:
   - `services/reasoning/src/tests/scheduled-ingestion.test.ts`
   - `apps/web/tests/route-runtime.test.ts`

### Circular import / CJS compatibility guardrails
- Keep shared contracts in `packages/types` (no runtime imports from `services/*` back into packages).
- Keep schemas depending only on `@elceo/types` and local validator helpers.
- Preserve current dynamic import strategy in SQL repository (`import('pg')`) for runtime compatibility.
- Avoid introducing ESM-only side-effect modules in scheduled-ingestion core paths.

### Live activation safety
- Maintain explicit `production_live`/`staging_live` blocked pathways unless a separate activation batch explicitly changes gates.
- Keep dry-run request schema key-rejection controls intact.
- Do not add provider API key fields to any scheduled-ingestion request type.

### Suggested C6-A8 execution split
- **C6-A8B:** helper-level replay/coverage/readiness summary modules (no shared contract changes).
- **C6-A8C:** additive optional contract fields + schema updates (if still needed after B).
- **C6-A8D:** route-level admin inspection extensions + tests.
- **C6-A8E:** final docs/readiness consolidation.

## 8) Recommended next batch prompt outline
- “Implement C6-A8B helper-only scheduled-ingestion extension using existing contracts.”
- “Do not create or export new top-level `ScheduledIngestion*` aliases that duplicate existing run mode/status/run record/report contracts.”
- “Add only additive helper modules and tests for replay coverage/readiness summaries.”
- “Keep live providers blocked and do not accept API keys.”
- “Update docs with helper behavior and known limitations.”

## 9) Explicit statement
- No live providers were activated in this batch.
- No API keys or secrets were added.
- No scheduled-ingestion implementation behavior was changed in this batch (documentation-only updates).
- C6-A8 proper must extend existing contracts and avoid duplicate/replacement scheduled-ingestion types.

## C6-A8B completion update (2026-05-15)
- Replay now re-executes fixture/dry-run ingestion using existing scheduled-ingestion contracts and persists a new run record with replay metadata.
- No duplicate ScheduledIngestion* top-level contracts were added.
- Replay remains fixture/dry-run only; live replay modes remain blocked.
- Existing persistence backends (memory + SQL) remain unchanged and continue to support run history.
- No API keys and no live provider calls were added.

- C6-A8C update: admin/internal replay execution is now exposed via POST replay route, with security decision + audit; operator inspection snapshot route is read-only and live activation remains blocked.
