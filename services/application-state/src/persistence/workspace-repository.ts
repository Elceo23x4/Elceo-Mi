import { queryDb } from '../db/client';
import type { PersistedWorkspaceSnapshotRecord, WorkspaceSnapshotRepository } from './contracts';

function byGeneratedDesc(left: PersistedWorkspaceSnapshotRecord, right: PersistedWorkspaceSnapshotRecord): number {
  return Date.parse(right.generatedAt) - Date.parse(left.generatedAt) || left.snapshotId.localeCompare(right.snapshotId);
}

function capLimit(limit?: number): number {
  return Math.max(1, Math.min(500, limit ?? 50));
}

export class MemoryWorkspaceSnapshotRepository implements WorkspaceSnapshotRepository {
  private readonly snapshots = new Map<string, PersistedWorkspaceSnapshotRecord>();

  async saveSnapshot(record: PersistedWorkspaceSnapshotRecord): Promise<void> {
    this.snapshots.set(record.snapshotId, record);
  }

  async getSnapshotById(snapshotId: string): Promise<PersistedWorkspaceSnapshotRecord | null> {
    return this.snapshots.get(snapshotId) ?? null;
  }

  async getLatestSnapshot(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<PersistedWorkspaceSnapshotRecord | null> {
    const rows = await this.listSnapshots(subjectKind, subjectId, 1);
    return rows[0] ?? null;
  }

  async listSnapshots(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit?: number): Promise<PersistedWorkspaceSnapshotRecord[]> {
    return [...this.snapshots.values()]
      .filter((row) => row.subjectKind === subjectKind && row.subjectId === subjectId)
      .sort(byGeneratedDesc)
      .slice(0, capLimit(limit));
  }
}

type WorkspaceRow = {
  snapshot_id: string;
  subject_kind: PersistedWorkspaceSnapshotRecord['subjectKind'];
  subject_id: string;
  generated_at: string;
  health_state: PersistedWorkspaceSnapshotRecord['healthState'];
  attention_level: PersistedWorkspaceSnapshotRecord['attentionLevel'];
  portfolio_snapshot_id: string | null;
  coaching_snapshot_id: string | null;
  analytics_snapshot_id: string | null;
  active_watchlist_count: number;
  active_position_count: number;
  weakening_thesis_count: number;
  invalidated_thesis_count: number;
  open_action_count: number;
  critical_action_count: number;
  unread_inbox_count: number;
  degraded_target_count: number;
  critical_receipt_count: number;
  focus_area_count: number;
  action_plan_count: number;
  top_focus_priority: PersistedWorkspaceSnapshotRecord['topFocusPriority'];
  recent_reasoning_count: number;
  agenda_json: string;
  dependency_status_json: string;
  summary_json: string;
  created_at: string;
};

function mapRow(row: WorkspaceRow): PersistedWorkspaceSnapshotRecord {
  return {
    snapshotId: row.snapshot_id,
    subjectKind: row.subject_kind,
    subjectId: row.subject_id,
    generatedAt: row.generated_at,
    healthState: row.health_state,
    attentionLevel: row.attention_level,
    portfolioSnapshotId: row.portfolio_snapshot_id,
    coachingSnapshotId: row.coaching_snapshot_id,
    analyticsSnapshotId: row.analytics_snapshot_id,
    activeWatchlistCount: row.active_watchlist_count,
    activePositionCount: row.active_position_count,
    weakeningThesisCount: row.weakening_thesis_count,
    invalidatedThesisCount: row.invalidated_thesis_count,
    openActionCount: row.open_action_count,
    criticalActionCount: row.critical_action_count,
    unreadInboxCount: row.unread_inbox_count,
    degradedTargetCount: row.degraded_target_count,
    criticalReceiptCount: row.critical_receipt_count,
    focusAreaCount: row.focus_area_count,
    actionPlanCount: row.action_plan_count,
    topFocusPriority: row.top_focus_priority,
    recentReasoningCount: row.recent_reasoning_count,
    agendaJson: row.agenda_json,
    dependencyStatusJson: row.dependency_status_json,
    summaryJson: row.summary_json,
    createdAt: row.created_at
  };
}

export class SqlWorkspaceSnapshotRepository implements WorkspaceSnapshotRepository {
  async saveSnapshot(record: PersistedWorkspaceSnapshotRecord): Promise<void> {
    await queryDb(
      `INSERT INTO app_workspace_snapshots (
        snapshot_id, subject_kind, subject_id, generated_at, health_state, attention_level,
        portfolio_snapshot_id, coaching_snapshot_id, analytics_snapshot_id,
        active_watchlist_count, active_position_count, weakening_thesis_count, invalidated_thesis_count,
        open_action_count, critical_action_count,
        unread_inbox_count, degraded_target_count, critical_receipt_count,
        focus_area_count, action_plan_count, top_focus_priority,
        recent_reasoning_count, agenda_json, dependency_status_json, summary_json, created_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,
        $10,$11,$12,$13,
        $14,$15,
        $16,$17,$18,
        $19,$20,$21,
        $22,$23::jsonb,$24::jsonb,$25::jsonb,$26
      ) ON CONFLICT (snapshot_id) DO UPDATE SET
        subject_kind=EXCLUDED.subject_kind,
        subject_id=EXCLUDED.subject_id,
        generated_at=EXCLUDED.generated_at,
        health_state=EXCLUDED.health_state,
        attention_level=EXCLUDED.attention_level,
        portfolio_snapshot_id=EXCLUDED.portfolio_snapshot_id,
        coaching_snapshot_id=EXCLUDED.coaching_snapshot_id,
        analytics_snapshot_id=EXCLUDED.analytics_snapshot_id,
        active_watchlist_count=EXCLUDED.active_watchlist_count,
        active_position_count=EXCLUDED.active_position_count,
        weakening_thesis_count=EXCLUDED.weakening_thesis_count,
        invalidated_thesis_count=EXCLUDED.invalidated_thesis_count,
        open_action_count=EXCLUDED.open_action_count,
        critical_action_count=EXCLUDED.critical_action_count,
        unread_inbox_count=EXCLUDED.unread_inbox_count,
        degraded_target_count=EXCLUDED.degraded_target_count,
        critical_receipt_count=EXCLUDED.critical_receipt_count,
        focus_area_count=EXCLUDED.focus_area_count,
        action_plan_count=EXCLUDED.action_plan_count,
        top_focus_priority=EXCLUDED.top_focus_priority,
        recent_reasoning_count=EXCLUDED.recent_reasoning_count,
        agenda_json=EXCLUDED.agenda_json,
        dependency_status_json=EXCLUDED.dependency_status_json,
        summary_json=EXCLUDED.summary_json,
        created_at=EXCLUDED.created_at`,
      [
        record.snapshotId,
        record.subjectKind,
        record.subjectId,
        record.generatedAt,
        record.healthState,
        record.attentionLevel,
        record.portfolioSnapshotId,
        record.coachingSnapshotId,
        record.analyticsSnapshotId,
        record.activeWatchlistCount,
        record.activePositionCount,
        record.weakeningThesisCount,
        record.invalidatedThesisCount,
        record.openActionCount,
        record.criticalActionCount,
        record.unreadInboxCount,
        record.degradedTargetCount,
        record.criticalReceiptCount,
        record.focusAreaCount,
        record.actionPlanCount,
        record.topFocusPriority,
        record.recentReasoningCount,
        record.agendaJson,
        record.dependencyStatusJson,
        record.summaryJson,
        record.createdAt
      ]
    );
  }

  async getSnapshotById(snapshotId: string): Promise<PersistedWorkspaceSnapshotRecord | null> {
    const rows = await queryDb<WorkspaceRow>(
      `SELECT snapshot_id, subject_kind, subject_id, generated_at, health_state, attention_level,
              portfolio_snapshot_id, coaching_snapshot_id, analytics_snapshot_id,
              active_watchlist_count, active_position_count, weakening_thesis_count, invalidated_thesis_count,
              open_action_count, critical_action_count,
              unread_inbox_count, degraded_target_count, critical_receipt_count,
              focus_area_count, action_plan_count, top_focus_priority,
              recent_reasoning_count,
              agenda_json::text AS agenda_json,
              dependency_status_json::text AS dependency_status_json,
              summary_json::text AS summary_json,
              created_at
       FROM app_workspace_snapshots
       WHERE snapshot_id = $1`,
      [snapshotId]
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async getLatestSnapshot(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<PersistedWorkspaceSnapshotRecord | null> {
    const rows = await queryDb<WorkspaceRow>(
      `SELECT snapshot_id, subject_kind, subject_id, generated_at, health_state, attention_level,
              portfolio_snapshot_id, coaching_snapshot_id, analytics_snapshot_id,
              active_watchlist_count, active_position_count, weakening_thesis_count, invalidated_thesis_count,
              open_action_count, critical_action_count,
              unread_inbox_count, degraded_target_count, critical_receipt_count,
              focus_area_count, action_plan_count, top_focus_priority,
              recent_reasoning_count,
              agenda_json::text AS agenda_json,
              dependency_status_json::text AS dependency_status_json,
              summary_json::text AS summary_json,
              created_at
       FROM app_workspace_snapshots
       WHERE subject_kind = $1 AND subject_id = $2
       ORDER BY generated_at DESC, snapshot_id ASC
       LIMIT 1`,
      [subjectKind, subjectId]
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async listSnapshots(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit?: number): Promise<PersistedWorkspaceSnapshotRecord[]> {
    const rows = await queryDb<WorkspaceRow>(
      `SELECT snapshot_id, subject_kind, subject_id, generated_at, health_state, attention_level,
              portfolio_snapshot_id, coaching_snapshot_id, analytics_snapshot_id,
              active_watchlist_count, active_position_count, weakening_thesis_count, invalidated_thesis_count,
              open_action_count, critical_action_count,
              unread_inbox_count, degraded_target_count, critical_receipt_count,
              focus_area_count, action_plan_count, top_focus_priority,
              recent_reasoning_count,
              agenda_json::text AS agenda_json,
              dependency_status_json::text AS dependency_status_json,
              summary_json::text AS summary_json,
              created_at
       FROM app_workspace_snapshots
       WHERE subject_kind = $1 AND subject_id = $2
       ORDER BY generated_at DESC, snapshot_id ASC
       LIMIT $3`,
      [subjectKind, subjectId, capLimit(limit)]
    );
    return rows.map(mapRow);
  }
}

function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

let singleton: WorkspaceSnapshotRepository | null = null;

export function getWorkspaceSnapshotRepository(): WorkspaceSnapshotRepository {
  if (!singleton) {
    singleton = runtimeEnv().APP_STATE_REPOSITORY === 'memory' ? new MemoryWorkspaceSnapshotRepository() : new SqlWorkspaceSnapshotRepository();
  }
  return singleton;
}

export function setWorkspaceSnapshotRepository(next: WorkspaceSnapshotRepository): void {
  singleton = next;
}
