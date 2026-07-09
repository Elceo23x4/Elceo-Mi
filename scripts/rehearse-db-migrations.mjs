#!/usr/bin/env node
import { readMigrations } from './migration-utils.mjs';

export const LEDGER_TABLE = 'elceo_migration_rehearsal_ledger';

export class MockDb {
  constructor(opts = {}) {
    this.ledger = new Map(opts.ledger ?? []);
    this.executed = [];
    this.failOn = opts.failOn;
    this.closed = false;
  }

  async query(sql, params = []) {
    this.executed.push({ sql, params });
    if (this.failOn && String(sql).includes(this.failOn)) throw new Error(`mock failure on ${this.failOn}`);
    if (/SELECT\s+checksum\s*,\s*status\s+FROM\s+elceo_migration_rehearsal_ledger/i.test(String(sql))) {
      const row = this.ledger.get(params[0]);
      return { rows: row ? [{ checksum: row.checksum, status: row.status }] : [] };
    }
    if (/INSERT\s+INTO\s+elceo_migration_rehearsal_ledger/i.test(String(sql))) {
      this.ledger.set(params[0], { checksum: params[1], status: String(sql).includes("'failed'") ? 'failed' : 'applied' });
    }
    return { rows: [] };
  }

  async close() {
    this.closed = true;
  }
}

export async function createPostgresExecutor(databaseUrl) {
  const pgModule = await import('pg');
  const Pool = pgModule.Pool ?? pgModule.default?.Pool;
  if (!Pool) throw new Error('pg module did not expose Pool');
  const pool = new Pool({ connectionString: databaseUrl });
  return {
    query: (sql, params = []) => pool.query(sql, params),
    close: () => pool.end(),
  };
}

async function selectRecorded(db, filename) {
  const result = await db.query(
    `SELECT checksum, status FROM ${LEDGER_TABLE} WHERE filename = $1 AND status = 'applied'`,
    [filename],
  );
  return result.rows?.[0] ?? null;
}

async function ensureLedger(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS ${LEDGER_TABLE} (filename text primary key, checksum text not null, applied_at timestamptz not null, duration_ms integer not null, status text not null, error_message text)`);
}

export async function rehearse({
  schemaDir = process.env.ELCEO_SCHEMA_DIR,
  dryRun = process.env.ELCEO_MIGRATION_DRY_RUN === '1',
  databaseUrl = process.env.DATABASE_URL,
  rehearsalFlag = process.env.ELCEO_MIGRATION_REHEARSAL,
  db = null,
  executorFactory = createPostgresExecutor,
} = {}) {
  const { migrations } = await readMigrations(schemaDir);
  const summary = { applied: 0, skipped: 0, failed: 0, ordered: migrations.map((m) => m.filename), ledger: [], executor: db ? 'injected' : dryRun ? 'dry-run' : 'postgres' };

  if (dryRun) {
    console.log('Dry-run/order-only migration rehearsal. No database connection used.');
    summary.ordered.forEach((file) => console.log(` - ${file}`));
    return summary;
  }

  if (rehearsalFlag !== '1') throw new Error('Refusing to run without ELCEO_MIGRATION_REHEARSAL=1');
  if (!databaseUrl && !db) throw new Error('DATABASE_URL is required unless using an injected test DB or dry-run');

  const ownsDb = !db;
  const executor = db ?? await executorFactory(databaseUrl);

  try {
    await ensureLedger(executor);
    for (const migration of migrations) {
      const existing = await selectRecorded(executor, migration.filename);
      if (existing) {
        if (existing.checksum !== migration.checksum) throw new Error(`Checksum drift for ${migration.filename}`);
        summary.skipped += 1;
        summary.ledger.push({ filename: migration.filename, status: 'skipped' });
        continue;
      }

      const start = Date.now();
      try {
        await executor.query(migration.sql);
        const durationMs = Date.now() - start;
        await executor.query(
          `INSERT INTO ${LEDGER_TABLE} (filename,checksum,applied_at,duration_ms,status,error_message) VALUES ($1,$2,NOW(),$3,'applied',NULL)`,
          [migration.filename, migration.checksum, durationMs],
        );
        summary.applied += 1;
        summary.ledger.push({ filename: migration.filename, status: 'applied', duration_ms: durationMs });
      } catch (error) {
        summary.failed += 1;
        const durationMs = Date.now() - start;
        const message = error instanceof Error ? error.message : 'unknown_error';
        await executor.query(
          `INSERT INTO ${LEDGER_TABLE} (filename,checksum,applied_at,duration_ms,status,error_message) VALUES ($1,$2,NOW(),$3,'failed',$4)`,
          [migration.filename, migration.checksum, durationMs, message],
        ).catch(() => {});
        summary.ledger.push({ filename: migration.filename, status: 'failed', error_message: message });
        throw Object.assign(new Error(`Migration failed at ${migration.filename}: ${message}`), { summary });
      }
    }

    console.log(`Migration rehearsal summary: applied=${summary.applied} skipped=${summary.skipped} failed=${summary.failed}`);
    return summary;
  } finally {
    if (ownsDb && typeof executor.close === 'function') await executor.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  rehearse().catch((error) => {
    const message = error instanceof Error ? error.message : 'unknown_error';
    console.error(`Migration rehearsal failed: ${message}`);
    process.exit(1);
  });
}
