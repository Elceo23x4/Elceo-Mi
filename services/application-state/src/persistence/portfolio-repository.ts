import type { CanonicalAssetSymbol, PortfolioEntityKind, ThesisHealth, Timeframe } from '@elceo/types';
import { queryDb } from '../db/client';
import type {
  PersistedPortfolioActionItemRecord,
  PersistedPortfolioRevisionRecord,
  PersistedPortfolioSnapshotRecord,
  PersistedPositionRecord,
  PersistedWatchlistEntryRecord,
  PortfolioEntityListQuery,
  PortfolioRepository
} from './contracts';

function limitFrom(limit?: number): number {
  return Math.max(1, Math.min(500, limit ?? 50));
}

function byUpdatedAtDesc<T extends { updatedAt: string } & Record<string, unknown>>(idField: keyof T) {
  return (left: T, right: T): number => Date.parse(right.updatedAt) - Date.parse(left.updatedAt) || String(left[idField]).localeCompare(String(right[idField]));
}

function byRevisionAsc(left: PersistedPortfolioRevisionRecord, right: PersistedPortfolioRevisionRecord): number {
  return Date.parse(left.changedAt) - Date.parse(right.changedAt) || left.revisionId.localeCompare(right.revisionId);
}

function byGeneratedDesc(left: PersistedPortfolioSnapshotRecord, right: PersistedPortfolioSnapshotRecord): number {
  return Date.parse(right.generatedAt) - Date.parse(left.generatedAt) || left.snapshotId.localeCompare(right.snapshotId);
}

function filterEntity<T extends { subjectKind: 'user' | 'workspace' | 'ops'; subjectId: string; asset?: CanonicalAssetSymbol; timeframe?: Timeframe; status?: string; thesisHealth?: ThesisHealth }>(
  rows: T[],
  query: PortfolioEntityListQuery
): T[] {
  let next = rows;
  if (query.subjectKind) next = next.filter((row) => row.subjectKind === query.subjectKind);
  if (query.subjectId) next = next.filter((row) => row.subjectId === query.subjectId);
  if (query.asset) next = next.filter((row) => row.asset === query.asset);
  if (query.timeframe) next = next.filter((row) => row.timeframe === query.timeframe);
  if (query.status) next = next.filter((row) => row.status === query.status);
  if (query.thesisHealth) next = next.filter((row) => row.thesisHealth === query.thesisHealth);
  return next;
}

export class MemoryPortfolioRepository implements PortfolioRepository {
  private readonly watchlist = new Map<string, PersistedWatchlistEntryRecord>();
  private readonly positions = new Map<string, PersistedPositionRecord>();
  private readonly actions = new Map<string, PersistedPortfolioActionItemRecord>();
  private readonly revisions = new Map<string, PersistedPortfolioRevisionRecord>();
  private readonly snapshots = new Map<string, PersistedPortfolioSnapshotRecord>();

  async saveWatchlistEntry(record: PersistedWatchlistEntryRecord): Promise<void> {
    this.watchlist.set(record.entryId, record);
  }

  async getWatchlistEntryForSubject(subjectKind: PersistedWatchlistEntryRecord['subjectKind'], subjectId: string, entryId: string): Promise<PersistedWatchlistEntryRecord | null> {
    const row = this.watchlist.get(entryId); return row?.subjectKind === subjectKind && row.subjectId === subjectId ? row : null;
  }

  async listWatchlistEntries(query: PortfolioEntityListQuery): Promise<PersistedWatchlistEntryRecord[]> {
    return filterEntity([...this.watchlist.values()], query).sort(byUpdatedAtDesc<PersistedWatchlistEntryRecord>('entryId')).slice(0, limitFrom(query.limit));
  }

  async savePosition(record: PersistedPositionRecord): Promise<void> {
    this.positions.set(record.positionId, record);
  }

  async getPositionForSubject(subjectKind: PersistedPositionRecord['subjectKind'], subjectId: string, positionId: string): Promise<PersistedPositionRecord | null> {
    const row = this.positions.get(positionId); return row?.subjectKind === subjectKind && row.subjectId === subjectId ? row : null;
  }

  async listPositions(query: PortfolioEntityListQuery): Promise<PersistedPositionRecord[]> {
    return filterEntity([...this.positions.values()], query).sort(byUpdatedAtDesc<PersistedPositionRecord>('positionId')).slice(0, limitFrom(query.limit));
  }

  async saveActionItem(record: PersistedPortfolioActionItemRecord): Promise<void> {
    this.actions.set(record.actionId, record);
  }

  async getActionItemForSubject(subjectKind: PersistedPortfolioActionItemRecord['subjectKind'], subjectId: string, actionId: string): Promise<PersistedPortfolioActionItemRecord | null> {
    const row = this.actions.get(actionId); return row?.subjectKind === subjectKind && row.subjectId === subjectId ? row : null;
  }

  async listActionItems(query: PortfolioEntityListQuery): Promise<PersistedPortfolioActionItemRecord[]> {
    const rows = [...this.actions.values()];
    let next = rows;
    if (query.subjectKind) next = next.filter((row) => row.subjectKind === query.subjectKind);
    if (query.subjectId) next = next.filter((row) => row.subjectId === query.subjectId);
    if (query.asset) next = next.filter((row) => row.asset === query.asset);
    if (query.timeframe) next = next.filter((row) => row.timeframe === query.timeframe);
    if (query.status) next = next.filter((row) => row.status === query.status);
    next.sort(byUpdatedAtDesc<PersistedPortfolioActionItemRecord>('actionId'));
    return next.slice(0, limitFrom(query.limit));
  }

  async saveRevision(record: PersistedPortfolioRevisionRecord): Promise<void> {
    if (this.revisions.has(record.revisionId)) return;
    this.revisions.set(record.revisionId, record);
  }

  async listRevisionsForEntityForSubject(subjectKind: PersistedWatchlistEntryRecord['subjectKind'], subjectId: string, entityKind: PortfolioEntityKind, entityId: string): Promise<PersistedPortfolioRevisionRecord[]> {
    const owned = entityKind === 'watchlist_entry' ? this.watchlist.get(entityId) : entityKind === 'position' ? this.positions.get(entityId) : this.actions.get(entityId);
    if (!owned || owned.subjectKind !== subjectKind || owned.subjectId !== subjectId) return [];
    return [...this.revisions.values()].filter((item) => item.entityKind === entityKind && item.entityId === entityId).sort(byRevisionAsc);
  }

  async saveSnapshot(record: PersistedPortfolioSnapshotRecord): Promise<void> {
    this.snapshots.set(record.snapshotId, record);
  }

  async getLatestSnapshot(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<PersistedPortfolioSnapshotRecord | null> {
    return [...this.snapshots.values()]
      .filter((row) => row.subjectKind === subjectKind && row.subjectId === subjectId)
      .sort(byGeneratedDesc)[0] ?? null;
  }
}

type WatchlistRow = {
  entry_id: string;
  subject_kind: PersistedWatchlistEntryRecord['subjectKind'];
  subject_id: string;
  asset: string;
  timeframe: string;
  priority: PersistedWatchlistEntryRecord['priority'];
  status: PersistedWatchlistEntryRecord['status'];
  thesis_health: PersistedWatchlistEntryRecord['thesisHealth'];
  note: string | null;
  linked_reasoning_run_id: string | null;
  linked_snapshot_id: string | null;
  linked_drift_id: string | null;
  linked_journal_case_id: string | null;
  created_at: string;
  updated_at: string;
  entry_json: string;
};

type PositionRow = {
  position_id: string;
  subject_kind: PersistedPositionRecord['subjectKind'];
  subject_id: string;
  asset: string;
  timeframe: string;
  status: PersistedPositionRecord['status'];
  direction: PersistedPositionRecord['direction'];
  entry_price: number | null;
  stop_loss: number | null;
  take_profit_levels_json: string;
  size: number | null;
  opened_at: string | null;
  updated_at: string;
  closed_at: string | null;
  thesis_health: PersistedPositionRecord['thesisHealth'];
  linked_journal_case_id: string | null;
  linked_reasoning_run_id: string | null;
  linked_snapshot_id: string | null;
  linked_drift_id: string | null;
  note: string | null;
  position_json: string;
};

type ActionRow = {
  action_id: string;
  subject_kind: PersistedPortfolioActionItemRecord['subjectKind'];
  subject_id: string;
  kind: PersistedPortfolioActionItemRecord['kind'];
  status: PersistedPortfolioActionItemRecord['status'];
  priority: PersistedPortfolioActionItemRecord['priority'];
  asset: string | null;
  timeframe: string | null;
  headline: string;
  rationale: string;
  linked_entry_id: string | null;
  linked_position_id: string | null;
  linked_journal_case_id: string | null;
  linked_reasoning_run_id: string | null;
  linked_notification_decision_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  dismissed_at: string | null;
  action_json: string;
};

type RevisionRow = {
  revision_id: string;
  entity_kind: PersistedPortfolioRevisionRecord['entityKind'];
  entity_id: string;
  revision_type: PersistedPortfolioRevisionRecord['revisionType'];
  changed_at: string;
  changed_by_kind: PersistedPortfolioRevisionRecord['changedByKind'];
  changed_by_id: string;
  summary: string;
  snapshot_json: string;
};

type SnapshotRow = {
  snapshot_id: string;
  subject_kind: PersistedPortfolioSnapshotRecord['subjectKind'];
  subject_id: string;
  generated_at: string;
  active_watchlist_count: number;
  active_position_count: number;
  weakening_thesis_count: number;
  invalidated_thesis_count: number;
  open_action_count: number;
  critical_action_count: number;
  snapshot_json: string;
  created_at: string;
};

const mapWatchlist = (row: WatchlistRow): PersistedWatchlistEntryRecord => ({
  entryId: row.entry_id,
  subjectKind: row.subject_kind,
  subjectId: row.subject_id,
  asset: row.asset as CanonicalAssetSymbol,
  timeframe: row.timeframe as Timeframe,
  priority: row.priority,
  status: row.status,
  thesisHealth: row.thesis_health,
  note: row.note,
  linkedReasoningRunId: row.linked_reasoning_run_id,
  linkedSnapshotId: row.linked_snapshot_id,
  linkedDriftId: row.linked_drift_id,
  linkedJournalCaseId: row.linked_journal_case_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  entryJson: row.entry_json
});

const mapPosition = (row: PositionRow): PersistedPositionRecord => ({
  positionId: row.position_id,
  subjectKind: row.subject_kind,
  subjectId: row.subject_id,
  asset: row.asset as CanonicalAssetSymbol,
  timeframe: row.timeframe as Timeframe,
  status: row.status,
  direction: row.direction,
  entryPrice: row.entry_price,
  stopLoss: row.stop_loss,
  takeProfitLevelsJson: row.take_profit_levels_json,
  size: row.size,
  openedAt: row.opened_at,
  updatedAt: row.updated_at,
  closedAt: row.closed_at,
  thesisHealth: row.thesis_health,
  linkedJournalCaseId: row.linked_journal_case_id,
  linkedReasoningRunId: row.linked_reasoning_run_id,
  linkedSnapshotId: row.linked_snapshot_id,
  linkedDriftId: row.linked_drift_id,
  note: row.note,
  positionJson: row.position_json
});

const mapAction = (row: ActionRow): PersistedPortfolioActionItemRecord => ({
  actionId: row.action_id,
  subjectKind: row.subject_kind,
  subjectId: row.subject_id,
  kind: row.kind,
  status: row.status,
  priority: row.priority,
  asset: row.asset as CanonicalAssetSymbol | null,
  timeframe: row.timeframe as Timeframe | null,
  headline: row.headline,
  rationale: row.rationale,
  linkedEntryId: row.linked_entry_id,
  linkedPositionId: row.linked_position_id,
  linkedJournalCaseId: row.linked_journal_case_id,
  linkedReasoningRunId: row.linked_reasoning_run_id,
  linkedNotificationDecisionId: row.linked_notification_decision_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  completedAt: row.completed_at,
  dismissedAt: row.dismissed_at,
  actionJson: row.action_json
});

const mapRevision = (row: RevisionRow): PersistedPortfolioRevisionRecord => ({
  revisionId: row.revision_id,
  entityKind: row.entity_kind,
  entityId: row.entity_id,
  revisionType: row.revision_type,
  changedAt: row.changed_at,
  changedByKind: row.changed_by_kind,
  changedById: row.changed_by_id,
  summary: row.summary,
  snapshotJson: row.snapshot_json
});

const mapSnapshot = (row: SnapshotRow): PersistedPortfolioSnapshotRecord => ({
  snapshotId: row.snapshot_id,
  subjectKind: row.subject_kind,
  subjectId: row.subject_id,
  generatedAt: row.generated_at,
  activeWatchlistCount: row.active_watchlist_count,
  activePositionCount: row.active_position_count,
  weakeningThesisCount: row.weakening_thesis_count,
  invalidatedThesisCount: row.invalidated_thesis_count,
  openActionCount: row.open_action_count,
  criticalActionCount: row.critical_action_count,
  snapshotJson: row.snapshot_json,
  createdAt: row.created_at
});

export class SqlPortfolioRepository implements PortfolioRepository {
  async saveWatchlistEntry(record: PersistedWatchlistEntryRecord): Promise<void> {
    await queryDb(
      `INSERT INTO app_portfolio_watchlist_entries (
        entry_id, subject_kind, subject_id, asset, timeframe, priority, status, thesis_health, note,
        linked_reasoning_run_id, linked_snapshot_id, linked_drift_id, linked_journal_case_id,
        created_at, updated_at, entry_json
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb)
      ON CONFLICT (entry_id) DO UPDATE SET
        asset=EXCLUDED.asset,
        timeframe=EXCLUDED.timeframe,
        priority=EXCLUDED.priority,
        status=EXCLUDED.status,
        thesis_health=EXCLUDED.thesis_health,
        note=EXCLUDED.note,
        linked_reasoning_run_id=EXCLUDED.linked_reasoning_run_id,
        linked_snapshot_id=EXCLUDED.linked_snapshot_id,
        linked_drift_id=EXCLUDED.linked_drift_id,
        linked_journal_case_id=EXCLUDED.linked_journal_case_id,
        created_at=EXCLUDED.created_at,
        updated_at=EXCLUDED.updated_at,
        entry_json=EXCLUDED.entry_json
      WHERE app_portfolio_watchlist_entries.subject_kind=EXCLUDED.subject_kind AND app_portfolio_watchlist_entries.subject_id=EXCLUDED.subject_id`,
      [
        record.entryId, record.subjectKind, record.subjectId, record.asset, record.timeframe, record.priority, record.status, record.thesisHealth, record.note,
        record.linkedReasoningRunId, record.linkedSnapshotId, record.linkedDriftId, record.linkedJournalCaseId,
        record.createdAt, record.updatedAt, record.entryJson
      ]
    );
  }

  async getWatchlistEntryForSubject(subjectKind: PersistedWatchlistEntryRecord['subjectKind'], subjectId: string, entryId: string): Promise<PersistedWatchlistEntryRecord | null> {
    const rows = await queryDb<WatchlistRow>(
      `SELECT entry_id, subject_kind, subject_id, asset, timeframe, priority, status, thesis_health, note,
        linked_reasoning_run_id, linked_snapshot_id, linked_drift_id, linked_journal_case_id,
        created_at, updated_at, entry_json::text AS entry_json
       FROM app_portfolio_watchlist_entries WHERE entry_id = $1 AND subject_kind = $2 AND subject_id = $3`,
      [entryId, subjectKind, subjectId]
    );
    return rows[0] ? mapWatchlist(rows[0]) : null;
  }

  async listWatchlistEntries(query: PortfolioEntityListQuery): Promise<PersistedWatchlistEntryRecord[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (query.subjectKind) {
      values.push(query.subjectKind);
      clauses.push(`subject_kind = $${values.length}`);
    }
    if (query.subjectId) {
      values.push(query.subjectId);
      clauses.push(`subject_id = $${values.length}`);
    }
    if (query.asset) {
      values.push(query.asset);
      clauses.push(`asset = $${values.length}`);
    }
    if (query.timeframe) {
      values.push(query.timeframe);
      clauses.push(`timeframe = $${values.length}`);
    }
    if (query.status) {
      values.push(query.status);
      clauses.push(`status = $${values.length}`);
    }
    if (query.thesisHealth) {
      values.push(query.thesisHealth);
      clauses.push(`thesis_health = $${values.length}`);
    }
    values.push(limitFrom(query.limit));
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = await queryDb<WatchlistRow>(
      `SELECT entry_id, subject_kind, subject_id, asset, timeframe, priority, status, thesis_health, note,
        linked_reasoning_run_id, linked_snapshot_id, linked_drift_id, linked_journal_case_id,
        created_at, updated_at, entry_json::text AS entry_json
      FROM app_portfolio_watchlist_entries
      ${where}
      ORDER BY updated_at DESC, entry_id ASC
      LIMIT $${values.length}`,
      values
    );
    return rows.map(mapWatchlist);
  }

  async savePosition(record: PersistedPositionRecord): Promise<void> {
    await queryDb(
      `INSERT INTO app_portfolio_positions (
        position_id, subject_kind, subject_id, asset, timeframe, status, direction,
        entry_price, stop_loss, take_profit_levels_json, size, opened_at, updated_at, closed_at, thesis_health,
        linked_journal_case_id, linked_reasoning_run_id, linked_snapshot_id, linked_drift_id,
        note, position_json
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21::jsonb)
      ON CONFLICT (position_id) DO UPDATE SET
        asset=EXCLUDED.asset,
        timeframe=EXCLUDED.timeframe,
        status=EXCLUDED.status,
        direction=EXCLUDED.direction,
        entry_price=EXCLUDED.entry_price,
        stop_loss=EXCLUDED.stop_loss,
        take_profit_levels_json=EXCLUDED.take_profit_levels_json,
        size=EXCLUDED.size,
        opened_at=EXCLUDED.opened_at,
        updated_at=EXCLUDED.updated_at,
        closed_at=EXCLUDED.closed_at,
        thesis_health=EXCLUDED.thesis_health,
        linked_journal_case_id=EXCLUDED.linked_journal_case_id,
        linked_reasoning_run_id=EXCLUDED.linked_reasoning_run_id,
        linked_snapshot_id=EXCLUDED.linked_snapshot_id,
        linked_drift_id=EXCLUDED.linked_drift_id,
        note=EXCLUDED.note,
        position_json=EXCLUDED.position_json
      WHERE app_portfolio_positions.subject_kind=EXCLUDED.subject_kind AND app_portfolio_positions.subject_id=EXCLUDED.subject_id`,
      [
        record.positionId, record.subjectKind, record.subjectId, record.asset, record.timeframe, record.status, record.direction,
        record.entryPrice, record.stopLoss, record.takeProfitLevelsJson, record.size, record.openedAt, record.updatedAt, record.closedAt, record.thesisHealth,
        record.linkedJournalCaseId, record.linkedReasoningRunId, record.linkedSnapshotId, record.linkedDriftId,
        record.note, record.positionJson
      ]
    );
  }

  async getPositionForSubject(subjectKind: PersistedPositionRecord['subjectKind'], subjectId: string, positionId: string): Promise<PersistedPositionRecord | null> {
    const rows = await queryDb<PositionRow>(
      `SELECT position_id, subject_kind, subject_id, asset, timeframe, status, direction,
        entry_price, stop_loss, take_profit_levels_json::text AS take_profit_levels_json,
        size, opened_at, updated_at, closed_at, thesis_health,
        linked_journal_case_id, linked_reasoning_run_id, linked_snapshot_id, linked_drift_id,
        note, position_json::text AS position_json
      FROM app_portfolio_positions WHERE position_id = $1 AND subject_kind = $2 AND subject_id = $3`,
      [positionId, subjectKind, subjectId]
    );
    return rows[0] ? mapPosition(rows[0]) : null;
  }

  async listPositions(query: PortfolioEntityListQuery): Promise<PersistedPositionRecord[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (query.subjectKind) {
      values.push(query.subjectKind);
      clauses.push(`subject_kind = $${values.length}`);
    }
    if (query.subjectId) {
      values.push(query.subjectId);
      clauses.push(`subject_id = $${values.length}`);
    }
    if (query.asset) {
      values.push(query.asset);
      clauses.push(`asset = $${values.length}`);
    }
    if (query.timeframe) {
      values.push(query.timeframe);
      clauses.push(`timeframe = $${values.length}`);
    }
    if (query.status) {
      values.push(query.status);
      clauses.push(`status = $${values.length}`);
    }
    if (query.thesisHealth) {
      values.push(query.thesisHealth);
      clauses.push(`thesis_health = $${values.length}`);
    }
    values.push(limitFrom(query.limit));
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = await queryDb<PositionRow>(
      `SELECT position_id, subject_kind, subject_id, asset, timeframe, status, direction,
        entry_price, stop_loss, take_profit_levels_json::text AS take_profit_levels_json,
        size, opened_at, updated_at, closed_at, thesis_health,
        linked_journal_case_id, linked_reasoning_run_id, linked_snapshot_id, linked_drift_id,
        note, position_json::text AS position_json
      FROM app_portfolio_positions
      ${where}
      ORDER BY updated_at DESC, position_id ASC
      LIMIT $${values.length}`,
      values
    );
    return rows.map(mapPosition);
  }

  async saveActionItem(record: PersistedPortfolioActionItemRecord): Promise<void> {
    await queryDb(
      `INSERT INTO app_portfolio_action_items (
        action_id, subject_kind, subject_id, kind, status, priority, asset, timeframe,
        headline, rationale, linked_entry_id, linked_position_id, linked_journal_case_id,
        linked_reasoning_run_id, linked_notification_decision_id, created_at, updated_at,
        completed_at, dismissed_at, action_json
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20::jsonb)
      ON CONFLICT (action_id) DO UPDATE SET
        kind=EXCLUDED.kind,
        status=EXCLUDED.status,
        priority=EXCLUDED.priority,
        asset=EXCLUDED.asset,
        timeframe=EXCLUDED.timeframe,
        headline=EXCLUDED.headline,
        rationale=EXCLUDED.rationale,
        linked_entry_id=EXCLUDED.linked_entry_id,
        linked_position_id=EXCLUDED.linked_position_id,
        linked_journal_case_id=EXCLUDED.linked_journal_case_id,
        linked_reasoning_run_id=EXCLUDED.linked_reasoning_run_id,
        linked_notification_decision_id=EXCLUDED.linked_notification_decision_id,
        created_at=EXCLUDED.created_at,
        updated_at=EXCLUDED.updated_at,
        completed_at=EXCLUDED.completed_at,
        dismissed_at=EXCLUDED.dismissed_at,
        action_json=EXCLUDED.action_json
      WHERE app_portfolio_action_items.subject_kind=EXCLUDED.subject_kind AND app_portfolio_action_items.subject_id=EXCLUDED.subject_id`,
      [
        record.actionId, record.subjectKind, record.subjectId, record.kind, record.status, record.priority, record.asset, record.timeframe,
        record.headline, record.rationale, record.linkedEntryId, record.linkedPositionId, record.linkedJournalCaseId,
        record.linkedReasoningRunId, record.linkedNotificationDecisionId, record.createdAt, record.updatedAt,
        record.completedAt, record.dismissedAt, record.actionJson
      ]
    );
  }

  async getActionItemForSubject(subjectKind: PersistedPortfolioActionItemRecord['subjectKind'], subjectId: string, actionId: string): Promise<PersistedPortfolioActionItemRecord | null> {
    const rows = await queryDb<ActionRow>(
      `SELECT action_id, subject_kind, subject_id, kind, status, priority, asset, timeframe,
        headline, rationale, linked_entry_id, linked_position_id, linked_journal_case_id,
        linked_reasoning_run_id, linked_notification_decision_id, created_at, updated_at,
        completed_at, dismissed_at, action_json::text AS action_json
       FROM app_portfolio_action_items WHERE action_id = $1 AND subject_kind = $2 AND subject_id = $3`,
      [actionId, subjectKind, subjectId]
    );
    return rows[0] ? mapAction(rows[0]) : null;
  }

  async listActionItems(query: PortfolioEntityListQuery): Promise<PersistedPortfolioActionItemRecord[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (query.subjectKind) {
      values.push(query.subjectKind);
      clauses.push(`subject_kind = $${values.length}`);
    }
    if (query.subjectId) {
      values.push(query.subjectId);
      clauses.push(`subject_id = $${values.length}`);
    }
    if (query.asset) {
      values.push(query.asset);
      clauses.push(`asset = $${values.length}`);
    }
    if (query.timeframe) {
      values.push(query.timeframe);
      clauses.push(`timeframe = $${values.length}`);
    }
    if (query.status) {
      values.push(query.status);
      clauses.push(`status = $${values.length}`);
    }
    values.push(limitFrom(query.limit));
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = await queryDb<ActionRow>(
      `SELECT action_id, subject_kind, subject_id, kind, status, priority, asset, timeframe,
        headline, rationale, linked_entry_id, linked_position_id, linked_journal_case_id,
        linked_reasoning_run_id, linked_notification_decision_id, created_at, updated_at,
        completed_at, dismissed_at, action_json::text AS action_json
      FROM app_portfolio_action_items
      ${where}
      ORDER BY updated_at DESC, action_id ASC
      LIMIT $${values.length}`,
      values
    );
    return rows.map(mapAction);
  }

  async saveRevision(record: PersistedPortfolioRevisionRecord): Promise<void> {
    await queryDb(
      `INSERT INTO app_portfolio_revisions (
        revision_id, entity_kind, entity_id, revision_type, changed_at, changed_by_kind, changed_by_id, summary, snapshot_json
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
      ON CONFLICT (revision_id) DO NOTHING`,
      [record.revisionId, record.entityKind, record.entityId, record.revisionType, record.changedAt, record.changedByKind, record.changedById, record.summary, record.snapshotJson]
    );
  }

  async listRevisionsForEntityForSubject(subjectKind: PersistedWatchlistEntryRecord['subjectKind'], subjectId: string, entityKind: PortfolioEntityKind, entityId: string): Promise<PersistedPortfolioRevisionRecord[]> {
    const rows = await queryDb<RevisionRow>(
      `SELECT revision_id, entity_kind, entity_id, revision_type, changed_at, changed_by_kind, changed_by_id, summary, snapshot_json::text AS snapshot_json
      FROM app_portfolio_revisions
      WHERE entity_kind = $1 AND entity_id = $2
        AND CASE $1
          WHEN 'watchlist_entry' THEN EXISTS (SELECT 1 FROM app_portfolio_watchlist_entries e WHERE e.entry_id=$2 AND e.subject_kind=$3 AND e.subject_id=$4)
          WHEN 'position' THEN EXISTS (SELECT 1 FROM app_portfolio_positions e WHERE e.position_id=$2 AND e.subject_kind=$3 AND e.subject_id=$4)
          ELSE EXISTS (SELECT 1 FROM app_portfolio_action_items e WHERE e.action_id=$2 AND e.subject_kind=$3 AND e.subject_id=$4)
        END
      ORDER BY changed_at ASC, revision_id ASC`,
      [entityKind, entityId, subjectKind, subjectId]
    );
    return rows.map(mapRevision);
  }

  async saveSnapshot(record: PersistedPortfolioSnapshotRecord): Promise<void> {
    await queryDb(
      `INSERT INTO app_portfolio_snapshots (
        snapshot_id, subject_kind, subject_id, generated_at, active_watchlist_count, active_position_count,
        weakening_thesis_count, invalidated_thesis_count, open_action_count, critical_action_count,
        snapshot_json, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)
      ON CONFLICT (snapshot_id) DO UPDATE SET
        subject_kind=EXCLUDED.subject_kind,
        subject_id=EXCLUDED.subject_id,
        generated_at=EXCLUDED.generated_at,
        active_watchlist_count=EXCLUDED.active_watchlist_count,
        active_position_count=EXCLUDED.active_position_count,
        weakening_thesis_count=EXCLUDED.weakening_thesis_count,
        invalidated_thesis_count=EXCLUDED.invalidated_thesis_count,
        open_action_count=EXCLUDED.open_action_count,
        critical_action_count=EXCLUDED.critical_action_count,
        snapshot_json=EXCLUDED.snapshot_json,
        created_at=EXCLUDED.created_at`,
      [
        record.snapshotId, record.subjectKind, record.subjectId, record.generatedAt, record.activeWatchlistCount, record.activePositionCount,
        record.weakeningThesisCount, record.invalidatedThesisCount, record.openActionCount, record.criticalActionCount,
        record.snapshotJson, record.createdAt
      ]
    );
  }

  async getLatestSnapshot(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<PersistedPortfolioSnapshotRecord | null> {
    const rows = await queryDb<SnapshotRow>(
      `SELECT snapshot_id, subject_kind, subject_id, generated_at, active_watchlist_count, active_position_count,
        weakening_thesis_count, invalidated_thesis_count, open_action_count, critical_action_count,
        snapshot_json::text AS snapshot_json, created_at
      FROM app_portfolio_snapshots
      WHERE subject_kind = $1 AND subject_id = $2
      ORDER BY generated_at DESC, snapshot_id ASC
      LIMIT 1`,
      [subjectKind, subjectId]
    );
    return rows[0] ? mapSnapshot(rows[0]) : null;
  }
}

function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

let singleton: PortfolioRepository | null = null;

export function getPortfolioRepository(): PortfolioRepository {
  if (!singleton) {
    singleton = runtimeEnv().APP_STATE_REPOSITORY === 'memory' ? new MemoryPortfolioRepository() : new SqlPortfolioRepository();
  }
  return singleton;
}

export function setPortfolioRepository(next: PortfolioRepository): void {
  singleton = next;
}
