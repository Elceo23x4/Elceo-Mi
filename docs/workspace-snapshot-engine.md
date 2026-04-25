# Workspace Snapshot Engine (C4-F)

## Purpose
C4-F introduces the canonical workspace operating snapshot backend. It unifies durable signals from portfolio, coaching, analytics, reasoning, and notifications into one deterministic and replayable surface for later dashboard/admin/UI consumers.

This batch is intentionally backend-only. It does not introduce dashboard rendering, admin UI, or any presentation-layer behavior.

## Dependency loading model
Workspace generation consumes explicit dependency loaders:
- portfolio loader (explicit recompute via portfolio snapshot generation)
- coaching loader (latest persisted wildcard `*/*` scope snapshot)
- analytics loader (latest persisted wildcard `*/*` scope snapshot, default lookback 180 days)
- reasoning loader (recent persisted reasoning signals, capped and deterministically ordered)
- notification loader (durable inbox/health/receipt counts)

Dependency status is tracked per source as strict enums:
- `loaded`
- `missing`
- `stale`
- `failed`

Failure policy:
- Any loader failure marks that dependency `failed`.
- Snapshot generation continues with safe default values.
- No single dependency failure aborts full snapshot generation.

## Attention formulas
Deterministic score components:

### Portfolio attention
`invalidated*30 + weakening*12 + criticalActions*25 + nonCriticalOpenActions*8`, clamped to 0..100.

### Coaching attention
Mapped from top focus priority:
- critical => 85
- high => 65
- medium => 45
- low => 20
- no top focus => 0

### Notification attention
`min(30, unread*4) + min(30, degraded*20) + min(40, criticalReceipts*10)`, clamped 0..100.

### Reasoning attention
Highest recent reasoning signal score:
`contradiction*0.60 + (100-confidence)*0.20 + freshnessPenalty*0.20`
where freshness penalty is `100-freshnessScore` when present; otherwise `0`.

### Dependency penalty
- one failed dependency => +10
- two or more failed dependencies => +20

Overall attention score uses max(domain scores) + penalty (capped to 100), then maps:
- >= 80 => `critical`
- >= 60 => `high`
- >= 35 => `medium`
- else => `low`

Health mapping:
- `critical` attention => `critical` health
- `high`/`medium` => `attention_needed`
- `low` => `stable`

## Agenda generation rules
Agenda combines deterministic cross-domain items:
1. open portfolio actions (first-class queue surface)
2. top 3 coaching focus areas
3. thesis-health alerts for invalidated/weakening entries/positions not already represented by open actions
4. notification backlog item when unread >= 3
5. notification delivery health item when degraded targets or critical receipts exist

Ordering:
1. score desc
2. source kind asc
3. headline asc

Deduplication:
- first occurrence wins based on source/link/headline tuple

Caps:
- max 10 agenda items
- max 10 supporting case IDs per agenda item

Deterministic agenda IDs:
`agenda|{sourceKind}|{subjectKind}|{subjectId}|{generatedAt}|{ordinalIndex}`

## Persistence and replay semantics
Workspace snapshots persist to `app_workspace_snapshots` with:
- flattened numeric/state projections
- `agenda_json`
- `dependency_status_json`
- canonical `summary_json`

Replay helpers return:
- raw persisted record
- strict validated snapshot payload

Replay/query methods never recompute upstream domain state and never silently regenerate snapshots.

## Query semantics
Workspace query service provides:
- snapshot by ID
- latest snapshot by subject
- historical list by subject
- current agenda from latest persisted snapshot
- current attention summary from latest persisted snapshot

If no snapshot exists, methods return null/empty values explicitly.

## Why C4-F stops before dashboard UI
C4-F establishes durable deterministic backend state only. UI surfaces are intentionally deferred to preserve:
- strict contract stability
- deterministic replayability
- auditable dependency behavior
- formula control without presentation coupling

## What C4-G should cover next
C4-G should focus on integration and presentation layers over persisted workspace snapshots, including:
- dashboard read APIs and selector endpoints
- admin operational review surfaces
- schedule/cadence orchestration for snapshot generation
- controlled policy hooks for workspace-driven automation
- observability around dependency status drift and attention trends
