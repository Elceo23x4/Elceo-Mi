import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import { queryDb } from '../db/client';
import type { JournalInfluenceRepository, PersistedJournalInfluenceSnapshotRecord } from './contracts';

function byGeneratedDesc(left: PersistedJournalInfluenceSnapshotRecord, right: PersistedJournalInfluenceSnapshotRecord): number {
  return Date.parse(right.generatedAt) - Date.parse(left.generatedAt) || left.snapshotId.localeCompare(right.snapshotId);
}

function boundedLimit(limit?: number): number {
  return Math.max(1, Math.min(500, limit ?? 50));
}

export class MemoryJournalInfluenceRepository implements JournalInfluenceRepository {
  private readonly snapshots = new Map<string, PersistedJournalInfluenceSnapshotRecord>();

  async saveInfluenceSnapshot(record: PersistedJournalInfluenceSnapshotRecord): Promise<void> {
    this.snapshots.set(record.snapshotId, record);
  }

  async getInfluenceSnapshotById(snapshotId: string): Promise<PersistedJournalInfluenceSnapshotRecord | null> {
    return this.snapshots.get(snapshotId) ?? null;
  }

  async getLatestInfluenceSnapshot(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    assetScope: CanonicalAssetSymbol | '*',
    timeframeScope: Timeframe | '*'
  ): Promise<PersistedJournalInfluenceSnapshotRecord | null> {
    const rows = await this.listInfluenceSnapshots(subjectKind, subjectId, assetScope, timeframeScope, 1);
    return rows[0] ?? null;
  }

  async listInfluenceSnapshots(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    assetScope?: CanonicalAssetSymbol | '*',
    timeframeScope?: Timeframe | '*',
    limit?: number
  ): Promise<PersistedJournalInfluenceSnapshotRecord[]> {
    let rows = [...this.snapshots.values()].filter((row) => row.subjectKind === subjectKind && row.subjectId === subjectId);
    if (assetScope) rows = rows.filter((row) => row.assetScope === assetScope);
    if (timeframeScope) rows = rows.filter((row) => row.timeframeScope === timeframeScope);
    rows.sort(byGeneratedDesc);
    return rows.slice(0, boundedLimit(limit));
  }
}

type SnapshotRow = {
  snapshot_id: string;
  subject_kind: 'user' | 'workspace' | 'ops';
  subject_id: string;
  asset_scope: string;
  timeframe_scope: string;
  generated_at: string;
  reviewed_case_count: number;
  closed_case_count: number;
  recent_case_count: number;
  supporting_case_ids_json: string;
  summary_json: string;
  created_at: string;
};

function mapSnapshotRow(row: SnapshotRow): PersistedJournalInfluenceSnapshotRecord {
  return {
    snapshotId: row.snapshot_id,
    subjectKind: row.subject_kind,
    subjectId: row.subject_id,
    assetScope: row.asset_scope as CanonicalAssetSymbol | '*',
    timeframeScope: row.timeframe_scope as Timeframe | '*',
    generatedAt: row.generated_at,
    reviewedCaseCount: row.reviewed_case_count,
    closedCaseCount: row.closed_case_count,
    recentCaseCount: row.recent_case_count,
    supportingCaseIdsJson: row.supporting_case_ids_json,
    summaryJson: row.summary_json,
    createdAt: row.created_at
  };
}

export class SqlJournalInfluenceRepository implements JournalInfluenceRepository {
  async saveInfluenceSnapshot(record: PersistedJournalInfluenceSnapshotRecord): Promise<void> {
    await queryDb(
      `INSERT INTO app_journal_influence_snapshots (
        snapshot_id, subject_kind, subject_id, asset_scope, timeframe_scope, generated_at,
        reviewed_case_count, closed_case_count, recent_case_count,
        supporting_case_ids_json, summary_json, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12)
      ON CONFLICT (snapshot_id) DO UPDATE SET
        subject_kind=EXCLUDED.subject_kind,
        subject_id=EXCLUDED.subject_id,
        asset_scope=EXCLUDED.asset_scope,
        timeframe_scope=EXCLUDED.timeframe_scope,
        generated_at=EXCLUDED.generated_at,
        reviewed_case_count=EXCLUDED.reviewed_case_count,
        closed_case_count=EXCLUDED.closed_case_count,
        recent_case_count=EXCLUDED.recent_case_count,
        supporting_case_ids_json=EXCLUDED.supporting_case_ids_json,
        summary_json=EXCLUDED.summary_json,
        created_at=EXCLUDED.created_at`,
      [
        record.snapshotId,
        record.subjectKind,
        record.subjectId,
        record.assetScope,
        record.timeframeScope,
        record.generatedAt,
        record.reviewedCaseCount,
        record.closedCaseCount,
        record.recentCaseCount,
        record.supportingCaseIdsJson,
        record.summaryJson,
        record.createdAt
      ]
    );
  }

  async getInfluenceSnapshotById(snapshotId: string): Promise<PersistedJournalInfluenceSnapshotRecord | null> {
    const rows = await queryDb<SnapshotRow>(
      `SELECT snapshot_id, subject_kind, subject_id, asset_scope, timeframe_scope, generated_at,
        reviewed_case_count, closed_case_count, recent_case_count,
        supporting_case_ids_json::text AS supporting_case_ids_json,
        summary_json::text AS summary_json,
        created_at
       FROM app_journal_influence_snapshots
       WHERE snapshot_id = $1`,
      [snapshotId]
    );
    return rows[0] ? mapSnapshotRow(rows[0]) : null;
  }

  async getLatestInfluenceSnapshot(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    assetScope: CanonicalAssetSymbol | '*',
    timeframeScope: Timeframe | '*'
  ): Promise<PersistedJournalInfluenceSnapshotRecord | null> {
    const rows = await this.listInfluenceSnapshots(subjectKind, subjectId, assetScope, timeframeScope, 1);
    return rows[0] ?? null;
  }

  async listInfluenceSnapshots(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    assetScope?: CanonicalAssetSymbol | '*',
    timeframeScope?: Timeframe | '*',
    limit?: number
  ): Promise<PersistedJournalInfluenceSnapshotRecord[]> {
    const clauses = ['subject_kind = $1', 'subject_id = $2'];
    const values: unknown[] = [subjectKind, subjectId];
    if (assetScope) {
      values.push(assetScope);
      clauses.push(`asset_scope = $${values.length}`);
    }
    if (timeframeScope) {
      values.push(timeframeScope);
      clauses.push(`timeframe_scope = $${values.length}`);
    }
    values.push(boundedLimit(limit));
    const rows = await queryDb<SnapshotRow>(
      `SELECT snapshot_id, subject_kind, subject_id, asset_scope, timeframe_scope, generated_at,
        reviewed_case_count, closed_case_count, recent_case_count,
        supporting_case_ids_json::text AS supporting_case_ids_json,
        summary_json::text AS summary_json,
        created_at
       FROM app_journal_influence_snapshots
       WHERE ${clauses.join(' AND ')}
       ORDER BY generated_at DESC, snapshot_id ASC
       LIMIT $${values.length}`,
      values
    );
    return rows.map(mapSnapshotRow);
  }
}

function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

let singleton: JournalInfluenceRepository | null = null;

export function getJournalInfluenceRepository(): JournalInfluenceRepository {
  if (!singleton) {
    singleton = runtimeEnv().APP_STATE_REPOSITORY === 'memory' ? new MemoryJournalInfluenceRepository() : new SqlJournalInfluenceRepository();
  }
  return singleton;
}

export function setJournalInfluenceRepository(next: JournalInfluenceRepository): void {
  singleton = next;
}
