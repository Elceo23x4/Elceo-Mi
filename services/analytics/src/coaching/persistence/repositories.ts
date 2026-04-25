import type { AnalyticsAssetScope, AnalyticsTimeframeScope } from '@elceo/types';
import { queryDb } from '../../persistence/db-client';
import type {
  AnalyticsSnapshotLookupRepository,
  CoachingSnapshotRepository,
  JournalInfluenceSnapshotLookupRepository,
  PersistedCoachingSnapshotRecord
} from './contracts';

function byGeneratedDesc(left: PersistedCoachingSnapshotRecord, right: PersistedCoachingSnapshotRecord): number {
  return Date.parse(right.generatedAt) - Date.parse(left.generatedAt) || left.snapshotId.localeCompare(right.snapshotId);
}

function capLimit(limit?: number): number {
  return Math.max(1, Math.min(500, limit ?? 50));
}

export class MemoryCoachingSnapshotRepository implements CoachingSnapshotRepository {
  private readonly records = new Map<string, PersistedCoachingSnapshotRecord>();

  async saveSnapshot(record: PersistedCoachingSnapshotRecord): Promise<void> {
    this.records.set(record.snapshotId, record);
  }

  async getSnapshotById(snapshotId: string): Promise<PersistedCoachingSnapshotRecord | null> {
    return this.records.get(snapshotId) ?? null;
  }

  async getLatestSnapshot(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope: AnalyticsAssetScope, timeframeScope: AnalyticsTimeframeScope): Promise<PersistedCoachingSnapshotRecord | null> {
    const rows = [...this.records.values()]
      .filter((row) => row.subjectKind === subjectKind && row.subjectId === subjectId && row.assetScope === assetScope && row.timeframeScope === timeframeScope)
      .sort(byGeneratedDesc);
    return rows[0] ?? null;
  }

  async listSnapshots(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope?: AnalyticsAssetScope, timeframeScope?: AnalyticsTimeframeScope, limit?: number): Promise<PersistedCoachingSnapshotRecord[]> {
    return [...this.records.values()]
      .filter((row) => row.subjectKind === subjectKind && row.subjectId === subjectId)
      .filter((row) => (assetScope ? row.assetScope === assetScope : true))
      .filter((row) => (timeframeScope ? row.timeframeScope === timeframeScope : true))
      .sort(byGeneratedDesc)
      .slice(0, capLimit(limit));
  }
}

type CoachingRow = {
  snapshot_id: string;
  subject_kind: 'user' | 'workspace' | 'ops';
  subject_id: string;
  asset_scope: string;
  timeframe_scope: string;
  generated_at: string;
  analytics_snapshot_id: string | null;
  journal_influence_snapshot_id: string | null;
  total_signals_considered: number;
  focus_areas_json: string;
  strengths_json: string;
  action_plan_json: string;
  summary_notes_json: string;
  supporting_case_ids_json: string;
  summary_json: string;
  created_at: string;
};

function mapCoachingRow(row: CoachingRow): PersistedCoachingSnapshotRecord {
  return {
    snapshotId: row.snapshot_id,
    subjectKind: row.subject_kind,
    subjectId: row.subject_id,
    assetScope: row.asset_scope as AnalyticsAssetScope,
    timeframeScope: row.timeframe_scope as AnalyticsTimeframeScope,
    generatedAt: row.generated_at,
    analyticsSnapshotId: row.analytics_snapshot_id,
    journalInfluenceSnapshotId: row.journal_influence_snapshot_id,
    totalSignalsConsidered: row.total_signals_considered,
    focusAreasJson: row.focus_areas_json,
    strengthsJson: row.strengths_json,
    actionPlanJson: row.action_plan_json,
    summaryNotesJson: row.summary_notes_json,
    supportingCaseIdsJson: row.supporting_case_ids_json,
    summaryJson: row.summary_json,
    createdAt: row.created_at
  };
}

export class SqlCoachingSnapshotRepository implements CoachingSnapshotRepository {
  async saveSnapshot(record: PersistedCoachingSnapshotRecord): Promise<void> {
    await queryDb(
      `INSERT INTO app_coaching_snapshots (
        snapshot_id, subject_kind, subject_id, asset_scope, timeframe_scope, generated_at,
        analytics_snapshot_id, journal_influence_snapshot_id, total_signals_considered,
        focus_areas_json, strengths_json, action_plan_json, summary_notes_json, supporting_case_ids_json,
        summary_json, created_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,
        $10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,
        $15::jsonb,$16
      ) ON CONFLICT (snapshot_id) DO UPDATE SET
        subject_kind = EXCLUDED.subject_kind,
        subject_id = EXCLUDED.subject_id,
        asset_scope = EXCLUDED.asset_scope,
        timeframe_scope = EXCLUDED.timeframe_scope,
        generated_at = EXCLUDED.generated_at,
        analytics_snapshot_id = EXCLUDED.analytics_snapshot_id,
        journal_influence_snapshot_id = EXCLUDED.journal_influence_snapshot_id,
        total_signals_considered = EXCLUDED.total_signals_considered,
        focus_areas_json = EXCLUDED.focus_areas_json,
        strengths_json = EXCLUDED.strengths_json,
        action_plan_json = EXCLUDED.action_plan_json,
        summary_notes_json = EXCLUDED.summary_notes_json,
        supporting_case_ids_json = EXCLUDED.supporting_case_ids_json,
        summary_json = EXCLUDED.summary_json,
        created_at = EXCLUDED.created_at`,
      [
        record.snapshotId,
        record.subjectKind,
        record.subjectId,
        record.assetScope,
        record.timeframeScope,
        record.generatedAt,
        record.analyticsSnapshotId,
        record.journalInfluenceSnapshotId,
        record.totalSignalsConsidered,
        record.focusAreasJson,
        record.strengthsJson,
        record.actionPlanJson,
        record.summaryNotesJson,
        record.supportingCaseIdsJson,
        record.summaryJson,
        record.createdAt
      ]
    );
  }

  async getSnapshotById(snapshotId: string): Promise<PersistedCoachingSnapshotRecord | null> {
    const rows = await queryDb<CoachingRow>(
      `SELECT snapshot_id, subject_kind, subject_id, asset_scope, timeframe_scope, generated_at,
              analytics_snapshot_id, journal_influence_snapshot_id, total_signals_considered,
              focus_areas_json::text AS focus_areas_json,
              strengths_json::text AS strengths_json,
              action_plan_json::text AS action_plan_json,
              summary_notes_json::text AS summary_notes_json,
              supporting_case_ids_json::text AS supporting_case_ids_json,
              summary_json::text AS summary_json,
              created_at
       FROM app_coaching_snapshots WHERE snapshot_id = $1`,
      [snapshotId]
    );
    return rows[0] ? mapCoachingRow(rows[0]) : null;
  }

  async getLatestSnapshot(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope: AnalyticsAssetScope, timeframeScope: AnalyticsTimeframeScope): Promise<PersistedCoachingSnapshotRecord | null> {
    const rows = await queryDb<CoachingRow>(
      `SELECT snapshot_id, subject_kind, subject_id, asset_scope, timeframe_scope, generated_at,
              analytics_snapshot_id, journal_influence_snapshot_id, total_signals_considered,
              focus_areas_json::text AS focus_areas_json,
              strengths_json::text AS strengths_json,
              action_plan_json::text AS action_plan_json,
              summary_notes_json::text AS summary_notes_json,
              supporting_case_ids_json::text AS supporting_case_ids_json,
              summary_json::text AS summary_json,
              created_at
       FROM app_coaching_snapshots
       WHERE subject_kind = $1 AND subject_id = $2 AND asset_scope = $3 AND timeframe_scope = $4
       ORDER BY generated_at DESC, snapshot_id ASC
       LIMIT 1`,
      [subjectKind, subjectId, assetScope, timeframeScope]
    );
    return rows[0] ? mapCoachingRow(rows[0]) : null;
  }

  async listSnapshots(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope?: AnalyticsAssetScope, timeframeScope?: AnalyticsTimeframeScope, limit?: number): Promise<PersistedCoachingSnapshotRecord[]> {
    const where: string[] = ['subject_kind = $1', 'subject_id = $2'];
    const values: unknown[] = [subjectKind, subjectId];
    if (assetScope) {
      values.push(assetScope);
      where.push(`asset_scope = $${values.length}`);
    }
    if (timeframeScope) {
      values.push(timeframeScope);
      where.push(`timeframe_scope = $${values.length}`);
    }
    values.push(capLimit(limit));

    const rows = await queryDb<CoachingRow>(
      `SELECT snapshot_id, subject_kind, subject_id, asset_scope, timeframe_scope, generated_at,
              analytics_snapshot_id, journal_influence_snapshot_id, total_signals_considered,
              focus_areas_json::text AS focus_areas_json,
              strengths_json::text AS strengths_json,
              action_plan_json::text AS action_plan_json,
              summary_notes_json::text AS summary_notes_json,
              supporting_case_ids_json::text AS supporting_case_ids_json,
              summary_json::text AS summary_json,
              created_at
       FROM app_coaching_snapshots
       WHERE ${where.join(' AND ')}
       ORDER BY generated_at DESC, snapshot_id ASC
       LIMIT $${values.length}`,
      values
    );
    return rows.map(mapCoachingRow);
  }
}

type LookupRow = { snapshot_id: string; summary_json: string };

export class MemoryAnalyticsSnapshotLookupRepository implements AnalyticsSnapshotLookupRepository {
  constructor(private readonly rows: Array<{ snapshotId: string; subjectKind: 'user' | 'workspace' | 'ops'; subjectId: string; assetScope: AnalyticsAssetScope; timeframeScope: AnalyticsTimeframeScope; lookbackDays: number; generatedAt: string; summaryJson: string }> = []) {}

  setRows(rows: Array<{ snapshotId: string; subjectKind: 'user' | 'workspace' | 'ops'; subjectId: string; assetScope: AnalyticsAssetScope; timeframeScope: AnalyticsTimeframeScope; lookbackDays: number; generatedAt: string; summaryJson: string }>): void {
    this.rows.splice(0, this.rows.length, ...rows);
  }

  async getLatestSnapshot(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope: AnalyticsAssetScope, timeframeScope: AnalyticsTimeframeScope, lookbackDays: number): Promise<{ snapshotId: string; summaryJson: string } | null> {
    const row = [...this.rows]
      .filter((item) => item.subjectKind === subjectKind && item.subjectId === subjectId && item.assetScope === assetScope && item.timeframeScope === timeframeScope && item.lookbackDays === lookbackDays)
      .sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt) || a.snapshotId.localeCompare(b.snapshotId))[0];
    return row ? { snapshotId: row.snapshotId, summaryJson: row.summaryJson } : null;
  }
}

export class SqlAnalyticsSnapshotLookupRepository implements AnalyticsSnapshotLookupRepository {
  async getLatestSnapshot(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope: AnalyticsAssetScope, timeframeScope: AnalyticsTimeframeScope, lookbackDays: number): Promise<{ snapshotId: string; summaryJson: string } | null> {
    const rows = await queryDb<LookupRow>(
      `SELECT snapshot_id, summary_json::text AS summary_json
       FROM app_analytics_snapshots
       WHERE subject_kind = $1 AND subject_id = $2 AND asset_scope = $3 AND timeframe_scope = $4 AND lookback_days = $5
       ORDER BY generated_at DESC, snapshot_id ASC
       LIMIT 1`,
      [subjectKind, subjectId, assetScope, timeframeScope, lookbackDays]
    );
    return rows[0] ? { snapshotId: rows[0].snapshot_id, summaryJson: rows[0].summary_json } : null;
  }
}

export class MemoryJournalInfluenceSnapshotLookupRepository implements JournalInfluenceSnapshotLookupRepository {
  constructor(private readonly rows: Array<{ snapshotId: string; subjectKind: 'user' | 'workspace' | 'ops'; subjectId: string; assetScope: AnalyticsAssetScope; timeframeScope: AnalyticsTimeframeScope; generatedAt: string; summaryJson: string }> = []) {}

  setRows(rows: Array<{ snapshotId: string; subjectKind: 'user' | 'workspace' | 'ops'; subjectId: string; assetScope: AnalyticsAssetScope; timeframeScope: AnalyticsTimeframeScope; generatedAt: string; summaryJson: string }>): void {
    this.rows.splice(0, this.rows.length, ...rows);
  }

  async getLatestInfluenceSnapshot(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope: AnalyticsAssetScope, timeframeScope: AnalyticsTimeframeScope): Promise<{ snapshotId: string; summaryJson: string } | null> {
    const row = [...this.rows]
      .filter((item) => item.subjectKind === subjectKind && item.subjectId === subjectId && item.assetScope === assetScope && item.timeframeScope === timeframeScope)
      .sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt) || a.snapshotId.localeCompare(b.snapshotId))[0];
    return row ? { snapshotId: row.snapshotId, summaryJson: row.summaryJson } : null;
  }
}

export class SqlJournalInfluenceSnapshotLookupRepository implements JournalInfluenceSnapshotLookupRepository {
  async getLatestInfluenceSnapshot(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope: AnalyticsAssetScope, timeframeScope: AnalyticsTimeframeScope): Promise<{ snapshotId: string; summaryJson: string } | null> {
    const rows = await queryDb<LookupRow>(
      `SELECT snapshot_id, summary_json::text AS summary_json
       FROM app_journal_influence_snapshots
       WHERE subject_kind = $1 AND subject_id = $2 AND asset_scope = $3 AND timeframe_scope = $4
       ORDER BY generated_at DESC, snapshot_id ASC
       LIMIT 1`,
      [subjectKind, subjectId, assetScope, timeframeScope]
    );
    return rows[0] ? { snapshotId: rows[0].snapshot_id, summaryJson: rows[0].summary_json } : null;
  }
}
