import type { CanonicalAssetSymbol, CanonicalEvent, Timeframe } from '@elceo/types';
import type { IngestionEventSnapshotRepository, IngestionPersistenceRepository, IngestionRunRecordInput, IngestionRunRepository, PersistedIngestionRun } from './contracts';
import type { IngestionTriggerKind } from '../scheduler/trigger-context';
import {
  deserializeCanonicalEvent,
  serializeCanonicalEvent,
  serializeDiagnosticsSummary,
  serializeProviderCapabilities,
  serializeRunComparison
} from './serialization';
import { prepareCanonicalEventsForSnapshot } from './canonical-candle-persistence';

function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

type QueryResultRow = Record<string, unknown>;
export type IngestionSqlQuery = <T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]) => Promise<T[]>;

type PoolLike = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: QueryResultRow[] }>;
};

let poolPromise: Promise<PoolLike> | null = null;

async function getPool(): Promise<PoolLike> {
  if (!poolPromise) {
    poolPromise = (async () => {
      const module = await import('pg');
      const PoolCtor = module.Pool;
      return new PoolCtor({ connectionString: runtimeEnv().DATABASE_URL }) as unknown as PoolLike;
    })();
  }
  return poolPromise;
}

async function queryDb<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const pool = await getPool();
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

type PersistedRunRow = {
  run_id: string;
  asset: string;
  timeframe: string;
  mode: string;
  active_boundary: string;
  status: string;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  canonical_event_count: number;
  legacy_event_count: number | null;
  output_event_count: number;
  fallback_applied: boolean;
  fallback_reason: string | null;
  boundary_version: string;
  trigger_kind: string;
  request_key: string;
  slot_start_at: string | null;
  slot_end_at: string | null;
  scheduler_tick_id: string | null;
  overlap_ratio: number | null;
  comparison_json: string | null;
  diagnostics_summary_json: string;
  provider_capabilities_json: string;
  created_at: string;
};

function mapRunRow(row: PersistedRunRow): PersistedIngestionRun {
  return {
    runId: row.run_id,
    asset: row.asset,
    timeframe: row.timeframe as Timeframe,
    mode: row.mode as PersistedIngestionRun['mode'],
    activeBoundary: row.active_boundary as PersistedIngestionRun['activeBoundary'],
    status: row.status as PersistedIngestionRun['status'],
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMs: row.duration_ms,
    canonicalEventCount: row.canonical_event_count,
    legacyEventCount: row.legacy_event_count,
    outputEventCount: row.output_event_count,
    fallbackApplied: row.fallback_applied,
    fallbackReason: row.fallback_reason,
    boundaryVersion: row.boundary_version,
    triggerKind: row.trigger_kind as IngestionTriggerKind,
    requestKey: row.request_key,
    slotStartAt: row.slot_start_at,
    slotEndAt: row.slot_end_at,
    schedulerTickId: row.scheduler_tick_id,
    overlapRatio: row.overlap_ratio,
    comparisonJson: row.comparison_json,
    diagnosticsSummaryJson: row.diagnostics_summary_json,
    providerCapabilitiesJson: row.provider_capabilities_json,
    createdAt: row.created_at
  };
}

export class SqlIngestionRunRepository implements IngestionRunRepository {
  async saveRunRecord(record: IngestionRunRecordInput): Promise<void> {
    await queryDb(
      `INSERT INTO app_ingestion_runs (
        run_id, asset, timeframe, mode, active_boundary, status,
        started_at, ended_at, duration_ms, canonical_event_count,
        legacy_event_count, output_event_count, fallback_applied,
        fallback_reason, boundary_version, trigger_kind, request_key,
        slot_start_at, slot_end_at, scheduler_tick_id, overlap_ratio, comparison_json,
        diagnostics_summary_json, provider_capabilities_json, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13,
        $14, $15, $16, $17,
        $18, $19, $20,
        $21, $22, $23,
        $24, $25
      )
      ON CONFLICT (run_id) DO UPDATE SET
        asset = EXCLUDED.asset,
        timeframe = EXCLUDED.timeframe,
        mode = EXCLUDED.mode,
        active_boundary = EXCLUDED.active_boundary,
        status = EXCLUDED.status,
        started_at = EXCLUDED.started_at,
        ended_at = EXCLUDED.ended_at,
        duration_ms = EXCLUDED.duration_ms,
        canonical_event_count = EXCLUDED.canonical_event_count,
        legacy_event_count = EXCLUDED.legacy_event_count,
        output_event_count = EXCLUDED.output_event_count,
        fallback_applied = EXCLUDED.fallback_applied,
        fallback_reason = EXCLUDED.fallback_reason,
        boundary_version = EXCLUDED.boundary_version,
        trigger_kind = EXCLUDED.trigger_kind,
        request_key = EXCLUDED.request_key,
        slot_start_at = EXCLUDED.slot_start_at,
        slot_end_at = EXCLUDED.slot_end_at,
        scheduler_tick_id = EXCLUDED.scheduler_tick_id,
        overlap_ratio = EXCLUDED.overlap_ratio,
        comparison_json = EXCLUDED.comparison_json,
        diagnostics_summary_json = EXCLUDED.diagnostics_summary_json,
        provider_capabilities_json = EXCLUDED.provider_capabilities_json,
        created_at = EXCLUDED.created_at`,
      [
        record.runId,
        record.asset,
        record.timeframe,
        record.mode,
        record.activeBoundary,
        record.status,
        record.startedAt,
        record.endedAt,
        record.durationMs,
        record.canonicalEventCount,
        record.legacyEventCount,
        record.outputEventCount,
        record.fallbackApplied,
        record.fallbackReason,
        record.boundaryVersion,
        record.triggerKind,
        record.requestKey,
        record.slotStartAt,
        record.slotEndAt,
        record.schedulerTickId,
        record.comparison?.overlapRatio ?? null,
        serializeRunComparison(record.comparison),
        serializeDiagnosticsSummary(record.diagnosticsSummary),
        serializeProviderCapabilities(record.providerCapabilities),
        record.endedAt
      ]
    );
  }

  async getRunById(runId: string): Promise<PersistedIngestionRun | null> {
    const rows = await queryDb<PersistedRunRow>(
      `SELECT
        run_id, asset, timeframe, mode, active_boundary, status,
        started_at, ended_at, duration_ms, canonical_event_count,
        legacy_event_count, output_event_count, fallback_applied,
        fallback_reason, boundary_version, trigger_kind, request_key,
        slot_start_at, slot_end_at, scheduler_tick_id, overlap_ratio,
        comparison_json::text AS comparison_json,
        diagnostics_summary_json::text AS diagnostics_summary_json,
        provider_capabilities_json::text AS provider_capabilities_json,
        created_at
       FROM app_ingestion_runs
       WHERE run_id = $1`,
      [runId]
    );

    return rows[0] ? mapRunRow(rows[0]) : null;
  }

  async getRunByRequestKey(requestKey: string): Promise<PersistedIngestionRun | null> {
    const rows = await queryDb<PersistedRunRow>(
      `SELECT
        run_id, asset, timeframe, mode, active_boundary, status,
        started_at, ended_at, duration_ms, canonical_event_count,
        legacy_event_count, output_event_count, fallback_applied,
        fallback_reason, boundary_version, trigger_kind, request_key,
        slot_start_at, slot_end_at, scheduler_tick_id, overlap_ratio,
        comparison_json::text AS comparison_json,
        diagnostics_summary_json::text AS diagnostics_summary_json,
        provider_capabilities_json::text AS provider_capabilities_json,
        created_at
       FROM app_ingestion_runs
       WHERE request_key = $1
       ORDER BY created_at DESC, run_id ASC
       LIMIT 1`,
      [requestKey]
    );

    return rows[0] ? mapRunRow(rows[0]) : null;
  }

  async getLatestRunForAssetTimeframe(asset: CanonicalAssetSymbol, timeframe: Timeframe): Promise<PersistedIngestionRun | null> {
    const rows = await queryDb<PersistedRunRow>(
      `SELECT
        run_id, asset, timeframe, mode, active_boundary, status,
        started_at, ended_at, duration_ms, canonical_event_count,
        legacy_event_count, output_event_count, fallback_applied,
        fallback_reason, boundary_version, trigger_kind, request_key,
        slot_start_at, slot_end_at, scheduler_tick_id, overlap_ratio,
        comparison_json::text AS comparison_json,
        diagnostics_summary_json::text AS diagnostics_summary_json,
        provider_capabilities_json::text AS provider_capabilities_json,
        created_at
       FROM app_ingestion_runs
       WHERE asset = $1 AND timeframe = $2
       ORDER BY created_at DESC, run_id ASC
       LIMIT 1`,
      [asset, timeframe]
    );

    return rows[0] ? mapRunRow(rows[0]) : null;
  }

  async listRecentRuns(params: { limit: number; asset?: CanonicalAssetSymbol; timeframe?: Timeframe; triggerKind?: IngestionTriggerKind; slotStartAt?: string; requestKey?: string }): Promise<PersistedIngestionRun[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (params.asset) {
      values.push(params.asset);
      conditions.push(`asset = $${values.length}`);
    }

    if (params.timeframe) {
      values.push(params.timeframe);
      conditions.push(`timeframe = $${values.length}`);
    }

    if (params.triggerKind) {
      values.push(params.triggerKind);
      conditions.push(`trigger_kind = $${values.length}`);
    }

    if (params.slotStartAt) {
      values.push(params.slotStartAt);
      conditions.push(`slot_start_at = $${values.length}`);
    }

    if (params.requestKey) {
      values.push(params.requestKey);
      conditions.push(`request_key = $${values.length}`);
    }

    values.push(params.limit);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await queryDb<PersistedRunRow>(
      `SELECT
        run_id, asset, timeframe, mode, active_boundary, status,
        started_at, ended_at, duration_ms, canonical_event_count,
        legacy_event_count, output_event_count, fallback_applied,
        fallback_reason, boundary_version, trigger_kind, request_key,
        slot_start_at, slot_end_at, scheduler_tick_id, overlap_ratio,
        comparison_json::text AS comparison_json,
        diagnostics_summary_json::text AS diagnostics_summary_json,
        provider_capabilities_json::text AS provider_capabilities_json,
        created_at
       FROM app_ingestion_runs
       ${whereClause}
       ORDER BY created_at DESC, run_id ASC
       LIMIT $${values.length}`,
      values
    );

    return rows.map(mapRunRow);
  }
}

export class SqlIngestionEventSnapshotRepository implements IngestionEventSnapshotRepository {
  constructor(private readonly query: IngestionSqlQuery = queryDb) {}

  async saveEventSnapshots(runId: string, asset: CanonicalAssetSymbol, timeframe: Timeframe, events: CanonicalEvent[]): Promise<void> {
    const preparedEvents = prepareCanonicalEventsForSnapshot(events);
    await this.deleteSnapshotsForRun(runId);

    for (const event of preparedEvents) {
      await this.query(
        `INSERT INTO app_ingestion_event_snapshots (
          run_id, asset, timeframe, event_id, dedupe_key,
          relevance_score, impact, source_category, source_name,
          event_kind, occurred_at, detected_at, stale,
          canonical_event_json, created_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13,
          $14, $15
        )
        ON CONFLICT (run_id, event_id) DO UPDATE SET
          dedupe_key = EXCLUDED.dedupe_key,
          relevance_score = EXCLUDED.relevance_score,
          impact = EXCLUDED.impact,
          source_category = EXCLUDED.source_category,
          source_name = EXCLUDED.source_name,
          event_kind = EXCLUDED.event_kind,
          occurred_at = EXCLUDED.occurred_at,
          detected_at = EXCLUDED.detected_at,
          stale = EXCLUDED.stale,
          canonical_event_json = EXCLUDED.canonical_event_json,
          created_at = EXCLUDED.created_at`,
        [
          runId,
          asset,
          timeframe,
          event.id,
          event.dedupeKey,
          event.relevanceScore,
          event.impact,
          event.sourceCategory,
          event.sourceName,
          event.eventKind,
          event.occurredAt,
          event.detectedAt,
          event.stale,
          serializeCanonicalEvent(event),
          new Date().toISOString()
        ]
      );
    }
  }

  async getEventsByRunId(runId: string): Promise<CanonicalEvent[]> {
    const rows = await this.query<{ canonical_event_json: string }>(
      `SELECT canonical_event_json::text AS canonical_event_json
       FROM app_ingestion_event_snapshots
       WHERE run_id = $1
       ORDER BY relevance_score DESC, occurred_at DESC, event_id ASC`,
      [runId]
    );

    return rows.map((row) => deserializeCanonicalEvent(row.canonical_event_json));
  }

  async getLatestEventsForAssetTimeframe(asset: CanonicalAssetSymbol, timeframe: Timeframe): Promise<CanonicalEvent[]> {
    const runRows = await this.query<{ run_id: string }>(
      `SELECT run_id
       FROM app_ingestion_runs
       WHERE asset = $1 AND timeframe = $2
       ORDER BY created_at DESC, run_id ASC
       LIMIT 1`,
      [asset, timeframe]
    );

    const runId = runRows[0]?.run_id;
    if (!runId) return [];
    return this.getEventsByRunId(runId);
  }

  async deleteSnapshotsForRun(runId: string): Promise<void> {
    await this.query(`DELETE FROM app_ingestion_event_snapshots WHERE run_id = $1`, [runId]);
  }
}

export class SqlIngestionPersistenceRepository implements IngestionPersistenceRepository {
  readonly runRepository: IngestionRunRepository;
  readonly eventSnapshotRepository: IngestionEventSnapshotRepository;

  constructor(
    runRepository: IngestionRunRepository = new SqlIngestionRunRepository(),
    eventSnapshotRepository: IngestionEventSnapshotRepository = new SqlIngestionEventSnapshotRepository()
  ) {
    this.runRepository = runRepository;
    this.eventSnapshotRepository = eventSnapshotRepository;
  }

  async persistRunWithEvents(record: IngestionRunRecordInput, events: CanonicalEvent[]): Promise<void> {
    prepareCanonicalEventsForSnapshot(events);
    await this.runRepository.saveRunRecord(record);
    await this.eventSnapshotRepository.saveEventSnapshots(record.runId, record.asset, record.timeframe, events);
  }

  async loadReplayBundleByRunId(runId: string): Promise<{ run: PersistedIngestionRun; events: CanonicalEvent[] } | null> {
    const run = await this.runRepository.getRunById(runId);
    if (!run) return null;
    const events = await this.eventSnapshotRepository.getEventsByRunId(runId);
    return { run, events };
  }
}
