#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const url = process.env.ELCEO_TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error('macro vintage PostgreSQL acceptance requires ELCEO_TEST_DATABASE_URL or DATABASE_URL');

const suffix = `dfc1_${process.pid}_${Date.now()}`;
const correlationKey = `US:CPI:${suffix}`;
const requestId = `request_${suffix}`;
const migration = await readFile(new URL('../infra/db/schema/0063_evidence_macro_vintages.sql', import.meta.url), 'utf8');

const connect = () => new pg.Pool({ connectionString: url, max: 1 });
let pool = connect();

const insertVintage = async ({ knownAt, value, vintageId, revisionState, previousPublishedValue }) => pool.query(
  `INSERT INTO app_macro_evidence_vintages(
    observation_identity,correlation_key,country_or_area,indicator_id,reference_period,
    known_at,retrieved_at,effective_at,vintage_id,previous_published_value,published_value,
    revision_state,canonical_source_id,source_reference,provider_request_id
  ) VALUES($1,$2,'US','CPI','2026-01',$3,$3,$3,$4,$5,$6,$7,'bls_official','https://api.bls.gov',$8)
  ON CONFLICT DO NOTHING`,
  [suffix, correlationKey, knownAt, vintageId, previousPublishedValue, value, revisionState, requestId]
);

const asKnownAt = async (knownAt) => {
  const result = await pool.query(
    `SELECT published_value,revision_state,vintage_id,known_at::text
       FROM app_macro_evidence_vintages
      WHERE correlation_key=$1 AND known_at<=$2
      ORDER BY known_at DESC
      LIMIT 1`,
    [correlationKey, knownAt]
  );
  return result.rows[0] ?? null;
};

try {
  await pool.query(migration);
  await pool.query(
    `INSERT INTO app_provider_source_requests(request_id,provider_id,capability,requested_at,params_json,created_at)
     VALUES($1,'bls_official','macro_indicator_series',now(),'{}',now())`,
    [requestId]
  );

  await insertVintage({ knownAt: '2026-02-01T00:00:00Z', value: 100, vintageId: 'initial', revisionState: 'preliminary', previousPublishedValue: null });
  await insertVintage({ knownAt: '2026-03-01T00:00:00Z', value: 101, vintageId: 'revision-1', revisionState: 'revised', previousPublishedValue: 100 });
  await insertVintage({ knownAt: '2026-03-01T00:00:00Z', value: 101, vintageId: 'revision-1', revisionState: 'revised', previousPublishedValue: 100 });

  const beforeFirstRevision = await asKnownAt('2026-02-15T00:00:00Z');
  assert.equal(Number(beforeFirstRevision?.published_value), 100);
  assert.equal(beforeFirstRevision?.revision_state, 'preliminary');

  const afterFirstRevision = await asKnownAt('2026-03-15T00:00:00Z');
  assert.equal(Number(afterFirstRevision?.published_value), 101);
  assert.equal(afterFirstRevision?.revision_state, 'revised');

  const countAfterDuplicate = await pool.query('SELECT count(*)::int AS count FROM app_macro_evidence_vintages WHERE correlation_key=$1', [correlationKey]);
  assert.equal(countAfterDuplicate.rows[0]?.count, 2, 'idempotent re-ingestion must not create a duplicate vintage');

  await pool.end();
  pool = connect();

  const afterProcessReload = await asKnownAt('2026-03-15T00:00:00Z');
  assert.equal(Number(afterProcessReload?.published_value), 101, 'durable as-of semantics must survive repository/process reload');

  await insertVintage({ knownAt: '2026-04-01T00:00:00Z', value: 102, vintageId: 'final', revisionState: 'final', previousPublishedValue: 101 });

  const historicalAfterLaterRevision = await asKnownAt('2026-03-15T00:00:00Z');
  assert.equal(Number(historicalAfterLaterRevision?.published_value), 101, 'later revisions must never contaminate an earlier as-known-at query');

  const finalState = await asKnownAt('2026-04-15T00:00:00Z');
  assert.equal(Number(finalState?.published_value), 102);
  assert.equal(finalState?.revision_state, 'final');

  const history = await pool.query(
    `SELECT published_value,revision_state,vintage_id
       FROM app_macro_evidence_vintages
      WHERE correlation_key=$1
      ORDER BY known_at`,
    [correlationKey]
  );
  assert.deepEqual(history.rows.map((row) => Number(row.published_value)), [100, 101, 102]);
  assert.deepEqual(history.rows.map((row) => row.revision_state), ['preliminary', 'revised', 'final']);
  assert.deepEqual(history.rows.map((row) => row.vintage_id), ['initial', 'revision-1', 'final']);

  console.log('macro vintage PostgreSQL acceptance passed: append-only history, idempotency, process reload, revision isolation, and as-known-at semantics');
} finally {
  if (pool.ended) pool = connect();
  await pool.query('DELETE FROM app_macro_evidence_vintages WHERE correlation_key=$1', [correlationKey]).catch(() => {});
  await pool.query('DELETE FROM app_provider_source_requests WHERE request_id=$1', [requestId]).catch(() => {});
  await pool.end().catch(() => {});
}
