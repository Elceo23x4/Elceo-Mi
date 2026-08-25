import { readFile, readdir } from 'node:fs/promises';
import { extractCanonicalCandleObservations, getCanonicalCandleObservation } from '@elceo/schemas';
import type { CanonicalEvent } from '@elceo/types';
import { mapCandleToCanonical } from '../bridges/shared';
import { SqlIngestionEventSnapshotRepository } from '../persistence/sql-ingestion-repository';

function assert(condition: boolean, message: string): asserts condition { if (!condition) throw new Error(`Assertion failed: ${message}`); }

export async function runCanonicalCandlePostgresTests(): Promise<void> {
  if (process.env.CANONICAL_CANDLE_POSTGRES_INTEGRATION !== '1') return;
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_required_for_canonical_candle_postgres');
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const schemaRoot = `${process.cwd()}/infra/db/schema/`;
  const migrationFiles = (await readdir(schemaRoot)).filter((name) => /^\d{4}.*\.sql$/.test(name)).sort();
  for (const file of migrationFiles) await pool.query(await readFile(`${schemaRoot}${file}`, 'utf8'));
  const runId = `canonical-candle-pg-${process.pid}-${Date.now()}`;
  const timestamp = '2026-01-01T00:00:00.000Z';
  const make = (observedAt: string, close = 105): CanonicalEvent => mapCandleToCanonical({ type: 'market_candle', provider: 'finnhub', assetCode: 'XAU/USD', timeframe: '60', open: 100, high: 110, low: 90, close, volume: 12, timestampUtc: observedAt }, 'XAU/USD', 'H1');
  const first = make(timestamp);
  const later = make('2026-01-01T01:00:00.000Z');
  const revised = make(timestamp, 106);
  try {
    await pool.query(`INSERT INTO app_ingestion_runs(run_id,asset,timeframe,mode,active_boundary,status,started_at,ended_at,duration_ms,canonical_event_count,legacy_event_count,output_event_count,fallback_applied,fallback_reason,boundary_version,comparison_json,diagnostics_summary_json,provider_capabilities_json,created_at) VALUES($1,'XAU/USD','H1','canonical','canonical','success',now(),now(),0,2,NULL,2,false,NULL,'candle-integrity-v1',NULL,'{}','[]',now())`, [runId]);
    const repository = new SqlIngestionEventSnapshotRepository();
    await repository.saveEventSnapshots(runId, 'XAU/USD', 'H1', [later, first]);
    const reloaded = await repository.getEventsByRunId(runId);
    const observations = extractCanonicalCandleObservations(reloaded);
    assert(observations.length === 2 && observations[0]?.observedAt === timestamp, 'SQL reload must preserve and order typed candles');
    assert(JSON.stringify(getCanonicalCandleObservation(reloaded.find((event) => event.id === first.id)!)) === JSON.stringify(first.observation), 'SQL JSONB roundtrip must be lossless and revalidate');
    let conflict = false;
    try { await repository.saveEventSnapshots(runId, 'XAU/USD', 'H1', [first, revised]); } catch (error) { conflict = error instanceof Error && error.message.startsWith('canonical_candle_revision_conflict:'); }
    assert(conflict, 'SQL persistence must explicitly reject same-slot conflicting content');
    assert((await repository.getEventsByRunId(runId)).length === 2, 'preflight conflict must leave prior SQL snapshot intact');
  } finally {
    await pool.query('DELETE FROM app_ingestion_runs WHERE run_id = $1', [runId]);
    await (pool as unknown as { end(): Promise<void> }).end();
  }
}
