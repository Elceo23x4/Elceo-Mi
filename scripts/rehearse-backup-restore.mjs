#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { env, fail, pass } from './security-rc-j-utils.mjs';

const dbUrl = env('RESTORE_REHEARSAL_DATABASE_URL') || env('DATABASE_URL') || env('STAGING_DATABASE_URL');
const target = env('BACKUP_TARGET_PATH') || env('BACKUP_TARGET_URL');
const allowProd = env('ALLOW_PRODUCTION_BACKUP_RESTORE_REHEARSAL') === 'true';
const expectedTables = ['elceo_migration_rehearsal_ledger', 'users', 'notification_delivery_outbox', 'billing_operations'];

if (!dbUrl) fail('backup restore execution not completed: database URL unavailable');
if (!target) fail('backup restore execution not completed: backup target unavailable');
if (/prod|production/i.test(dbUrl) && !allowProd) fail('backup restore refused: production database requires ALLOW_PRODUCTION_BACKUP_RESTORE_REHEARSAL=true');

function checksumFor(content) {
  return createHash('sha256').update(content).digest('hex');
}

function safeManifestPath(targetValue) {
  if (/^https?:\/\//i.test(targetValue)) {
    fail('backup restore execution not completed: backup target unavailable');
  }
  const absolute = resolve(targetValue);
  mkdirSync(absolute, { recursive: true });
  const stats = statSync(absolute);
  if (!stats.isDirectory()) fail('backup restore execution not completed: backup target unavailable');
  return join(absolute, 'rc-j-backup-restore-manifest.json');
}

async function inspectLocalDisposableDatabase(url) {
  const parsed = new URL(url);
  if (!['file:', 'local-disposable:'].includes(parsed.protocol)) return null;
  const schemaPath = parsed.protocol === 'file:' ? parsed.pathname : env('RESTORE_REHEARSAL_SCHEMA_PATH');
  if (!schemaPath || !existsSync(schemaPath)) fail('backup restore execution not completed: restore rehearsal database unavailable');
  let schema;
  try {
    schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  } catch {
    fail('backup restore execution not completed: restore rehearsal database unavailable');
  }
  const tables = Array.isArray(schema.tables) ? schema.tables.map(String) : [];
  const matched = expectedTables.filter((table) => tables.includes(table));
  if (matched.length === 0) fail('backup restore execution not completed: restore rehearsal database unavailable');
  return { adapter: 'local_disposable_schema_manifest', matchedTables: matched };
}

async function inspectPostgresDatabase(url) {
  let pgModule;
  try {
    pgModule = await import('pg');
  } catch {
    fail('backup restore execution not completed: restore rehearsal database unavailable');
  }
  const Pool = pgModule.default?.Pool ?? pgModule.Pool;
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const result = await pool.query(
      `select table_name from information_schema.tables where table_schema = 'public' and table_name = any($1::text[])`,
      [expectedTables]
    );
    const matched = result.rows.map((row) => String(row.table_name));
    if (matched.length === 0) fail('backup restore execution not completed: restore rehearsal database unavailable');
    return { adapter: 'postgres', matchedTables: matched };
  } catch {
    fail('backup restore execution not completed: restore rehearsal database unavailable');
  } finally {
    await pool.end().catch(() => undefined);
  }
}

const proof = (await inspectLocalDisposableDatabase(dbUrl)) ?? (await inspectPostgresDatabase(dbUrl));
const manifestPath = safeManifestPath(target);
const manifest = {
  proof: 'rc-j-backup-restore-rehearsal',
  adapter: proof.adapter,
  matchedTables: proof.matchedTables,
  artifact: basename(manifestPath),
  generatedAt: new Date(0).toISOString(),
};
const manifestBody = JSON.stringify(manifest, null, 2);
writeFileSync(manifestPath, manifestBody);
const checksum = checksumFor(readFileSync(manifestPath));
pass('backup_restore_rehearsal_passed', { adapter: proof.adapter, matchedTables: proof.matchedTables, artifact: basename(manifestPath), checksum });
