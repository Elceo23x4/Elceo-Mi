import type { AnalyticsAssetScope, AnalyticsTimeframeScope } from '@elceo/types';
import { queryDb } from './db-client';
import type { AnalyticsSnapshotRepository, PersistedAnalyticsSnapshotRecord } from './contracts';

function byGeneratedDesc(left: PersistedAnalyticsSnapshotRecord, right: PersistedAnalyticsSnapshotRecord): number {
  return Date.parse(right.generatedAt) - Date.parse(left.generatedAt) || left.snapshotId.localeCompare(right.snapshotId);
}

function limitValue(limit?: number): number {
  return Math.max(1, Math.min(500, limit ?? 50));
}

export class MemoryAnalyticsSnapshotRepository implements AnalyticsSnapshotRepository {
  private readonly records = new Map<string, PersistedAnalyticsSnapshotRecord>();

  async saveSnapshot(record: PersistedAnalyticsSnapshotRecord): Promise<void> {
    this.records.set(record.snapshotId, record);
  }

  async getSnapshotById(snapshotId: string): Promise<PersistedAnalyticsSnapshotRecord | null> {
    return this.records.get(snapshotId) ?? null;
  }

  async getLatestSnapshot(
    subjectKind: PersistedAnalyticsSnapshotRecord['subjectKind'],
    subjectId: string,
    assetScope: AnalyticsAssetScope,
    timeframeScope: AnalyticsTimeframeScope,
    lookbackDays: number
  ): Promise<PersistedAnalyticsSnapshotRecord | null> {
    const rows = [...this.records.values()]
      .filter((row) => row.subjectKind === subjectKind && row.subjectId === subjectId && row.assetScope === assetScope && row.timeframeScope === timeframeScope && row.lookbackDays === lookbackDays)
      .sort(byGeneratedDesc);
    return rows[0] ?? null;
  }

  async listSnapshots(
    subjectKind: PersistedAnalyticsSnapshotRecord['subjectKind'],
    subjectId: string,
    assetScope?: AnalyticsAssetScope,
    timeframeScope?: AnalyticsTimeframeScope,
    limit?: number
  ): Promise<PersistedAnalyticsSnapshotRecord[]> {
    return [...this.records.values()]
      .filter((row) => row.subjectKind === subjectKind && row.subjectId === subjectId)
      .filter((row) => (assetScope ? row.assetScope === assetScope : true))
      .filter((row) => (timeframeScope ? row.timeframeScope === timeframeScope : true))
      .sort(byGeneratedDesc)
      .slice(0, limitValue(limit));
  }
}

type SnapshotRow = {
  snapshot_id: string;
  subject_kind: PersistedAnalyticsSnapshotRecord['subjectKind'];
  subject_id: string;
  asset_scope: string;
  timeframe_scope: string;
  lookback_days: number;
  generated_at: string;
  closed_case_count: number;
  reviewed_case_count: number;
  win_count: number;
  loss_count: number;
  breakeven_count: number;
  mixed_count: number;
  open_count: number;
  linked_reasoning_count: number;
  linked_drift_count: number;
  avg_r_multiple: number | null;
  avg_pnl_percent: number | null;
  median_r_multiple: number | null;
  median_pnl_percent: number | null;
  win_rate: number | null;
  loss_rate: number | null;
  expectancy_r: number | null;
  discipline_score: number | null;
  adherence_score: number | null;
  setup_patterns_json: string;
  direction_patterns_json: string;
  behavior_patterns_json: string;
  review_insights_json: string;
  supporting_case_ids_json: string;
  summary_json: string;
  created_at: string;
};

function mapRow(row: SnapshotRow): PersistedAnalyticsSnapshotRecord {
  return {
    snapshotId: row.snapshot_id,
    subjectKind: row.subject_kind,
    subjectId: row.subject_id,
    assetScope: row.asset_scope as AnalyticsAssetScope,
    timeframeScope: row.timeframe_scope as AnalyticsTimeframeScope,
    lookbackDays: row.lookback_days,
    generatedAt: row.generated_at,
    closedCaseCount: row.closed_case_count,
    reviewedCaseCount: row.reviewed_case_count,
    winCount: row.win_count,
    lossCount: row.loss_count,
    breakevenCount: row.breakeven_count,
    mixedCount: row.mixed_count,
    openCount: row.open_count,
    linkedReasoningCount: row.linked_reasoning_count,
    linkedDriftCount: row.linked_drift_count,
    avgRMultiple: row.avg_r_multiple,
    avgPnlPercent: row.avg_pnl_percent,
    medianRMultiple: row.median_r_multiple,
    medianPnlPercent: row.median_pnl_percent,
    winRate: row.win_rate,
    lossRate: row.loss_rate,
    expectancyR: row.expectancy_r,
    disciplineScore: row.discipline_score,
    adherenceScore: row.adherence_score,
    setupPatternsJson: row.setup_patterns_json,
    directionPatternsJson: row.direction_patterns_json,
    behaviorPatternsJson: row.behavior_patterns_json,
    reviewInsightsJson: row.review_insights_json,
    supportingCaseIdsJson: row.supporting_case_ids_json,
    summaryJson: row.summary_json,
    createdAt: row.created_at
  };
}

export class SqlAnalyticsSnapshotRepository implements AnalyticsSnapshotRepository {
  async saveSnapshot(record: PersistedAnalyticsSnapshotRecord): Promise<void> {
    await queryDb(
      `INSERT INTO app_analytics_snapshots (
         snapshot_id, subject_kind, subject_id, asset_scope, timeframe_scope, lookback_days, generated_at,
         closed_case_count, reviewed_case_count, win_count, loss_count, breakeven_count, mixed_count, open_count,
         linked_reasoning_count, linked_drift_count, avg_r_multiple, avg_pnl_percent, median_r_multiple,
         median_pnl_percent, win_rate, loss_rate, expectancy_r, discipline_score, adherence_score,
         setup_patterns_json, direction_patterns_json, behavior_patterns_json, review_insights_json,
         supporting_case_ids_json, summary_json, created_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,
         $8,$9,$10,$11,$12,$13,$14,
         $15,$16,$17,$18,$19,
         $20,$21,$22,$23,$24,$25,
         $26::jsonb,$27::jsonb,$28::jsonb,$29::jsonb,
         $30::jsonb,$31::jsonb,$32
       ) ON CONFLICT (snapshot_id) DO UPDATE SET
         subject_kind = EXCLUDED.subject_kind,
         subject_id = EXCLUDED.subject_id,
         asset_scope = EXCLUDED.asset_scope,
         timeframe_scope = EXCLUDED.timeframe_scope,
         lookback_days = EXCLUDED.lookback_days,
         generated_at = EXCLUDED.generated_at,
         closed_case_count = EXCLUDED.closed_case_count,
         reviewed_case_count = EXCLUDED.reviewed_case_count,
         win_count = EXCLUDED.win_count,
         loss_count = EXCLUDED.loss_count,
         breakeven_count = EXCLUDED.breakeven_count,
         mixed_count = EXCLUDED.mixed_count,
         open_count = EXCLUDED.open_count,
         linked_reasoning_count = EXCLUDED.linked_reasoning_count,
         linked_drift_count = EXCLUDED.linked_drift_count,
         avg_r_multiple = EXCLUDED.avg_r_multiple,
         avg_pnl_percent = EXCLUDED.avg_pnl_percent,
         median_r_multiple = EXCLUDED.median_r_multiple,
         median_pnl_percent = EXCLUDED.median_pnl_percent,
         win_rate = EXCLUDED.win_rate,
         loss_rate = EXCLUDED.loss_rate,
         expectancy_r = EXCLUDED.expectancy_r,
         discipline_score = EXCLUDED.discipline_score,
         adherence_score = EXCLUDED.adherence_score,
         setup_patterns_json = EXCLUDED.setup_patterns_json,
         direction_patterns_json = EXCLUDED.direction_patterns_json,
         behavior_patterns_json = EXCLUDED.behavior_patterns_json,
         review_insights_json = EXCLUDED.review_insights_json,
         supporting_case_ids_json = EXCLUDED.supporting_case_ids_json,
         summary_json = EXCLUDED.summary_json,
         created_at = EXCLUDED.created_at`,
      [
        record.snapshotId, record.subjectKind, record.subjectId, record.assetScope, record.timeframeScope, record.lookbackDays, record.generatedAt,
        record.closedCaseCount, record.reviewedCaseCount, record.winCount, record.lossCount, record.breakevenCount, record.mixedCount, record.openCount,
        record.linkedReasoningCount, record.linkedDriftCount, record.avgRMultiple, record.avgPnlPercent, record.medianRMultiple,
        record.medianPnlPercent, record.winRate, record.lossRate, record.expectancyR, record.disciplineScore, record.adherenceScore,
        record.setupPatternsJson, record.directionPatternsJson, record.behaviorPatternsJson, record.reviewInsightsJson,
        record.supportingCaseIdsJson, record.summaryJson, record.createdAt
      ]
    );
  }

  async getSnapshotById(snapshotId: string): Promise<PersistedAnalyticsSnapshotRecord | null> {
    const rows = await queryDb<SnapshotRow>(
      `SELECT snapshot_id, subject_kind, subject_id, asset_scope, timeframe_scope, lookback_days,
              generated_at, closed_case_count, reviewed_case_count, win_count, loss_count,
              breakeven_count, mixed_count, open_count, linked_reasoning_count, linked_drift_count,
              avg_r_multiple, avg_pnl_percent, median_r_multiple, median_pnl_percent, win_rate,
              loss_rate, expectancy_r, discipline_score, adherence_score,
              setup_patterns_json::text AS setup_patterns_json,
              direction_patterns_json::text AS direction_patterns_json,
              behavior_patterns_json::text AS behavior_patterns_json,
              review_insights_json::text AS review_insights_json,
              supporting_case_ids_json::text AS supporting_case_ids_json,
              summary_json::text AS summary_json,
              created_at
       FROM app_analytics_snapshots WHERE snapshot_id = $1`,
      [snapshotId]
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async getLatestSnapshot(subjectKind: PersistedAnalyticsSnapshotRecord['subjectKind'], subjectId: string, assetScope: AnalyticsAssetScope, timeframeScope: AnalyticsTimeframeScope, lookbackDays: number): Promise<PersistedAnalyticsSnapshotRecord | null> {
    const rows = await queryDb<SnapshotRow>(
      `SELECT snapshot_id, subject_kind, subject_id, asset_scope, timeframe_scope, lookback_days,
              generated_at, closed_case_count, reviewed_case_count, win_count, loss_count,
              breakeven_count, mixed_count, open_count, linked_reasoning_count, linked_drift_count,
              avg_r_multiple, avg_pnl_percent, median_r_multiple, median_pnl_percent, win_rate,
              loss_rate, expectancy_r, discipline_score, adherence_score,
              setup_patterns_json::text AS setup_patterns_json,
              direction_patterns_json::text AS direction_patterns_json,
              behavior_patterns_json::text AS behavior_patterns_json,
              review_insights_json::text AS review_insights_json,
              supporting_case_ids_json::text AS supporting_case_ids_json,
              summary_json::text AS summary_json,
              created_at
       FROM app_analytics_snapshots
       WHERE subject_kind = $1 AND subject_id = $2 AND asset_scope = $3 AND timeframe_scope = $4 AND lookback_days = $5
       ORDER BY generated_at DESC, snapshot_id ASC
       LIMIT 1`,
      [subjectKind, subjectId, assetScope, timeframeScope, lookbackDays]
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async listSnapshots(subjectKind: PersistedAnalyticsSnapshotRecord['subjectKind'], subjectId: string, assetScope?: AnalyticsAssetScope, timeframeScope?: AnalyticsTimeframeScope, limit?: number): Promise<PersistedAnalyticsSnapshotRecord[]> {
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
    values.push(limitValue(limit));

    const rows = await queryDb<SnapshotRow>(
      `SELECT snapshot_id, subject_kind, subject_id, asset_scope, timeframe_scope, lookback_days,
              generated_at, closed_case_count, reviewed_case_count, win_count, loss_count,
              breakeven_count, mixed_count, open_count, linked_reasoning_count, linked_drift_count,
              avg_r_multiple, avg_pnl_percent, median_r_multiple, median_pnl_percent, win_rate,
              loss_rate, expectancy_r, discipline_score, adherence_score,
              setup_patterns_json::text AS setup_patterns_json,
              direction_patterns_json::text AS direction_patterns_json,
              behavior_patterns_json::text AS behavior_patterns_json,
              review_insights_json::text AS review_insights_json,
              supporting_case_ids_json::text AS supporting_case_ids_json,
              summary_json::text AS summary_json,
              created_at
       FROM app_analytics_snapshots
       WHERE ${where.join(' AND ')}
       ORDER BY generated_at DESC, snapshot_id ASC
       LIMIT $${values.length}`,
      values
    );

    return rows.map(mapRow);
  }
}
