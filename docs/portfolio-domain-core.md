# Portfolio Domain Core (C4-E)

## Scope
C4-E adds the canonical backend portfolio operating layer. It is durable, deterministic, and replayable for watchlist state, position records, thesis-health state, and portfolio action queues. No portfolio UI or broker integration is included.

## Canonical models
- `WatchlistEntry`: persistent watch records with status, priority, thesis health, and optional reasoning/journal/drift link IDs.
- `PositionRecord`: persistent proposed/open/reducing/closed/canceled records with structured risk fields and link IDs.
- `PortfolioActionItem`: durable action queue records for operator follow-through.
- `PortfolioRevisionRecord`: append-only entity revision audit log.
- `CanonicalPortfolioSnapshot`: point-in-time aggregate for current operating surface.

## Lifecycle transitions
### Watchlist
- allowed: `watching -> thesis_active | readiness_pending | archived`
- allowed: `readiness_pending -> thesis_active | archived`
- allowed: `thesis_active -> readiness_pending | archived`
- terminal: `archived`

### Position
- allowed: `proposed -> open | canceled`
- allowed: `open -> reducing | closed`
- allowed: `reducing -> closed`
- terminal: `closed`, `canceled`

### Action queue
- allowed: `open -> completed | dismissed`
- terminal: `completed`, `dismissed`

### Thesis health
- allowed: `strong -> stable | weakening | invalidated`
- allowed: `stable -> strong | weakening | invalidated`
- allowed: `weakening -> stable | invalidated`
- `invalidated -> weakening` requires explicit recovery operation flag in this batch.

## Persistence and durability
Migration `0022_portfolio_domain_core.sql` adds:
- `app_portfolio_watchlist_entries`
- `app_portfolio_positions`
- `app_portfolio_action_items`
- `app_portfolio_revisions`
- `app_portfolio_snapshots`

Entity rows are upsert-idempotent by primary ID.
Revisions are append-only (`ON CONFLICT DO NOTHING`).
Snapshots are durable records for replay/query use.

## Replay semantics
- Entity replay returns current record + ordered revisions (`changedAt ASC`, `revisionId ASC`).
- Snapshot replay returns latest persisted snapshot row; replay paths do not silently recompute.
- Malformed JSON fails deterministically via strict deserialization.

## Snapshot semantics
Snapshot counts are deterministic:
- `activeWatchlistCount`: watchlist entries not archived
- `activePositionCount`: positions in `open` or `reducing`
- `weakeningThesisCount`: watchlist + positions with thesis health `weakening`
- `invalidatedThesisCount`: watchlist + positions with thesis health `invalidated`
- `openActionCount`: action queue status `open`
- `criticalActionCount`: open actions with priority `critical`

## Linkage semantics
Explicit linkage helpers write only specified IDs and persist linked revisions:
- watchlist ↔ reasoning/snapshot
- position ↔ journal case
- action ↔ notification decision
- watchlist/position ↔ drift

No implicit cross-service fetches are required.

## Action derivation rules
`derivePortfolioActionCandidates` builds deterministic candidate actions from durable signals:
- fixed headline/rationale templates by action kind
- duplicate suppression by `(kind + linked ids + asset/timeframe)`
- deterministic ordering by priority, then kind, then asset/timeframe
- output is candidate-only (no implicit persistence)

## Runtime boundary
`CanonicalPortfolioBoundaryService` exposes:
- watchlist lifecycle methods
- position lifecycle methods
- action queue lifecycle methods
- derivation/query/snapshot/replay helpers
- linkage helpers
- optional safe summary helpers (`getPortfolioAttentionSummary`, `listCriticalPortfolioActions`)

## What C4-F should cover next
- portfolio analytics snapshots and portfolio performance domain formulas
- portfolio/admin API surfaces for UI consumers
- scheduled generation cadence and operational controls
- broker/execution integration contracts (without breaking deterministic core state semantics)

## Workspace snapshot linkage (C4-F)
The canonical workspace snapshot engine now consumes persisted portfolio/coaching outputs as durable cross-domain operating inputs. Portfolio and coaching query surfaces remain independently authoritative for their domains, while workspace snapshots provide the unified operating-state surface for later dashboard/admin UI integration.
