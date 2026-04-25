import type { SnapshotDomainKind } from '@elceo/types';
import { queryDb } from '../db/client';
import type {
  PersistedSnapshotFreshnessRecord,
  PersistedSnapshotRefreshRunRecord,
  SnapshotFreshnessRepository,
  SnapshotRefreshRunRepository
} from './contracts';

function capLimit(limit?: number): number {
  return Math.max(1, Math.min(500, limit ?? 50));
}

function sortRuns(left: PersistedSnapshotRefreshRunRecord, right: PersistedSnapshotRefreshRunRecord): number {
  return Date.parse(right.generatedAt) - Date.parse(left.generatedAt) || left.refreshRunId.localeCompare(right.refreshRunId);
}

function sortFreshness(left: PersistedSnapshotFreshnessRecord, right: PersistedSnapshotFreshnessRecord): number {
  return Date.parse(right.updatedAt) - Date.parse(left.updatedAt) || left.freshnessId.localeCompare(right.freshnessId);
}

const NEEDING_STATES = new Set(['failed', 'stale', 'missing']);

export class MemorySnapshotRefreshRunRepository implements SnapshotRefreshRunRepository {
  private readonly runs = new Map<string, PersistedSnapshotRefreshRunRecord>();

  async saveRun(record: PersistedSnapshotRefreshRunRecord): Promise<void> {
    this.runs.set(record.refreshRunId, record);
  }

  async getRunById(refreshRunId: string): Promise<PersistedSnapshotRefreshRunRecord | null> {
    return this.runs.get(refreshRunId) ?? null;
  }

  async listRecentRuns(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit?: number): Promise<PersistedSnapshotRefreshRunRecord[]> {
    return [...this.runs.values()]
      .filter((row) => row.subjectKind === subjectKind && row.subjectId === subjectId)
      .sort(sortRuns)
      .slice(0, capLimit(limit));
  }

  async getLatestRun(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<PersistedSnapshotRefreshRunRecord | null> {
    const list = await this.listRecentRuns(subjectKind, subjectId, 1);
    return list[0] ?? null;
  }
}

export class MemorySnapshotFreshnessRepository implements SnapshotFreshnessRepository {
  private readonly rows = new Map<string, PersistedSnapshotFreshnessRecord>();

  private keyOf(record: Pick<PersistedSnapshotFreshnessRecord, 'domain' | 'subjectKind' | 'subjectId' | 'assetScope' | 'timeframeScope'>): string {
    return `${record.domain}|${record.subjectKind}|${record.subjectId}|${record.assetScope}|${record.timeframeScope}`;
  }

  async upsertFreshness(record: PersistedSnapshotFreshnessRecord): Promise<void> {
    this.rows.set(this.keyOf(record), record);
  }

  async getFreshness(
    domain: SnapshotDomainKind,
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    assetScope: PersistedSnapshotFreshnessRecord['assetScope'],
    timeframeScope: PersistedSnapshotFreshnessRecord['timeframeScope']
  ): Promise<PersistedSnapshotFreshnessRecord | null> {
    return this.rows.get(this.keyOf({ domain, subjectKind, subjectId, assetScope, timeframeScope })) ?? null;
  }

  async listFreshnessForSubject(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<PersistedSnapshotFreshnessRecord[]> {
    return [...this.rows.values()]
      .filter((row) => row.subjectKind === subjectKind && row.subjectId === subjectId)
      .sort(sortFreshness);
  }

  async listDomainsNeedingRefresh(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<PersistedSnapshotFreshnessRecord[]> {
    return (await this.listFreshnessForSubject(subjectKind, subjectId)).filter((row) => NEEDING_STATES.has(row.freshnessState));
  }
}

type RefreshRunRow = {
  refresh_run_id: string;
  subject_kind: PersistedSnapshotRefreshRunRecord['subjectKind'];
  subject_id: string;
  trigger_kind: PersistedSnapshotRefreshRunRecord['triggerKind'];
  overall_status: PersistedSnapshotRefreshRunRecord['overallStatus'];
  generated_at: string;
  refreshed_domains_json: string;
  failed_domains_json: string;
  stale_domains_json: string;
  warnings_json: string;
  report_json: string;
  created_at: string;
};

function mapRunRow(row: RefreshRunRow): PersistedSnapshotRefreshRunRecord {
  return {
    refreshRunId: row.refresh_run_id,
    subjectKind: row.subject_kind,
    subjectId: row.subject_id,
    triggerKind: row.trigger_kind,
    overallStatus: row.overall_status,
    generatedAt: row.generated_at,
    refreshedDomainsJson: row.refreshed_domains_json,
    failedDomainsJson: row.failed_domains_json,
    staleDomainsJson: row.stale_domains_json,
    warningsJson: row.warnings_json,
    reportJson: row.report_json,
    createdAt: row.created_at
  };
}

export class SqlSnapshotRefreshRunRepository implements SnapshotRefreshRunRepository {
  async saveRun(record: PersistedSnapshotRefreshRunRecord): Promise<void> {
    await queryDb(
      `INSERT INTO app_snapshot_refresh_runs (
        refresh_run_id, subject_kind, subject_id, trigger_kind, overall_status, generated_at,
        refreshed_domains_json, failed_domains_json, stale_domains_json, warnings_json, report_json, created_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12
      ) ON CONFLICT (refresh_run_id) DO UPDATE SET
        subject_kind=EXCLUDED.subject_kind,
        subject_id=EXCLUDED.subject_id,
        trigger_kind=EXCLUDED.trigger_kind,
        overall_status=EXCLUDED.overall_status,
        generated_at=EXCLUDED.generated_at,
        refreshed_domains_json=EXCLUDED.refreshed_domains_json,
        failed_domains_json=EXCLUDED.failed_domains_json,
        stale_domains_json=EXCLUDED.stale_domains_json,
        warnings_json=EXCLUDED.warnings_json,
        report_json=EXCLUDED.report_json,
        created_at=EXCLUDED.created_at`,
      [
        record.refreshRunId,
        record.subjectKind,
        record.subjectId,
        record.triggerKind,
        record.overallStatus,
        record.generatedAt,
        record.refreshedDomainsJson,
        record.failedDomainsJson,
        record.staleDomainsJson,
        record.warningsJson,
        record.reportJson,
        record.createdAt
      ]
    );
  }

  async getRunById(refreshRunId: string): Promise<PersistedSnapshotRefreshRunRecord | null> {
    const rows = await queryDb<RefreshRunRow>(
      `SELECT refresh_run_id, subject_kind, subject_id, trigger_kind, overall_status, generated_at,
              refreshed_domains_json::text AS refreshed_domains_json,
              failed_domains_json::text AS failed_domains_json,
              stale_domains_json::text AS stale_domains_json,
              warnings_json::text AS warnings_json,
              report_json::text AS report_json,
              created_at
       FROM app_snapshot_refresh_runs
       WHERE refresh_run_id = $1`,
      [refreshRunId]
    );
    return rows[0] ? mapRunRow(rows[0]) : null;
  }

  async listRecentRuns(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit?: number): Promise<PersistedSnapshotRefreshRunRecord[]> {
    const rows = await queryDb<RefreshRunRow>(
      `SELECT refresh_run_id, subject_kind, subject_id, trigger_kind, overall_status, generated_at,
              refreshed_domains_json::text AS refreshed_domains_json,
              failed_domains_json::text AS failed_domains_json,
              stale_domains_json::text AS stale_domains_json,
              warnings_json::text AS warnings_json,
              report_json::text AS report_json,
              created_at
       FROM app_snapshot_refresh_runs
       WHERE subject_kind = $1 AND subject_id = $2
       ORDER BY generated_at DESC, refresh_run_id ASC
       LIMIT $3`,
      [subjectKind, subjectId, capLimit(limit)]
    );
    return rows.map(mapRunRow);
  }

  async getLatestRun(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<PersistedSnapshotRefreshRunRecord | null> {
    const rows = await this.listRecentRuns(subjectKind, subjectId, 1);
    return rows[0] ?? null;
  }
}

type FreshnessRow = {
  freshness_id: string;
  domain: PersistedSnapshotFreshnessRecord['domain'];
  subject_kind: PersistedSnapshotFreshnessRecord['subjectKind'];
  subject_id: string;
  asset_scope: string;
  timeframe_scope: string;
  latest_snapshot_id: string | null;
  freshness_state: PersistedSnapshotFreshnessRecord['freshnessState'];
  dependency_state: PersistedSnapshotFreshnessRecord['dependencyState'];
  snapshot_generated_at: string | null;
  evaluated_at: string;
  age_minutes: number | null;
  max_fresh_minutes: number;
  failure_reason: string | null;
  updated_at: string;
};

function mapFreshnessRow(row: FreshnessRow): PersistedSnapshotFreshnessRecord {
  return {
    freshnessId: row.freshness_id,
    domain: row.domain,
    subjectKind: row.subject_kind,
    subjectId: row.subject_id,
    assetScope: row.asset_scope as PersistedSnapshotFreshnessRecord['assetScope'],
    timeframeScope: row.timeframe_scope as PersistedSnapshotFreshnessRecord['timeframeScope'],
    latestSnapshotId: row.latest_snapshot_id,
    freshnessState: row.freshness_state,
    dependencyState: row.dependency_state,
    snapshotGeneratedAt: row.snapshot_generated_at,
    evaluatedAt: row.evaluated_at,
    ageMinutes: row.age_minutes,
    maxFreshMinutes: row.max_fresh_minutes,
    failureReason: row.failure_reason,
    updatedAt: row.updated_at
  };
}

export class SqlSnapshotFreshnessRepository implements SnapshotFreshnessRepository {
  async upsertFreshness(record: PersistedSnapshotFreshnessRecord): Promise<void> {
    await queryDb(
      `INSERT INTO app_snapshot_freshness (
        freshness_id, domain, subject_kind, subject_id, asset_scope, timeframe_scope,
        latest_snapshot_id, freshness_state, dependency_state, snapshot_generated_at,
        evaluated_at, age_minutes, max_fresh_minutes, failure_reason, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,
        $11,$12,$13,$14,$15
      ) ON CONFLICT (domain, subject_kind, subject_id, asset_scope, timeframe_scope)
      DO UPDATE SET
        freshness_id=EXCLUDED.freshness_id,
        latest_snapshot_id=EXCLUDED.latest_snapshot_id,
        freshness_state=EXCLUDED.freshness_state,
        dependency_state=EXCLUDED.dependency_state,
        snapshot_generated_at=EXCLUDED.snapshot_generated_at,
        evaluated_at=EXCLUDED.evaluated_at,
        age_minutes=EXCLUDED.age_minutes,
        max_fresh_minutes=EXCLUDED.max_fresh_minutes,
        failure_reason=EXCLUDED.failure_reason,
        updated_at=EXCLUDED.updated_at`,
      [
        record.freshnessId,
        record.domain,
        record.subjectKind,
        record.subjectId,
        record.assetScope,
        record.timeframeScope,
        record.latestSnapshotId,
        record.freshnessState,
        record.dependencyState,
        record.snapshotGeneratedAt,
        record.evaluatedAt,
        record.ageMinutes,
        record.maxFreshMinutes,
        record.failureReason,
        record.updatedAt
      ]
    );
  }

  async getFreshness(
    domain: SnapshotDomainKind,
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    assetScope: PersistedSnapshotFreshnessRecord['assetScope'],
    timeframeScope: PersistedSnapshotFreshnessRecord['timeframeScope']
  ): Promise<PersistedSnapshotFreshnessRecord | null> {
    const rows = await queryDb<FreshnessRow>(
      `SELECT freshness_id, domain, subject_kind, subject_id, asset_scope, timeframe_scope,
              latest_snapshot_id, freshness_state, dependency_state, snapshot_generated_at,
              evaluated_at, age_minutes, max_fresh_minutes, failure_reason, updated_at
       FROM app_snapshot_freshness
       WHERE domain = $1 AND subject_kind = $2 AND subject_id = $3 AND asset_scope = $4 AND timeframe_scope = $5`,
      [domain, subjectKind, subjectId, assetScope, timeframeScope]
    );
    return rows[0] ? mapFreshnessRow(rows[0]) : null;
  }

  async listFreshnessForSubject(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<PersistedSnapshotFreshnessRecord[]> {
    const rows = await queryDb<FreshnessRow>(
      `SELECT freshness_id, domain, subject_kind, subject_id, asset_scope, timeframe_scope,
              latest_snapshot_id, freshness_state, dependency_state, snapshot_generated_at,
              evaluated_at, age_minutes, max_fresh_minutes, failure_reason, updated_at
       FROM app_snapshot_freshness
       WHERE subject_kind = $1 AND subject_id = $2
       ORDER BY updated_at DESC, freshness_id ASC`,
      [subjectKind, subjectId]
    );
    return rows.map(mapFreshnessRow);
  }

  async listDomainsNeedingRefresh(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<PersistedSnapshotFreshnessRecord[]> {
    const rows = await queryDb<FreshnessRow>(
      `SELECT freshness_id, domain, subject_kind, subject_id, asset_scope, timeframe_scope,
              latest_snapshot_id, freshness_state, dependency_state, snapshot_generated_at,
              evaluated_at, age_minutes, max_fresh_minutes, failure_reason, updated_at
       FROM app_snapshot_freshness
       WHERE subject_kind = $1 AND subject_id = $2
         AND freshness_state IN ('failed','stale','missing')
       ORDER BY updated_at DESC, freshness_id ASC`,
      [subjectKind, subjectId]
    );
    return rows.map(mapFreshnessRow);
  }
}

function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

let refreshRunSingleton: SnapshotRefreshRunRepository | null = null;
let freshnessSingleton: SnapshotFreshnessRepository | null = null;

export function getSnapshotRefreshRunRepository(): SnapshotRefreshRunRepository {
  if (!refreshRunSingleton) {
    refreshRunSingleton = runtimeEnv().APP_STATE_REPOSITORY === 'memory' ? new MemorySnapshotRefreshRunRepository() : new SqlSnapshotRefreshRunRepository();
  }
  return refreshRunSingleton;
}

export function setSnapshotRefreshRunRepository(next: SnapshotRefreshRunRepository): void {
  refreshRunSingleton = next;
}

export function getSnapshotFreshnessRepository(): SnapshotFreshnessRepository {
  if (!freshnessSingleton) {
    freshnessSingleton = runtimeEnv().APP_STATE_REPOSITORY === 'memory' ? new MemorySnapshotFreshnessRepository() : new SqlSnapshotFreshnessRepository();
  }
  return freshnessSingleton;
}

export function setSnapshotFreshnessRepository(next: SnapshotFreshnessRepository): void {
  freshnessSingleton = next;
}
