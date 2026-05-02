# Snapshot Refresh Runtime

## Why this runtime exists
C4-G introduces a canonical backend runtime that orchestrates deterministic regeneration across snapshot domains (`journal_influence`, `analytics`, `coaching`, `portfolio`, `workspace`).

It exists to provide:
- durable refresh run history
- explicit freshness state per domain
- deterministic dependency-aware planning
- replayable run reports for later API/dashboard/admin consumption

This avoids hidden recomputation and preserves auditable runtime behavior.

## Freshness windows
- `journal_influence`: 1440 minutes
- `analytics`: 1440 minutes
- `coaching`: 1440 minutes
- `portfolio`: 240 minutes
- `workspace`: 120 minutes

Freshness states are `fresh`, `stale`, `missing`, `failed`.

## Dependency graph
- `journal_influence -> coaching`
- `analytics -> coaching`
- `coaching -> workspace`
- `portfolio -> workspace`

Reasoning/notification data can affect workspace generation but are not planned as refresh domains in this batch.

## Trigger rules
Base plan domains:
- `manual`: all domains
- `scheduled`: stale/missing domains, then recursive dependent expansion
- `journal_case_changed`: `journal_influence`, `analytics` + dependents
- `journal_case_reviewed`: `journal_influence`, `analytics` + dependents
- `portfolio_changed`: `portfolio` + dependents
- `reasoning_completed`: `workspace` only
- `notification_feedback`: `workspace` only

## Execution order
Final deterministic execution order:
1. `journal_influence`
2. `analytics`
3. `coaching`
4. `portfolio`
5. `workspace`

## Freshness and attention mapping
Attention summary computes:
- counts for `fresh`, `stale`, `missing`, `failed`
- `overallFreshnessState` precedence: `failed > stale > missing > fresh`
- `mostCriticalDomain` precedence by domain severity order:
  1. `workspace`
  2. `portfolio`
  3. `coaching`
  4. `analytics`
  5. `journal_influence`

## Persistence and replay semantics
Durable persistence:
- `app_snapshot_refresh_runs`
- `app_snapshot_freshness`

Replay helpers deserialize persisted JSON with strict schema validation and return:
- run report replay bundle (run report + current freshness set)
- recent run replays
- freshness replay list

Malformed persisted JSON fails deterministically.

## Boundary and query semantics
`CanonicalRefreshBoundaryService` exposes canonical refresh runtime methods for:
- execution (`runSnapshotRefresh`, `runManualFullRefresh`)
- recomputation (`recomputeFreshnessForSubject`)
- query (`get/list runs`, `get/list freshness`, `attention summary`, `domains needing refresh`)

Query methods read persisted data only and never trigger regeneration.

## Why C4-G stops here
This batch intentionally stops before:
- HTTP/API route construction
- dashboard/admin UI integration
- scheduler wiring

Those are follow-up integration layers, not core runtime contracts.

## What C4-H should cover next
- scheduler integration to invoke `scheduled` trigger on cadence
- API endpoints for refresh runs/freshness/attention
- admin inspection tools over replay/query services
- policy knobs for domain-specific trigger filtering and rollout guards


## C4-I ops runtime linkage
Snapshot refresh execution can now be orchestrated by the canonical ops runtime scheduler/service layer with durable ops run history and lease safety.


C4-M6B2A note: related user-facing `.../generate` or refresh mutation routes are now protected by canonical server security decisioning (rate limit, idempotency, replay envelope mapping, and success-path audit logging).
