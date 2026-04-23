import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import type { CognitionSnapshotRepository, PersistedCognitionSnapshot, PersistedReasoningRun, ReasoningPersistenceRepository, ReasoningRunRepository } from './contracts';

function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

type QueryRow = Record<string, unknown>;
type PoolLike = { query: (sql: string, params?: unknown[]) => Promise<{ rows: QueryRow[] }> };

let poolPromise: Promise<PoolLike> | null = null;

async function getPool(): Promise<PoolLike> {
  if (!poolPromise) {
    poolPromise = (async () => {
      const module = await import('pg');
      return new module.Pool({ connectionString: runtimeEnv().DATABASE_URL }) as unknown as PoolLike;
    })();
  }
  return poolPromise;
}

async function queryDb<T extends QueryRow = QueryRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const pool = await getPool();
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

type RunRow = {
  reasoning_run_id: string;
  asset: string;
  timeframe: string;
  source_ingestion_run_id: string | null;
  source_ingestion_request_key: string | null;
  engine_name: string;
  reasoning_version: string;
  scoring_version: string;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  status: PersistedReasoningRun['status'];
  input_event_count: number;
  input_zone_count: number;
  projected_evidence_count: number;
  prior_snapshot_id: string | null;
  snapshot_id: string | null;
  failure_reason: string | null;
  warnings_json: string;
  created_at: string;
};

function mapRunRow(row: RunRow): PersistedReasoningRun {
  return {
    reasoningRunId: row.reasoning_run_id,
    asset: row.asset,
    timeframe: row.timeframe as Timeframe,
    sourceIngestionRunId: row.source_ingestion_run_id,
    sourceIngestionRequestKey: row.source_ingestion_request_key,
    engineName: row.engine_name,
    reasoningVersion: row.reasoning_version,
    scoringVersion: row.scoring_version,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMs: row.duration_ms,
    status: row.status,
    inputEventCount: row.input_event_count,
    inputZoneCount: row.input_zone_count,
    projectedEvidenceCount: row.projected_evidence_count,
    priorSnapshotId: row.prior_snapshot_id,
    snapshotId: row.snapshot_id,
    failureReason: row.failure_reason,
    warningsJson: row.warnings_json,
    createdAt: row.created_at
  };
}

type SnapshotRow = {
  snapshot_id: string;
  reasoning_run_id: string;
  asset: string;
  timeframe: string;
  evaluated_at: string;
  bias: PersistedCognitionSnapshot['bias'];
  confidence_score: number;
  contradiction_score: number;
  freshness_score: number;
  source_ingestion_run_id: string | null;
  source_ingestion_request_key: string | null;
  reasoning_version: string;
  scoring_version: string;
  cognition_json: string;
  created_at: string;
};

function mapSnapshotRow(row: SnapshotRow): PersistedCognitionSnapshot {
  return {
    snapshotId: row.snapshot_id,
    reasoningRunId: row.reasoning_run_id,
    asset: row.asset,
    timeframe: row.timeframe as Timeframe,
    evaluatedAt: row.evaluated_at,
    bias: row.bias,
    confidenceScore: row.confidence_score,
    contradictionScore: row.contradiction_score,
    freshnessScore: row.freshness_score,
    sourceIngestionRunId: row.source_ingestion_run_id,
    sourceIngestionRequestKey: row.source_ingestion_request_key,
    reasoningVersion: row.reasoning_version,
    scoringVersion: row.scoring_version,
    cognitionJson: row.cognition_json,
    createdAt: row.created_at
  };
}

export class SqlReasoningRunRepository implements ReasoningRunRepository {
  async saveReasoningRun(record: PersistedReasoningRun): Promise<void> {
    await queryDb(
      `INSERT INTO app_reasoning_runs (
        reasoning_run_id, asset, timeframe, source_ingestion_run_id, source_ingestion_request_key,
        engine_name, reasoning_version, scoring_version, started_at, ended_at,
        duration_ms, status, input_event_count, input_zone_count, projected_evidence_count,
        prior_snapshot_id, snapshot_id, failure_reason, warnings_json, created_at
      ) VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,
        $16,$17,$18,$19,$20
      )
      ON CONFLICT (reasoning_run_id) DO UPDATE SET
        asset=EXCLUDED.asset,
        timeframe=EXCLUDED.timeframe,
        source_ingestion_run_id=EXCLUDED.source_ingestion_run_id,
        source_ingestion_request_key=EXCLUDED.source_ingestion_request_key,
        engine_name=EXCLUDED.engine_name,
        reasoning_version=EXCLUDED.reasoning_version,
        scoring_version=EXCLUDED.scoring_version,
        started_at=EXCLUDED.started_at,
        ended_at=EXCLUDED.ended_at,
        duration_ms=EXCLUDED.duration_ms,
        status=EXCLUDED.status,
        input_event_count=EXCLUDED.input_event_count,
        input_zone_count=EXCLUDED.input_zone_count,
        projected_evidence_count=EXCLUDED.projected_evidence_count,
        prior_snapshot_id=EXCLUDED.prior_snapshot_id,
        snapshot_id=EXCLUDED.snapshot_id,
        failure_reason=EXCLUDED.failure_reason,
        warnings_json=EXCLUDED.warnings_json,
        created_at=EXCLUDED.created_at`,
      [
        record.reasoningRunId, record.asset, record.timeframe, record.sourceIngestionRunId, record.sourceIngestionRequestKey,
        record.engineName, record.reasoningVersion, record.scoringVersion, record.startedAt, record.endedAt,
        record.durationMs, record.status, record.inputEventCount, record.inputZoneCount, record.projectedEvidenceCount,
        record.priorSnapshotId, record.snapshotId, record.failureReason, record.warningsJson, record.createdAt
      ]
    );
  }

  async getReasoningRunById(reasoningRunId: string): Promise<PersistedReasoningRun | null> {
    const rows = await queryDb<RunRow>(
      `SELECT reasoning_run_id, asset, timeframe, source_ingestion_run_id, source_ingestion_request_key,
        engine_name, reasoning_version, scoring_version, started_at, ended_at,
        duration_ms, status, input_event_count, input_zone_count, projected_evidence_count,
        prior_snapshot_id, snapshot_id, failure_reason, warnings_json::text as warnings_json, created_at
       FROM app_reasoning_runs WHERE reasoning_run_id = $1`,
      [reasoningRunId]
    );
    return rows[0] ? mapRunRow(rows[0]) : null;
  }

  async getLatestReasoningRunForAssetTimeframe(asset: CanonicalAssetSymbol, timeframe: Timeframe): Promise<PersistedReasoningRun | null> {
    const rows = await queryDb<RunRow>(
      `SELECT reasoning_run_id, asset, timeframe, source_ingestion_run_id, source_ingestion_request_key,
        engine_name, reasoning_version, scoring_version, started_at, ended_at,
        duration_ms, status, input_event_count, input_zone_count, projected_evidence_count,
        prior_snapshot_id, snapshot_id, failure_reason, warnings_json::text as warnings_json, created_at
       FROM app_reasoning_runs WHERE asset = $1 AND timeframe = $2
       ORDER BY created_at DESC, reasoning_run_id ASC LIMIT 1`,
      [asset, timeframe]
    );
    return rows[0] ? mapRunRow(rows[0]) : null;
  }

  async listRecentReasoningRuns(params: { limit: number; asset?: CanonicalAssetSymbol; timeframe?: Timeframe; status?: PersistedReasoningRun['status'] }): Promise<PersistedReasoningRun[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (params.asset) {
      values.push(params.asset);
      clauses.push(`asset = $${values.length}`);
    }
    if (params.timeframe) {
      values.push(params.timeframe);
      clauses.push(`timeframe = $${values.length}`);
    }
    if (params.status) {
      values.push(params.status);
      clauses.push(`status = $${values.length}`);
    }
    values.push(params.limit);
    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = await queryDb<RunRow>(
      `SELECT reasoning_run_id, asset, timeframe, source_ingestion_run_id, source_ingestion_request_key,
        engine_name, reasoning_version, scoring_version, started_at, ended_at,
        duration_ms, status, input_event_count, input_zone_count, projected_evidence_count,
        prior_snapshot_id, snapshot_id, failure_reason, warnings_json::text as warnings_json, created_at
       FROM app_reasoning_runs ${whereSql}
       ORDER BY created_at DESC, reasoning_run_id ASC LIMIT $${values.length}`,
      values
    );
    return rows.map(mapRunRow);
  }
}

export class SqlCognitionSnapshotRepository implements CognitionSnapshotRepository {
  async saveCognitionSnapshot(record: PersistedCognitionSnapshot): Promise<void> {
    await queryDb(
      `INSERT INTO app_cognition_snapshots (
        snapshot_id, reasoning_run_id, asset, timeframe, evaluated_at, bias, confidence_score, contradiction_score,
        freshness_score, source_ingestion_run_id, source_ingestion_request_key, reasoning_version,
        scoring_version, cognition_json, created_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10,$11,$12,
        $13,$14,$15
      )
      ON CONFLICT (snapshot_id) DO UPDATE SET
        reasoning_run_id=EXCLUDED.reasoning_run_id,
        asset=EXCLUDED.asset,
        timeframe=EXCLUDED.timeframe,
        evaluated_at=EXCLUDED.evaluated_at,
        bias=EXCLUDED.bias,
        confidence_score=EXCLUDED.confidence_score,
        contradiction_score=EXCLUDED.contradiction_score,
        freshness_score=EXCLUDED.freshness_score,
        source_ingestion_run_id=EXCLUDED.source_ingestion_run_id,
        source_ingestion_request_key=EXCLUDED.source_ingestion_request_key,
        reasoning_version=EXCLUDED.reasoning_version,
        scoring_version=EXCLUDED.scoring_version,
        cognition_json=EXCLUDED.cognition_json,
        created_at=EXCLUDED.created_at`,
      [
        record.snapshotId, record.reasoningRunId, record.asset, record.timeframe, record.evaluatedAt, record.bias, record.confidenceScore, record.contradictionScore,
        record.freshnessScore, record.sourceIngestionRunId, record.sourceIngestionRequestKey, record.reasoningVersion,
        record.scoringVersion, record.cognitionJson, record.createdAt
      ]
    );
  }

  async getSnapshotById(snapshotId: string): Promise<PersistedCognitionSnapshot | null> {
    const rows = await queryDb<SnapshotRow>(
      `SELECT snapshot_id, reasoning_run_id, asset, timeframe, evaluated_at, bias,
        confidence_score, contradiction_score, freshness_score,
        source_ingestion_run_id, source_ingestion_request_key, reasoning_version,
        scoring_version, cognition_json::text as cognition_json, created_at
       FROM app_cognition_snapshots WHERE snapshot_id = $1`,
      [snapshotId]
    );
    return rows[0] ? mapSnapshotRow(rows[0]) : null;
  }

  async getSnapshotByReasoningRunId(reasoningRunId: string): Promise<PersistedCognitionSnapshot | null> {
    const rows = await queryDb<SnapshotRow>(
      `SELECT snapshot_id, reasoning_run_id, asset, timeframe, evaluated_at, bias,
        confidence_score, contradiction_score, freshness_score,
        source_ingestion_run_id, source_ingestion_request_key, reasoning_version,
        scoring_version, cognition_json::text as cognition_json, created_at
       FROM app_cognition_snapshots WHERE reasoning_run_id = $1`,
      [reasoningRunId]
    );
    return rows[0] ? mapSnapshotRow(rows[0]) : null;
  }

  async getLatestSnapshotForAssetTimeframe(asset: CanonicalAssetSymbol, timeframe: Timeframe, beforeIso?: string): Promise<PersistedCognitionSnapshot | null> {
    const values: unknown[] = [asset, timeframe];
    const beforeClause = beforeIso ? `AND evaluated_at < $3` : '';
    if (beforeIso) values.push(beforeIso);
    const rows = await queryDb<SnapshotRow>(
      `SELECT snapshot_id, reasoning_run_id, asset, timeframe, evaluated_at, bias,
        confidence_score, contradiction_score, freshness_score,
        source_ingestion_run_id, source_ingestion_request_key, reasoning_version,
        scoring_version, cognition_json::text as cognition_json, created_at
       FROM app_cognition_snapshots
       WHERE asset = $1 AND timeframe = $2 ${beforeClause}
       ORDER BY evaluated_at DESC, snapshot_id ASC LIMIT 1`,
      values
    );
    return rows[0] ? mapSnapshotRow(rows[0]) : null;
  }
}

export class SqlReasoningPersistenceRepository implements ReasoningPersistenceRepository {
  readonly runRepository: ReasoningRunRepository;
  readonly snapshotRepository: CognitionSnapshotRepository;

  constructor(
    runRepository: ReasoningRunRepository = new SqlReasoningRunRepository(),
    snapshotRepository: CognitionSnapshotRepository = new SqlCognitionSnapshotRepository()
  ) {
    this.runRepository = runRepository;
    this.snapshotRepository = snapshotRepository;
  }
}
