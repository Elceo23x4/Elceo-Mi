import type { OutboxRepository, PersistedOutboxAttempt, PersistedOutboxItem } from './outbox-contracts';
import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import type { IngestionTriggerKind } from '../scheduler/trigger-context';
import type { OutboxItemKind, OutboxStatus } from './outbox-contracts';
import type { IngestionPublishTopic } from './topic-contracts';

function cloneItem(item: PersistedOutboxItem): PersistedOutboxItem {
  return { ...item };
}

function cloneAttempt(attempt: PersistedOutboxAttempt): PersistedOutboxAttempt {
  return { ...attempt };
}

export class MemoryOutboxRepository implements OutboxRepository {
  private readonly outboxById = new Map<string, PersistedOutboxItem>();
  private readonly outboxIdByDedupe = new Map<string, string>();
  private readonly attemptsByOutbox = new Map<string, PersistedOutboxAttempt[]>();

  async stageOutboxItem(item: PersistedOutboxItem): Promise<void> {
    const existingId = this.outboxIdByDedupe.get(item.dedupeKey);
    if (existingId) return;

    this.outboxById.set(item.outboxId, cloneItem(item));
    this.outboxIdByDedupe.set(item.dedupeKey, item.outboxId);
  }

  async getOutboxById(outboxId: string): Promise<PersistedOutboxItem | null> {
    const row = this.outboxById.get(outboxId);
    return row ? cloneItem(row) : null;
  }

  async getOutboxByDedupeKey(dedupeKey: string): Promise<PersistedOutboxItem | null> {
    const id = this.outboxIdByDedupe.get(dedupeKey);
    if (!id) return null;
    const row = this.outboxById.get(id);
    return row ? cloneItem(row) : null;
  }

  async listDueOutboxItems(limit: number, nowIso: string): Promise<PersistedOutboxItem[]> {
    const due = [...this.outboxById.values()].filter(
      (item) =>
        (item.status === 'pending' || item.status === 'failed') &&
        Date.parse(item.availableAt) <= Date.parse(nowIso)
    );

    due.sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.outboxId.localeCompare(right.outboxId));
    return due.slice(0, limit).map(cloneItem);
  }

  async markOutboxPublishing(outboxId: string, attemptedAt: string): Promise<void> {
    const existing = this.outboxById.get(outboxId);
    if (!existing) return;
    this.outboxById.set(outboxId, { ...existing, status: 'publishing', updatedAt: attemptedAt, lastAttemptAt: attemptedAt });
  }

  async markOutboxPublished(outboxId: string, publishedAt: string): Promise<void> {
    const existing = this.outboxById.get(outboxId);
    if (!existing) return;
    this.outboxById.set(outboxId, {
      ...existing,
      status: 'published',
      publishedAt,
      updatedAt: publishedAt,
      availableAt: publishedAt,
      lastErrorCode: null,
      lastErrorMessage: null
    });
  }

  async markOutboxFailed(outboxId: string, attemptedAt: string, errorCode: string, errorMessage: string, nextAvailableAt: string): Promise<void> {
    const existing = this.outboxById.get(outboxId);
    if (!existing) return;
    this.outboxById.set(outboxId, {
      ...existing,
      status: 'failed',
      attemptCount: existing.attemptCount + 1,
      lastAttemptAt: attemptedAt,
      lastErrorCode: errorCode,
      lastErrorMessage: errorMessage,
      availableAt: nextAvailableAt,
      updatedAt: attemptedAt
    });
  }

  async markOutboxDead(outboxId: string, attemptedAt: string, errorCode: string, errorMessage: string): Promise<void> {
    const existing = this.outboxById.get(outboxId);
    if (!existing) return;
    this.outboxById.set(outboxId, {
      ...existing,
      status: 'dead',
      attemptCount: existing.attemptCount + 1,
      lastAttemptAt: attemptedAt,
      lastErrorCode: errorCode,
      lastErrorMessage: errorMessage,
      updatedAt: attemptedAt
    });
  }

  async saveAttempt(attempt: PersistedOutboxAttempt): Promise<void> {
    const rows = this.attemptsByOutbox.get(attempt.outboxId) ?? [];
    rows.push(cloneAttempt(attempt));
    this.attemptsByOutbox.set(attempt.outboxId, rows);
  }

  async listAttemptsForOutbox(outboxId: string): Promise<PersistedOutboxAttempt[]> {
    const rows = this.attemptsByOutbox.get(outboxId) ?? [];
    return [...rows].sort((left, right) => Date.parse(right.attemptedAt) - Date.parse(left.attemptedAt)).map(cloneAttempt);
  }
}

function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

type QueryResultRow = Record<string, unknown>;

type PoolLike = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: QueryResultRow[] }>;
};

let poolPromise: Promise<PoolLike> | null = null;

async function getPool(): Promise<PoolLike> {
  if (!poolPromise) {
    poolPromise = (async () => {
      const pgModule = await import('pg');
      const PoolCtor = pgModule.Pool;
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

type OutboxRow = {
  outbox_id: string;
  run_id: string;
  request_key: string;
  item_kind: string;
  topic: string;
  asset: string;
  timeframe: string;
  trigger_kind: string;
  slot_start_at: string | null;
  slot_end_at: string | null;
  scheduler_tick_id: string | null;
  dedupe_key: string;
  payload_json: string;
  status: string;
  attempt_count: number;
  last_attempt_at: string | null;
  published_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  available_at: string;
  created_at: string;
  updated_at: string;
};

type OutboxAttemptRow = {
  attempt_id: string;
  outbox_id: string;
  attempted_at: string;
  transport: string;
  success: boolean;
  error_code: string | null;
  error_message: string | null;
};

function mapOutboxRow(row: OutboxRow): PersistedOutboxItem {
  return {
    outboxId: row.outbox_id,
    runId: row.run_id,
    requestKey: row.request_key,
    itemKind: row.item_kind as OutboxItemKind,
    topic: row.topic as IngestionPublishTopic,
    asset: row.asset as CanonicalAssetSymbol,
    timeframe: row.timeframe as Timeframe,
    triggerKind: row.trigger_kind as IngestionTriggerKind,
    slotStartAt: row.slot_start_at,
    slotEndAt: row.slot_end_at,
    schedulerTickId: row.scheduler_tick_id,
    dedupeKey: row.dedupe_key,
    payloadJson: row.payload_json,
    status: row.status as OutboxStatus,
    attemptCount: row.attempt_count,
    lastAttemptAt: row.last_attempt_at,
    publishedAt: row.published_at,
    lastErrorCode: row.last_error_code,
    lastErrorMessage: row.last_error_message,
    availableAt: row.available_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAttemptRow(row: OutboxAttemptRow): PersistedOutboxAttempt {
  return {
    attemptId: row.attempt_id,
    outboxId: row.outbox_id,
    attemptedAt: row.attempted_at,
    transport: row.transport,
    success: row.success,
    errorCode: row.error_code,
    errorMessage: row.error_message
  };
}

export class SqlOutboxRepository implements OutboxRepository {
  async stageOutboxItem(item: PersistedOutboxItem): Promise<void> {
    await queryDb(
      `INSERT INTO app_ingestion_outbox (
        outbox_id, run_id, request_key, item_kind, topic,
        asset, timeframe, trigger_kind, slot_start_at, slot_end_at,
        scheduler_tick_id, dedupe_key, payload_json, status, attempt_count,
        last_attempt_at, published_at, last_error_code, last_error_message,
        available_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13::jsonb, $14, $15,
        $16, $17, $18, $19,
        $20, $21, $22
      )
      ON CONFLICT (dedupe_key) DO NOTHING`,
      [
        item.outboxId,
        item.runId,
        item.requestKey,
        item.itemKind,
        item.topic,
        item.asset,
        item.timeframe,
        item.triggerKind,
        item.slotStartAt,
        item.slotEndAt,
        item.schedulerTickId,
        item.dedupeKey,
        item.payloadJson,
        item.status,
        item.attemptCount,
        item.lastAttemptAt,
        item.publishedAt,
        item.lastErrorCode,
        item.lastErrorMessage,
        item.availableAt,
        item.createdAt,
        item.updatedAt
      ]
    );
  }

  async getOutboxById(outboxId: string): Promise<PersistedOutboxItem | null> {
    const rows = await queryDb<OutboxRow>(
      `SELECT
        outbox_id, run_id, request_key, item_kind, topic,
        asset, timeframe, trigger_kind, slot_start_at, slot_end_at,
        scheduler_tick_id, dedupe_key, payload_json::text AS payload_json,
        status, attempt_count, last_attempt_at, published_at,
        last_error_code, last_error_message, available_at, created_at, updated_at
       FROM app_ingestion_outbox
       WHERE outbox_id = $1`,
      [outboxId]
    );

    return rows[0] ? mapOutboxRow(rows[0]) : null;
  }

  async getOutboxByDedupeKey(dedupeKey: string): Promise<PersistedOutboxItem | null> {
    const rows = await queryDb<OutboxRow>(
      `SELECT
        outbox_id, run_id, request_key, item_kind, topic,
        asset, timeframe, trigger_kind, slot_start_at, slot_end_at,
        scheduler_tick_id, dedupe_key, payload_json::text AS payload_json,
        status, attempt_count, last_attempt_at, published_at,
        last_error_code, last_error_message, available_at, created_at, updated_at
       FROM app_ingestion_outbox
       WHERE dedupe_key = $1`,
      [dedupeKey]
    );

    return rows[0] ? mapOutboxRow(rows[0]) : null;
  }

  async listDueOutboxItems(limit: number, nowIso: string): Promise<PersistedOutboxItem[]> {
    const rows = await queryDb<OutboxRow>(
      `SELECT
        outbox_id, run_id, request_key, item_kind, topic,
        asset, timeframe, trigger_kind, slot_start_at, slot_end_at,
        scheduler_tick_id, dedupe_key, payload_json::text AS payload_json,
        status, attempt_count, last_attempt_at, published_at,
        last_error_code, last_error_message, available_at, created_at, updated_at
       FROM app_ingestion_outbox
       WHERE status IN ('pending', 'failed')
         AND available_at <= $1
       ORDER BY created_at ASC, outbox_id ASC
       LIMIT $2`,
      [nowIso, limit]
    );

    return rows.map(mapOutboxRow);
  }

  async markOutboxPublishing(outboxId: string, attemptedAt: string): Promise<void> {
    await queryDb(
      `UPDATE app_ingestion_outbox
       SET status = 'publishing', last_attempt_at = $2, updated_at = $2
       WHERE outbox_id = $1`,
      [outboxId, attemptedAt]
    );
  }

  async markOutboxPublished(outboxId: string, publishedAt: string): Promise<void> {
    await queryDb(
      `UPDATE app_ingestion_outbox
       SET status = 'published', published_at = $2, updated_at = $2,
           last_error_code = NULL, last_error_message = NULL
       WHERE outbox_id = $1`,
      [outboxId, publishedAt]
    );
  }

  async markOutboxFailed(outboxId: string, attemptedAt: string, errorCode: string, errorMessage: string, nextAvailableAt: string): Promise<void> {
    await queryDb(
      `UPDATE app_ingestion_outbox
       SET status = 'failed',
           attempt_count = attempt_count + 1,
           last_attempt_at = $2,
           last_error_code = $3,
           last_error_message = $4,
           available_at = $5,
           updated_at = $2
       WHERE outbox_id = $1`,
      [outboxId, attemptedAt, errorCode, errorMessage, nextAvailableAt]
    );
  }

  async markOutboxDead(outboxId: string, attemptedAt: string, errorCode: string, errorMessage: string): Promise<void> {
    await queryDb(
      `UPDATE app_ingestion_outbox
       SET status = 'dead',
           attempt_count = attempt_count + 1,
           last_attempt_at = $2,
           last_error_code = $3,
           last_error_message = $4,
           updated_at = $2
       WHERE outbox_id = $1`,
      [outboxId, attemptedAt, errorCode, errorMessage]
    );
  }

  async saveAttempt(attempt: PersistedOutboxAttempt): Promise<void> {
    await queryDb(
      `INSERT INTO app_ingestion_outbox_attempts (
        attempt_id, outbox_id, attempted_at, transport, success, error_code, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (attempt_id) DO NOTHING`,
      [attempt.attemptId, attempt.outboxId, attempt.attemptedAt, attempt.transport, attempt.success, attempt.errorCode, attempt.errorMessage]
    );
  }

  async listAttemptsForOutbox(outboxId: string): Promise<PersistedOutboxAttempt[]> {
    const rows = await queryDb<OutboxAttemptRow>(
      `SELECT attempt_id, outbox_id, attempted_at, transport, success, error_code, error_message
       FROM app_ingestion_outbox_attempts
       WHERE outbox_id = $1
       ORDER BY attempted_at DESC, attempt_id ASC`,
      [outboxId]
    );

    return rows.map(mapAttemptRow);
  }
}

export function createOutboxRepository(env: Record<string, string | undefined>): OutboxRepository {
  if (env.DATABASE_URL && env.INGESTION_PERSISTENCE_MODE !== 'memory') {
    return new SqlOutboxRepository();
  }

  return new MemoryOutboxRepository();
}
