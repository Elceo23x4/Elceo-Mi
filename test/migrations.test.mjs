import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readMigrations, duplicatePrefixes, classifySql } from '../scripts/migration-utils.mjs';
import { rehearse, MockDb } from '../scripts/rehearse-db-migrations.mjs';

async function fixture(files) {
  const dir = await mkdtemp(path.join(tmpdir(), 'elceo-mig-'));
  for (const [name, sql] of Object.entries(files)) await writeFile(path.join(dir, name), sql);
  return dir;
}

const files = {
  '0001_init.sql': 'CREATE TABLE alpha (id text primary key);',
  '0027_b.sql': 'CREATE TABLE beta (id text primary key, alpha_id text);',
  '0027_a.sql': 'ALTER TABLE beta ADD COLUMN name text;',
  '0028_stop.sql': 'CREATE TABLE stop_here (id text);',
};
const rehearsalFlag = '1';

test('full filename lexicographic ordering beats numeric-prefix-only ordering', async () => {
  const dir = await fixture(files);
  try {
    const { migrations } = await readMigrations(dir);
    assert.deepEqual(migrations.map((m) => m.filename), ['0001_init.sql', '0027_a.sql', '0027_b.sql', '0028_stop.sql']);
    assert.notDeepEqual(Object.keys(files).sort((a, b) => a.slice(0, 4).localeCompare(b.slice(0, 4))), migrations.map((m) => m.filename));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('duplicate prefixes warnable not fatal', async () => {
  assert.deepEqual(duplicatePrefixes(['0027_a.sql', '0027_b.sql'])[0].prefix, '0027');
});

test('dry-run returns deterministic order', async () => {
  const dir = await fixture(files);
  try {
    const summary = await rehearse({ schemaDir: dir, dryRun: true });
    assert.equal(summary.applied, 0);
    assert.deepEqual(summary.ordered, ['0001_init.sql', '0027_a.sql', '0027_b.sql', '0028_stop.sql']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('non-dry-run without rehearsal flag is rejected', async () => {
  const dir = await fixture(files);
  try {
    await assert.rejects(() => rehearse({ schemaDir: dir, dryRun: false, db: new MockDb() }), /ELCEO_MIGRATION_REHEARSAL=1/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('non-dry-run without DATABASE_URL and without injected DB is rejected', async () => {
  const dir = await fixture(files);
  try {
    await assert.rejects(() => rehearse({ schemaDir: dir, dryRun: false, rehearsalFlag }), /DATABASE_URL is required/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('clean apply records ledger summary with injected DB', async () => {
  const dir = await fixture(files);
  try {
    const db = new MockDb();
    const summary = await rehearse({ schemaDir: dir, db, rehearsalFlag });
    assert.equal(summary.applied, 4);
    assert.equal(db.ledger.size, 4);
    assert.equal(summary.ledger.at(-1).status, 'applied');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('repeat apply skips already recorded migrations', async () => {
  const dir = await fixture(files);
  try {
    const db = new MockDb();
    await rehearse({ schemaDir: dir, db, rehearsalFlag });
    const summary = await rehearse({ schemaDir: dir, db, rehearsalFlag });
    assert.equal(summary.skipped, 4);
    assert.equal(summary.applied, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('checksum mismatch fails', async () => {
  const dir = await fixture(files);
  try {
    const db = new MockDb();
    await rehearse({ schemaDir: dir, db, rehearsalFlag });
    await writeFile(path.join(dir, '0001_init.sql'), 'CREATE TABLE alpha (id text primary key, changed text);');
    await assert.rejects(() => rehearse({ schemaDir: dir, db, rehearsalFlag }), /Checksum drift/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('failure stops chain', async () => {
  const dir = await fixture(files);
  try {
    const db = new MockDb({ failOn: 'stop_here' });
    await assert.rejects(() => rehearse({ schemaDir: dir, db, rehearsalFlag }), /0028_stop/);
    assert.equal(db.ledger.has('0028_stop.sql'), true);
    assert.equal(db.ledger.get('0028_stop.sql').status, 'failed');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('DATABASE_URL selects real executor factory and closes on success', async () => {
  const dir = await fixture({ '0001_init.sql': 'CREATE TABLE alpha (id text primary key);' });
  try {
    const db = new MockDb();
    let receivedUrl = null;
    const summary = await rehearse({
      schemaDir: dir,
      databaseUrl: 'postgres://local/rehearsal',
      rehearsalFlag,
      executorFactory: async (url) => { receivedUrl = url; return db; },
    });
    assert.equal(receivedUrl, 'postgres://local/rehearsal');
    assert.equal(summary.executor, 'postgres');
    assert.equal(summary.applied, 1);
    assert.equal(db.closed, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('DATABASE_URL executor closes on failure', async () => {
  const dir = await fixture({ '0001_fail.sql': 'CREATE TABLE fail_me (id text);' });
  try {
    const db = new MockDb({ failOn: 'fail_me' });
    await assert.rejects(() => rehearse({
      schemaDir: dir,
      databaseUrl: 'postgres://local/rehearsal',
      rehearsalFlag,
      executorFactory: async () => db,
    }), /0001_fail/);
    assert.equal(db.closed, true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('classifies destructive migrations', () => {
  assert.ok(classifySql('DROP TABLE x;').includes('destructive'));
  assert.ok(classifySql('CREATE INDEX i ON x(id);').includes('index-additive'));
});
