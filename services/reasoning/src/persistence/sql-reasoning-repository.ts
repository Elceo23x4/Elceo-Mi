import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import { decodeTupleCursor } from '../historical-analog-memory/identity';
import { normalizeHistoricalAnalogPageLimit } from '../historical-analog-memory/policy';
import { SqlHistoricalAnalogRepository } from '../historical-analog-memory/sql-repository';
import type { HistoricalAnalogRepository } from '../historical-analog-memory/contracts';
import { SqlContradictionActionProtocolRepository } from '../contradiction-action-protocol/sql-repository';
import type { ContradictionActionProtocolRepository } from '../contradiction-action-protocol/repository';
import { SqlPersistedContradictionInputRepository } from '../contradiction-action-protocol/sql-input-repository';
import type { PersistedContradictionInputRepository } from '../contradiction-action-protocol/input-repository';
import { SqlMarketSessionLiquidityContextRepository } from '../market-cleanliness/sql-context-repository';
import { SqlMarketCleanlinessRepository } from '../market-cleanliness/sql-repository';
import type { MarketSessionLiquidityContextRepository } from '../market-cleanliness/context-repository';
import type { MarketCleanlinessRepository } from '../market-cleanliness/repository';
import { SqlNarrativeContinuationObservationRepository } from '../narrative-decay/sql-observation-repository';
import { SqlNarrativeDecayRepository } from '../narrative-decay/sql-repository';
import type { NarrativeContinuationObservationRepository } from '../narrative-decay/observation-repository';
import type { NarrativeDecayRepository } from '../narrative-decay/repository';
import type {
  CognitionDriftRepository,
  CognitionSnapshotRepository,
  PersistedCognitionDriftRecord,
  PersistedCognitionSnapshot,
  PersistedReasoningRun,
  ReasoningPersistenceRepository,
  ReasoningRunRepository
} from './contracts';

function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

type QueryRow = Record<string, unknown>;
type SqlClientLike = { query: (sql: string, params?: unknown[]) => Promise<{ rows: QueryRow[] }>; release: () => void };
type PoolLike = { query: (sql: string, params?: unknown[]) => Promise<{ rows: QueryRow[] }>; connect?: () => Promise<SqlClientLike> };

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

export type SqlReasoningQueryExecutor = <T extends QueryRow = QueryRow>(sql: string, params?: unknown[]) => Promise<T[]>;
async function queryDb<T extends QueryRow = QueryRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const pool = await getPool();
  const result = await pool.query(sql, params);
  return result.rows as T[];
}
async function transactionDb<T>(fn: (query: SqlReasoningQueryExecutor) => Promise<T>): Promise<T> {
  const pool = await getPool();
  if (!pool.connect) throw new Error('sql_transaction_connection_unavailable');
  const client = await pool.connect();
  const query: SqlReasoningQueryExecutor = async <R extends QueryRow = QueryRow>(sql: string, params: unknown[] = []) => (await client.query(sql, params)).rows as R[];
  try {
    await client.query('BEGIN');
    const result = await fn(query);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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

type DriftRow = {
  drift_id: string;
  asset: string;
  timeframe: string;
  previous_snapshot_id: string;
  current_snapshot_id: string;
  previous_reasoning_run_id: string;
  current_reasoning_run_id: string;
  compared_at: string;
  severity: PersistedCognitionDriftRecord['severity'];
  summary: string;
  key_changes_json: string;
  confidence_delta: number;
  contradiction_delta: number;
  freshness_delta: number;
  invalidation_price_delta: number;
  created_at: string;
  drift_json: string;
};

function mapDriftRow(row: DriftRow): PersistedCognitionDriftRecord {
  return {
    driftId: row.drift_id,
    asset: row.asset,
    timeframe: row.timeframe as Timeframe,
    previousSnapshotId: row.previous_snapshot_id,
    currentSnapshotId: row.current_snapshot_id,
    previousReasoningRunId: row.previous_reasoning_run_id,
    currentReasoningRunId: row.current_reasoning_run_id,
    comparedAt: row.compared_at,
    severity: row.severity,
    summary: row.summary,
    keyChangesJson: row.key_changes_json,
    confidenceDelta: row.confidence_delta,
    contradictionDelta: row.contradiction_delta,
    freshnessDelta: row.freshness_delta,
    invalidationPriceDelta: row.invalidation_price_delta,
    createdAt: row.created_at,
    driftJson: row.drift_json
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

export class SqlCognitionDriftRepository implements CognitionDriftRepository {
  async saveDriftRecord(record: PersistedCognitionDriftRecord): Promise<void> {
    await queryDb(
      `INSERT INTO app_cognition_deltas (
        drift_id, asset, timeframe, previous_snapshot_id, current_snapshot_id,
        previous_reasoning_run_id, current_reasoning_run_id, compared_at, severity, summary,
        key_changes_json, confidence_delta, contradiction_delta, freshness_delta,
        invalidation_price_delta, created_at, drift_json
      ) VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,$10,
        $11,$12,$13,$14,
        $15,$16,$17
      )
      ON CONFLICT (drift_id) DO UPDATE SET
        asset=EXCLUDED.asset,
        timeframe=EXCLUDED.timeframe,
        previous_snapshot_id=EXCLUDED.previous_snapshot_id,
        current_snapshot_id=EXCLUDED.current_snapshot_id,
        previous_reasoning_run_id=EXCLUDED.previous_reasoning_run_id,
        current_reasoning_run_id=EXCLUDED.current_reasoning_run_id,
        compared_at=EXCLUDED.compared_at,
        severity=EXCLUDED.severity,
        summary=EXCLUDED.summary,
        key_changes_json=EXCLUDED.key_changes_json,
        confidence_delta=EXCLUDED.confidence_delta,
        contradiction_delta=EXCLUDED.contradiction_delta,
        freshness_delta=EXCLUDED.freshness_delta,
        invalidation_price_delta=EXCLUDED.invalidation_price_delta,
        created_at=EXCLUDED.created_at,
        drift_json=EXCLUDED.drift_json`,
      [
        record.driftId,
        record.asset,
        record.timeframe,
        record.previousSnapshotId,
        record.currentSnapshotId,
        record.previousReasoningRunId,
        record.currentReasoningRunId,
        record.comparedAt,
        record.severity,
        record.summary,
        record.keyChangesJson,
        record.confidenceDelta,
        record.contradictionDelta,
        record.freshnessDelta,
        record.invalidationPriceDelta,
        record.createdAt,
        record.driftJson
      ]
    );
  }

  async getDriftById(driftId: string): Promise<PersistedCognitionDriftRecord | null> {
    const rows = await queryDb<DriftRow>(
      `SELECT drift_id, asset, timeframe, previous_snapshot_id, current_snapshot_id,
        previous_reasoning_run_id, current_reasoning_run_id, compared_at, severity, summary,
        key_changes_json::text as key_changes_json, confidence_delta, contradiction_delta,
        freshness_delta, invalidation_price_delta, created_at, drift_json::text as drift_json
       FROM app_cognition_deltas
       WHERE drift_id = $1`,
      [driftId]
    );

    return rows[0] ? mapDriftRow(rows[0]) : null;
  }

  async getLatestDriftForAssetTimeframe(asset: CanonicalAssetSymbol, timeframe: Timeframe): Promise<PersistedCognitionDriftRecord | null> {
    const rows = await queryDb<DriftRow>(
      `SELECT drift_id, asset, timeframe, previous_snapshot_id, current_snapshot_id,
        previous_reasoning_run_id, current_reasoning_run_id, compared_at, severity, summary,
        key_changes_json::text as key_changes_json, confidence_delta, contradiction_delta,
        freshness_delta, invalidation_price_delta, created_at, drift_json::text as drift_json
       FROM app_cognition_deltas
       WHERE asset = $1 AND timeframe = $2
       ORDER BY compared_at DESC, drift_id ASC
       LIMIT 1`,
      [asset, timeframe]
    );

    return rows[0] ? mapDriftRow(rows[0]) : null;
  }

  async listRecentDrifts(params: {
    limit: number;
    asset?: CanonicalAssetSymbol;
    timeframe?: Timeframe;
    severity?: PersistedCognitionDriftRecord['severity'];
  }): Promise<PersistedCognitionDriftRecord[]> {
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
    if (params.severity) {
      values.push(params.severity);
      clauses.push(`severity = $${values.length}`);
    }
    values.push(params.limit);
    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

    const rows = await queryDb<DriftRow>(
      `SELECT drift_id, asset, timeframe, previous_snapshot_id, current_snapshot_id,
        previous_reasoning_run_id, current_reasoning_run_id, compared_at, severity, summary,
        key_changes_json::text as key_changes_json, confidence_delta, contradiction_delta,
        freshness_delta, invalidation_price_delta, created_at, drift_json::text as drift_json
       FROM app_cognition_deltas
       ${whereSql}
       ORDER BY compared_at DESC, drift_id ASC
       LIMIT $${values.length}`,
      values
    );

    return rows.map(mapDriftRow);
  }
}

export class SqlReasoningPersistenceRepository implements ReasoningPersistenceRepository {
  readonly runRepository: ReasoningRunRepository;
  readonly snapshotRepository: CognitionSnapshotRepository;
  readonly driftRepository: CognitionDriftRepository;
  readonly expectationRepository: ExpectationRepository;
  readonly expectationRealityRepository: ExpectationRealityRepository;
  readonly eventExpectationRepository: EventExpectationRepository;
  readonly eventRealityRepository: EventRealityRepository;
  readonly historicalAnalogRepository: HistoricalAnalogRepository;
  readonly contradictionActionProtocolRepository: ContradictionActionProtocolRepository;
  readonly persistedContradictionInputRepository: PersistedContradictionInputRepository;
  readonly marketSessionLiquidityContextRepository: MarketSessionLiquidityContextRepository;
  readonly marketCleanlinessRepository: MarketCleanlinessRepository;
  readonly narrativeContinuationObservationRepository: NarrativeContinuationObservationRepository;
  readonly narrativeDecayRepository: NarrativeDecayRepository;

  constructor(
    runRepository: ReasoningRunRepository = new SqlReasoningRunRepository(),
    snapshotRepository: CognitionSnapshotRepository = new SqlCognitionSnapshotRepository(),
    driftRepository: CognitionDriftRepository = new SqlCognitionDriftRepository(),
    expectationRepository: ExpectationRepository = new SqlExpectationRepository(),
    expectationRealityRepository: ExpectationRealityRepository = new SqlExpectationRealityRepository(),
    eventExpectationRepository: EventExpectationRepository = new SqlEventExpectationRepository(),
    eventRealityRepository: EventRealityRepository = new SqlEventRealityRepository(),
    historicalAnalogRepository: HistoricalAnalogRepository = new SqlHistoricalAnalogRepository(queryDb, transactionDb),
    contradictionActionProtocolRepository?: ContradictionActionProtocolRepository,
    persistedContradictionInputRepository: PersistedContradictionInputRepository = new SqlPersistedContradictionInputRepository(queryDb, transactionDb),
    marketSessionLiquidityContextRepository?: MarketSessionLiquidityContextRepository,
    marketCleanlinessRepository?: MarketCleanlinessRepository,
    narrativeContinuationObservationRepository?: NarrativeContinuationObservationRepository,
    narrativeDecayRepository?: NarrativeDecayRepository
  ) {
    this.runRepository = runRepository;
    this.snapshotRepository = snapshotRepository;
    this.driftRepository = driftRepository;
    this.expectationRepository = expectationRepository;
    this.expectationRealityRepository = expectationRealityRepository;
    this.eventExpectationRepository = eventExpectationRepository;
    this.eventRealityRepository = eventRealityRepository;
    this.historicalAnalogRepository = historicalAnalogRepository;
    this.contradictionActionProtocolRepository = contradictionActionProtocolRepository ?? new SqlContradictionActionProtocolRepository({
      connect: async () => {
        const pool = await getPool();
        if (!pool.connect) throw new Error('sql_pool_transactions_unavailable');
        return pool.connect();
      },
      query: async (sql, params) => {
        const pool = await getPool();
        const result = await pool.query(sql, params);
        return { rows: result.rows, rowCount: result.rows.length };
      },
    });
    this.persistedContradictionInputRepository = persistedContradictionInputRepository;
    const cleanlinessPool = {
      query: async (sql:string,params?:unknown[]) => { const pool=await getPool(); const result=await pool.query(sql,params); return {rows:result.rows,rowCount:result.rows.length}; },
      connect: async () => { const pool=await getPool(); if(!pool.connect)throw new Error('sql_pool_transactions_unavailable'); return pool.connect(); }
    };
    this.marketSessionLiquidityContextRepository = marketSessionLiquidityContextRepository ?? new SqlMarketSessionLiquidityContextRepository(cleanlinessPool);
    this.marketCleanlinessRepository = marketCleanlinessRepository ?? new SqlMarketCleanlinessRepository(cleanlinessPool);
    this.narrativeContinuationObservationRepository = narrativeContinuationObservationRepository ?? new SqlNarrativeContinuationObservationRepository(cleanlinessPool);
    this.narrativeDecayRepository = narrativeDecayRepository ?? new SqlNarrativeDecayRepository(cleanlinessPool);
  }
}

import type { EventRealityEvaluation, EventExpectationRecord, ExpectationRealityEvaluation, ExpectationHorizon, ExpectationRecord } from '../expectation-reality/contracts';
import { canonicalJson } from '../expectation-reality/identity';
import type { EventExpectationRepository, EventRealityRepository, ExpectationRealityRepository, ExpectationRepository } from '../expectation-reality/repository';

export class SqlExpectationRepository implements ExpectationRepository {
  async saveExpectation(record: ExpectationRecord): Promise<ExpectationRecord> {
    await queryDb(`INSERT INTO app_expectation_records (expectation_id, expectation_kind, asset, timeframe, issued_at, data_cutoff_at, reasoning_run_id, cognition_snapshot_id, reasoning_version, scoring_version, base_price, recent_range_pct, expected_bias, confidence_score, contradiction_score, contradiction_regime, payload_json, created_at) VALUES ($1,'cognition_path',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT (expectation_id) DO NOTHING`, [record.expectationId, record.asset, record.timeframe, record.issuedAt, record.dataCutoffAt, record.reasoningRunId, record.cognitionSnapshotId, record.reasoningVersion, record.scoringVersion, record.basePrice, record.recentRangePct, record.expectedBias, record.confidenceScore, record.contradictionScore, record.contradictionRegime, JSON.stringify(record), record.createdAt]);
    const existing = await this.getExpectationById(record.expectationId);
    if (!existing || canonicalJson(existing) !== canonicalJson(record)) throw new Error('immutable_expectation_conflict');
    return existing;
  }
  async getExpectationById(id: string): Promise<ExpectationRecord | null> { const rows = await queryDb<{ payload_json: ExpectationRecord }>('SELECT payload_json FROM app_expectation_records WHERE expectation_id=$1', [id]); return rows[0]?.payload_json ?? null; }
  async getExpectationByCognitionSnapshotId(id: string): Promise<ExpectationRecord | null> { const rows = await queryDb<{ payload_json: ExpectationRecord }>("SELECT payload_json FROM app_expectation_records WHERE cognition_snapshot_id=$1 AND expectation_kind='cognition_path'", [id]); return rows[0]?.payload_json ?? null; }
  async listPendingExpectations(params: { asset?: CanonicalAssetSymbol; timeframe?: Timeframe; horizon?: ExpectationHorizon; observationVersion?: string; limit?: number } = {}): Promise<ExpectationRecord[]> { const rows = await queryDb<{ payload_json: ExpectationRecord }>(`SELECT e.payload_json FROM app_expectation_records e WHERE e.expectation_kind='cognition_path' AND ($1::text IS NULL OR e.asset=$1) AND ($2::text IS NULL OR e.timeframe=$2) AND ($3::text IS NULL OR NOT EXISTS (SELECT 1 FROM app_expectation_reality_evaluations v WHERE v.expectation_id=e.expectation_id AND v.horizon=$3 AND ($4::text IS NULL OR v.observation_version=$4))) ORDER BY e.issued_at ASC LIMIT $5`, [params.asset ?? null, params.timeframe ?? null, params.horizon ?? null, params.observationVersion ?? null, params.limit ?? 100]); return rows.map((r) => r.payload_json); }
}
export class SqlExpectationRealityRepository implements ExpectationRealityRepository {
  constructor(private readonly query: SqlReasoningQueryExecutor = queryDb) {}
  async saveEvaluation(e: ExpectationRealityEvaluation): Promise<ExpectationRealityEvaluation> { await this.query('INSERT INTO app_expectation_reality_observation_identities (expectation_id, observation_version, observation_content_hash) VALUES ($1,$2,$3) ON CONFLICT (expectation_id, observation_version) DO NOTHING', [e.expectationId, e.observationVersion, e.observationContentHash]); const identity = await this.query<{ observation_content_hash: string }>('SELECT observation_content_hash FROM app_expectation_reality_observation_identities WHERE expectation_id=$1 AND observation_version=$2', [e.expectationId, e.observationVersion]); if (identity[0]?.observation_content_hash !== e.observationContentHash) throw new Error('observation_version_content_hash_conflict'); await this.query(`INSERT INTO app_expectation_reality_evaluations (evaluation_id,expectation_id,asset,timeframe,horizon,observation_version,observation_content_hash,evaluated_at,policy_version,outcome,path_classification,audit_json,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (expectation_id,horizon,observation_version) DO NOTHING`, [e.evaluationId,e.expectationId,e.asset,e.timeframe,e.horizon,e.observationVersion,e.observationContentHash,e.evaluatedAt,e.policyVersion,e.outcome,e.pathClassification,JSON.stringify(e),e.createdAt]); const existing = await this.getEvaluation(e.expectationId, e.horizon, e.observationVersion); if (!existing || canonicalJson(existing) !== canonicalJson(e)) throw new Error('immutable_evaluation_conflict'); return existing; }
  async getEvaluation(expectationId: string, horizon: ExpectationHorizon, observationVersion: string): Promise<ExpectationRealityEvaluation | null> { const rows=await this.query<{audit_json:ExpectationRealityEvaluation}>('SELECT audit_json FROM app_expectation_reality_evaluations WHERE expectation_id=$1 AND horizon=$2 AND observation_version=$3',[expectationId,horizon,observationVersion]); return rows[0]?.audit_json ?? null; }
  async getLatestExpectationRealityForAssetTimeframe(asset: CanonicalAssetSymbol, timeframe: Timeframe): Promise<ExpectationRealityEvaluation | null> { return (await this.listExpectationRealityHistory({asset,timeframe,limit:1}))[0] ?? null; }
  async listExpectationRealityHistory(params: { asset?: CanonicalAssetSymbol; timeframe?: Timeframe; expectationId?: string; limit: number }): Promise<ExpectationRealityEvaluation[]> { const rows=await this.query<{audit_json:ExpectationRealityEvaluation}>('SELECT audit_json FROM app_expectation_reality_evaluations WHERE ($1::text IS NULL OR asset=$1) AND ($2::text IS NULL OR timeframe=$2) AND ($3::text IS NULL OR expectation_id=$3) ORDER BY evaluated_at DESC LIMIT $4',[params.asset??null,params.timeframe??null,params.expectationId??null,params.limit]); return rows.map((r)=>r.audit_json); }
}
export class SqlEventExpectationRepository implements EventExpectationRepository { constructor(private readonly query: SqlReasoningQueryExecutor = queryDb) {} async saveEventExpectation(r: EventExpectationRecord): Promise<EventExpectationRecord> { await this.query(`INSERT INTO app_expectation_records (expectation_id, expectation_kind, event_release_id, event_kind, scheduled_release_time, asset, issued_at, data_cutoff_at, cognition_snapshot_id, payload_json, created_at) VALUES ($1,'event',$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (expectation_id) DO NOTHING`, [r.expectationId,r.eventReleaseId,r.eventKind,r.scheduledReleaseTime,r.asset,r.issuedAt,r.dataCutoffAt,r.preEventCognitionSnapshotId,JSON.stringify(r),r.createdAt]); const existing=await this.getEventExpectationById(r.expectationId); if(!existing || canonicalJson(existing)!==canonicalJson(r)) throw new Error('immutable_event_expectation_conflict'); return existing; } async getEventExpectationById(id:string): Promise<EventExpectationRecord | null> { const rows=await this.query<{payload_json:EventExpectationRecord}>('SELECT payload_json FROM app_expectation_records WHERE expectation_id=$1 AND expectation_kind=\'event\'',[id]); return rows[0]?.payload_json ?? null; } }
export class SqlEventRealityRepository implements EventRealityRepository { constructor(private readonly query: SqlReasoningQueryExecutor = queryDb) {} async saveEventEvaluation(e: EventRealityEvaluation): Promise<EventRealityEvaluation> { await this.query(`INSERT INTO app_event_reality_evaluations (event_evaluation_id, expectation_id, release_id, release_version, asset, interpreted_at, assessment_stage, finalization_status, primary_event_outcome, pre_event_cognition_snapshot_id, post_event_cognition_snapshot_id, observation_content_hash, assessment_evidence_hash, related_evidence_status, related_evidence_decision_at, related_evidence_policy_version, related_evidence_reason_codes, reaction_provenance_json, audit_json, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) ON CONFLICT (event_evaluation_id) DO NOTHING`, [e.eventEvaluationId,e.expectationId,e.releaseId,e.releaseVersion,e.asset,e.interpretedAt,e.assessmentStage,e.finalizationStatus,e.outcome,e.preEventCognitionSnapshotId,e.postEventCognitionSnapshotId,e.observationContentHash,e.assessmentEvidenceHash,e.relatedEvidenceStatus,e.relatedEvidenceDecisionAt,e.relatedEvidencePolicyVersion,JSON.stringify(e.relatedEvidenceReasonCodes),JSON.stringify(e.reactionProvenance),JSON.stringify(e),e.createdAt]); const rows=await this.query<{audit_json:EventRealityEvaluation}>('SELECT audit_json FROM app_event_reality_evaluations WHERE event_evaluation_id=$1',[e.eventEvaluationId]); const existing=rows[0]?.audit_json ?? await this.getEventEvaluation(e.expectationId,e.releaseVersion); if(!existing || canonicalJson(existing)!==canonicalJson(e)) throw new Error('immutable_event_evaluation_conflict'); return existing; } async getEventEvaluation(expectationId:string, releaseVersion:string): Promise<EventRealityEvaluation | null> { const rows=await this.query<{audit_json:EventRealityEvaluation}>(`SELECT audit_json FROM app_event_reality_evaluations WHERE expectation_id=$1 AND release_version=$2 ORDER BY CASE WHEN finalization_status='final' THEN 0 ELSE 1 END, interpreted_at DESC`,[expectationId,releaseVersion]); return rows[0]?.audit_json ?? null; } async getEventEvaluationById(eventEvaluationId:string): Promise<EventRealityEvaluation | null> { const rows=await this.query<{audit_json:EventRealityEvaluation}>('SELECT audit_json FROM app_event_reality_evaluations WHERE event_evaluation_id=$1',[eventEvaluationId]); return rows[0]?.audit_json ?? null; } async listFinalEventEvaluations(params:{ before:string; asset?:any; limit:number; cursor?:string }): Promise<EventRealityEvaluation[]> { const cursor=decodeTupleCursor(params.cursor); const p:unknown[]=[params.before]; let where="finalization_status='final' AND interpreted_at < $1"; if(params.asset){ p.push(params.asset); where+=` AND asset=$${p.length}`; } if(cursor){ p.push(cursor.at,cursor.id); where+=` AND (interpreted_at > $${p.length-1} OR (interpreted_at = $${p.length-1} AND event_evaluation_id > $${p.length}))`; } const sql=`SELECT audit_json FROM app_event_reality_evaluations WHERE ${where} ORDER BY interpreted_at ASC, event_evaluation_id ASC LIMIT ${normalizeHistoricalAnalogPageLimit(params.limit)}`; const rows=await this.query<{audit_json:EventRealityEvaluation}>(sql, p); return rows.map((r)=>r.audit_json); } async listEventEvaluationTimeline(params:{ expectationId:string; releaseVersion:string; before?:string; limit:number; cursor?:string }): Promise<EventRealityEvaluation[]> { const cursor=decodeTupleCursor(params.cursor); const p:unknown[]=[params.expectationId,params.releaseVersion]; let where='expectation_id=$1 AND release_version=$2'; if(params.before){ p.push(params.before); where+=` AND interpreted_at < $${p.length}`; } if(cursor){ p.push(cursor.at,cursor.id); where+=` AND (interpreted_at > $${p.length-1} OR (interpreted_at = $${p.length-1} AND event_evaluation_id > $${p.length}))`; } const rows=await this.query<{audit_json:EventRealityEvaluation}>(`SELECT audit_json FROM app_event_reality_evaluations WHERE ${where} ORDER BY interpreted_at ASC, event_evaluation_id ASC LIMIT ${normalizeHistoricalAnalogPageLimit(params.limit)}`, p); return rows.map((r)=>r.audit_json); } async listEventEvaluationVersions(params:{expectationId:string;before:string;limit:number;cursor?:string}):Promise<EventRealityEvaluation[]>{const rows=await this.query<{audit_json:EventRealityEvaluation}>(`SELECT audit_json FROM app_event_reality_evaluations WHERE expectation_id=$1 AND (audit_json->'reality'->>'observedAt')::timestamptz <= $2 ORDER BY (audit_json->'reality'->>'observedAt')::timestamptz,event_evaluation_id LIMIT ${normalizeHistoricalAnalogPageLimit(params.limit)}`,[params.expectationId,params.before]);return rows.map(r=>r.audit_json);} }
