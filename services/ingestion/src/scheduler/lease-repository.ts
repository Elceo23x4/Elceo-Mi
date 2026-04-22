import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import type { IngestionExecutionMode } from '../runtime/execution-mode';
import type { IngestionScheduleFrequency } from './frequency';
import type { IngestionTriggerKind } from './trigger-context';

export type IngestionRuntimeLeaseStatus = 'acquired' | 'released' | 'expired';

export type IngestionRuntimeLeaseRecord = {
  requestKey: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  mode: IngestionExecutionMode;
  triggerKind: IngestionTriggerKind;
  slotStartAt: string | null;
  slotEndAt: string | null;
  leaseHolder: string;
  acquiredAt: string;
  expiresAt: string;
  status: IngestionRuntimeLeaseStatus;
  createdAt: string;
  updatedAt: string;
};

export type AcquireLeaseInput = {
  requestKey: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  mode: IngestionExecutionMode;
  triggerKind: IngestionTriggerKind;
  slotStartAt: string | null;
  slotEndAt: string | null;
  leaseHolder: string;
  acquiredAt: string;
  expiresAt: string;
};

export type IngestionRuntimeLeaseRepository = {
  acquireLease(input: AcquireLeaseInput): Promise<{ acquired: boolean; lease: IngestionRuntimeLeaseRecord | null }>;
  releaseLease(requestKey: string, releasedAt: string): Promise<void>;
  getLeaseByRequestKey(requestKey: string): Promise<IngestionRuntimeLeaseRecord | null>;
  cleanupExpiredLeases(nowIso: string): Promise<number>;
};

export function getDefaultLeaseDurationMinutes(frequency: IngestionScheduleFrequency): number {
  const durations: Record<IngestionScheduleFrequency, number> = {
    five_minutes: 4,
    fifteen_minutes: 12,
    hourly: 45,
    four_hourly: 180,
    daily: 720
  };

  return durations[frequency];
}

export class MemoryIngestionRuntimeLeaseRepository implements IngestionRuntimeLeaseRepository {
  private readonly leases = new Map<string, IngestionRuntimeLeaseRecord>();

  async acquireLease(input: AcquireLeaseInput): Promise<{ acquired: boolean; lease: IngestionRuntimeLeaseRecord | null }> {
    const existing = this.leases.get(input.requestKey);

    if (existing) {
      const expired = Date.parse(existing.expiresAt) <= Date.parse(input.acquiredAt);
      const stillHeld = existing.status === 'acquired' && !expired;
      if (stillHeld) {
        return { acquired: false, lease: existing };
      }
    }

    const now = input.acquiredAt;
    const lease: IngestionRuntimeLeaseRecord = {
      requestKey: input.requestKey,
      asset: input.asset,
      timeframe: input.timeframe,
      mode: input.mode,
      triggerKind: input.triggerKind,
      slotStartAt: input.slotStartAt,
      slotEndAt: input.slotEndAt,
      leaseHolder: input.leaseHolder,
      acquiredAt: input.acquiredAt,
      expiresAt: input.expiresAt,
      status: 'acquired',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };

    this.leases.set(input.requestKey, lease);
    return { acquired: true, lease };
  }

  async releaseLease(requestKey: string, releasedAt: string): Promise<void> {
    const existing = this.leases.get(requestKey);
    if (!existing) return;
    this.leases.set(requestKey, { ...existing, status: 'released', updatedAt: releasedAt });
  }

  async getLeaseByRequestKey(requestKey: string): Promise<IngestionRuntimeLeaseRecord | null> {
    return this.leases.get(requestKey) ?? null;
  }

  async cleanupExpiredLeases(nowIso: string): Promise<number> {
    let count = 0;
    for (const [requestKey, lease] of this.leases.entries()) {
      if (lease.status === 'acquired' && Date.parse(lease.expiresAt) <= Date.parse(nowIso)) {
        this.leases.set(requestKey, { ...lease, status: 'expired', updatedAt: nowIso });
        count += 1;
      }
    }
    return count;
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

type LeaseRow = {
  request_key: string;
  asset: string;
  timeframe: string;
  mode: string;
  trigger_kind: string;
  slot_start_at: string | null;
  slot_end_at: string | null;
  lease_holder: string;
  acquired_at: string;
  expires_at: string;
  status: string;
  created_at: string;
  updated_at: string;
};

function mapLeaseRow(row: LeaseRow): IngestionRuntimeLeaseRecord {
  return {
    requestKey: row.request_key,
    asset: row.asset as CanonicalAssetSymbol,
    timeframe: row.timeframe as Timeframe,
    mode: row.mode as IngestionExecutionMode,
    triggerKind: row.trigger_kind as IngestionTriggerKind,
    slotStartAt: row.slot_start_at,
    slotEndAt: row.slot_end_at,
    leaseHolder: row.lease_holder,
    acquiredAt: row.acquired_at,
    expiresAt: row.expires_at,
    status: row.status as IngestionRuntimeLeaseStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class SqlIngestionRuntimeLeaseRepository implements IngestionRuntimeLeaseRepository {
  async acquireLease(input: AcquireLeaseInput): Promise<{ acquired: boolean; lease: IngestionRuntimeLeaseRecord | null }> {
    const rows = await queryDb<LeaseRow>(
      `INSERT INTO app_ingestion_runtime_leases (
         request_key, asset, timeframe, mode, trigger_kind,
         slot_start_at, slot_end_at, lease_holder, acquired_at,
         expires_at, status, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9,
         $10, 'acquired', $11, $12
       )
       ON CONFLICT (request_key) DO UPDATE SET
         asset = EXCLUDED.asset,
         timeframe = EXCLUDED.timeframe,
         mode = EXCLUDED.mode,
         trigger_kind = EXCLUDED.trigger_kind,
         slot_start_at = EXCLUDED.slot_start_at,
         slot_end_at = EXCLUDED.slot_end_at,
         lease_holder = EXCLUDED.lease_holder,
         acquired_at = EXCLUDED.acquired_at,
         expires_at = EXCLUDED.expires_at,
         status = CASE
           WHEN app_ingestion_runtime_leases.status = 'acquired' AND app_ingestion_runtime_leases.expires_at > EXCLUDED.acquired_at
             THEN app_ingestion_runtime_leases.status
           ELSE 'acquired'
         END,
         updated_at = EXCLUDED.updated_at
       WHERE NOT (app_ingestion_runtime_leases.status = 'acquired' AND app_ingestion_runtime_leases.expires_at > EXCLUDED.acquired_at)
       RETURNING
         request_key, asset, timeframe, mode, trigger_kind,
         slot_start_at, slot_end_at, lease_holder, acquired_at,
         expires_at, status, created_at, updated_at`,
      [
        input.requestKey,
        input.asset,
        input.timeframe,
        input.mode,
        input.triggerKind,
        input.slotStartAt,
        input.slotEndAt,
        input.leaseHolder,
        input.acquiredAt,
        input.expiresAt,
        input.acquiredAt,
        input.acquiredAt
      ]
    );

    if (rows[0]) {
      return { acquired: true, lease: mapLeaseRow(rows[0]) };
    }

    const existing = await this.getLeaseByRequestKey(input.requestKey);
    return { acquired: false, lease: existing };
  }

  async releaseLease(requestKey: string, releasedAt: string): Promise<void> {
    await queryDb(
      `UPDATE app_ingestion_runtime_leases
       SET status = 'released', updated_at = $2
       WHERE request_key = $1`,
      [requestKey, releasedAt]
    );
  }

  async getLeaseByRequestKey(requestKey: string): Promise<IngestionRuntimeLeaseRecord | null> {
    const rows = await queryDb<LeaseRow>(
      `SELECT
        request_key, asset, timeframe, mode, trigger_kind,
        slot_start_at, slot_end_at, lease_holder, acquired_at,
        expires_at, status, created_at, updated_at
       FROM app_ingestion_runtime_leases
       WHERE request_key = $1`,
      [requestKey]
    );

    return rows[0] ? mapLeaseRow(rows[0]) : null;
  }

  async cleanupExpiredLeases(nowIso: string): Promise<number> {
    const rows = await queryDb<{ request_key: string }>(
      `UPDATE app_ingestion_runtime_leases
       SET status = 'expired', updated_at = $1
       WHERE status = 'acquired' AND expires_at <= $1
       RETURNING request_key`,
      [nowIso]
    );
    return rows.length;
  }
}

export function createIngestionRuntimeLeaseRepository(env: Record<string, string | undefined>): IngestionRuntimeLeaseRepository {
  if (env.DATABASE_URL) {
    return new SqlIngestionRuntimeLeaseRepository();
  }

  return new MemoryIngestionRuntimeLeaseRepository();
}
