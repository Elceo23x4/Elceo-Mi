import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import pg from 'pg';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_required_for_ifp8_postgres');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 8 });
const root = new URL('../', import.meta.url);
try {
  const migrations = (await readdir(new URL('infra/db/schema/', root)))
    .filter((name) => /^\d{4}.*\.sql$/.test(name) && name.slice(0, 4) <= '0049')
    .sort();
  for (const name of migrations)
    await pool.query(await readFile(new URL(`infra/db/schema/${name}`, root), 'utf8'));
  assert(migrations.at(-1)?.startsWith('0049_'));
  assert.equal(
    (await pool.query("SELECT to_regclass('public.intelligence_acceptance_records') name")).rows[0]
      .name,
    'intelligence_acceptance_records',
  );
  assert.equal(
    Number(
      (
        await pool.query(
          "SELECT count(*) n FROM pg_constraint WHERE conrelid='intelligence_acceptance_links'::regclass AND contype='f'",
        )
      ).rows[0].n,
    ),
    2,
  );
  const compiled = new URL(
    '../services/reasoning/dist-test-cjs/services/reasoning/src/intelligence-acceptance/',
    import.meta.url,
  );
  const api = await import(new URL('index.cjs', compiled));
  const sql = new api.SqlIntelligenceAcceptanceRepository(pool),
    memory = new api.MemoryIntelligenceAcceptanceRepository(),
    at = '2026-01-01T00:00:00Z';
  const fixture = api.finalizeDatasetManifest({
    datasetId: 'ifp8-pg-fixture',
    datasetVersion: '1',
    datasetClass: 'fixture',
    generatedAt: at,
    periodStart: at,
    periodEnd: at,
    sourceRegistryVersion: 'v1',
    sourceRegistryHash: 'a'.repeat(64),
    sourceIds: ['fixture'],
    assetCoverage: ['xau_usd'],
    eventClassCoverage: ['cpi'],
    horizonCoverage: ['follow_through'],
    sampleCount: 1,
    eventInstanceCount: 1,
    provenanceSummary: 'fixture only',
    rawArtifactHashes: ['b'.repeat(64)],
    normalizationPolicyVersion: 'v1',
    outcomePolicyVersion: 'v1',
    splitPolicyVersion: 'v1',
    calibrationPartitionHash: api.partitionHash(['cal']),
    embargoPartitionHash: api.partitionHash(['emb']),
    holdoutPartitionHash: api.partitionHash(['hold']),
  });
  const relabeled = api.finalizeDatasetManifest({
    ...fixture,
    datasetClass: 'certified_replay',
    canonicalPayloadHash: undefined,
  });
  const certification = api.finalizeCertification({
    datasetId: fixture.datasetId,
    datasetVersion: '1',
    datasetManifestHash: fixture.canonicalPayloadHash,
    claimedDatasetClass: 'fixture',
    sourceRegistryVersion: 'v1',
    sourceRegistryHash: fixture.sourceRegistryHash,
    rawArtifactHashes: fixture.rawArtifactHashes,
    captureReplayProvenance: ['fixture'],
    sourceIds: fixture.sourceIds,
    reliabilitySummary: { fixture: 1 },
    fixtureContamination: true,
    unverifiedContamination: false,
    certificationEvidenceReferences: ['fixture-ref'],
    certifiedAt: at,
  });
  assert(
    api
      .verifyDatasetCertification(relabeled, certification)
      .includes('dataset_certification_manifest_mismatch'),
  );
  for (const repo of [memory, sql]) {
    await repo.save('dataset_manifest', fixture.datasetId, fixture);
    await repo.save('dataset_certification', fixture.datasetId, certification);
    assert.deepEqual(await repo.get('dataset_certification', fixture.datasetId), certification);
  }
  const split = api.finalizeSplit({
    datasetId: fixture.datasetId,
    calibrationEventIds: ['cal'],
    embargoEventIds: ['emb'],
    holdoutEventIds: ['hold'],
    eventFamilies: { cal: 'a', emb: 'b', hold: 'c' },
    eventTimes: { cal: '2025-01-01', emb: '2025-01-04', hold: '2025-01-10' },
    outcomeWindowEnds: { cal: '2025-01-02', emb: '2025-01-05', hold: '2025-01-11' },
    maximumOutcomeHorizonMs: 86400000,
  });
  await sql.save('split_manifest', fixture.datasetId, split);
  assert.deepEqual(await sql.get('split_manifest', fixture.datasetId), split);
  await pool.query(
    "INSERT INTO intelligence_acceptance_records(record_kind,record_id,canonical_payload,canonical_payload_hash,created_at) VALUES('acceptance_run','link-proof','{}',$1,$2)",
    ['c'.repeat(64), at],
  );
  await pool.query(
    "INSERT INTO intelligence_acceptance_links(acceptance_run_id,record_kind,record_id,created_at) VALUES('link-proof','dataset_certification',$1,$2),('link-proof','split_manifest',$1,$2)",
    [fixture.datasetId, at],
  );
  assert.deepEqual(
    (await sql.listLinks('link-proof')).map((link) => link.id),
    [fixture.datasetId, fixture.datasetId],
  );
  await assert.rejects(
    () =>
      pool.query(
        "INSERT INTO intelligence_acceptance_links(acceptance_run_id,record_kind,record_id,created_at) VALUES('link-proof','dataset_certification',$1,$2)",
        [certification.certificationId, at],
      ),
    /foreign key/i,
  );
  const lifecycle = api.createHoldoutLifecycle({
    acceptanceRunFamilyId: 'ifp8-family',
    datasetId: fixture.datasetId,
    holdoutPartitionHash: fixture.holdoutPartitionHash,
    selectedConfigurationVersionId: 'baseline',
    selectedAt: at,
  });
  await sql.freezeCandidate(lifecycle);
  const restarted = new api.SqlIntelligenceAcceptanceRepository(pool);
  assert.equal(
    (await restarted.openHoldout('ifp8-family', '2026-01-02T00:00:00Z')).state,
    'opened',
  );
  await assert.rejects(
    () => sql.openHoldout('ifp8-family', '2026-01-03T00:00:00Z'),
    /already_open/,
  );
  await restarted.completeHoldout('ifp8-family', '2026-01-04T00:00:00Z');
  assert.equal(
    (
      await new api.SqlIntelligenceAcceptanceRepository(pool).get(
        'holdout_lifecycle',
        'ifp8-family',
      )
    ).state,
    'completed',
  );
  await assert.rejects(
    () => sql.openHoldout('ifp8-family', '2026-01-05T00:00:00Z'),
    /already_consumed/,
  );
  await assert.rejects(
    () =>
      sql.freezeCandidate(
        api.createHoldoutLifecycle({ ...lifecycle, acceptanceRunFamilyId: 'ifp8-family-reuse' }),
      ),
    /reserved/i,
  );
  const failedLifecycle = api.createHoldoutLifecycle({
    ...lifecycle,
    acceptanceRunFamilyId: 'ifp8-family-failed',
    datasetId: 'ifp8-pg-fixture-failed',
    holdoutPartitionHash: api.partitionHash(['failed-holdout']),
  });
  await sql.freezeCandidate(failedLifecycle);
  await sql.openHoldout(failedLifecycle.acceptanceRunFamilyId, '2026-01-02T00:00:00Z');
  await sql.failHoldout(
    failedLifecycle.acceptanceRunFamilyId,
    '2026-01-03T00:00:00Z',
    'injected_failure',
  );
  assert.equal(
    (
      await new api.SqlIntelligenceAcceptanceRepository(pool).get(
        'holdout_lifecycle',
        failedLifecycle.acceptanceRunFamilyId,
      )
    ).state,
    'failed',
  );
  await assert.rejects(
    () =>
      new api.SqlIntelligenceAcceptanceRepository(pool).freezeCandidate({
        ...lifecycle,
        selectedConfigurationVersionId: 'other',
      }),
    /frozen/,
  );
  const concurrent = await Promise.all(
    Array.from({ length: 4 }, () => sql.save('dataset_manifest', fixture.datasetId, fixture)),
  );
  assert(concurrent.every((row) => row.canonicalPayloadHash === fixture.canonicalPayloadHash));
  await assert.rejects(
    () =>
      sql.save('dataset_manifest', fixture.datasetId, {
        ...fixture,
        provenanceSummary: 'conflict',
      }),
    /immutable/,
  );
  console.log(
    'IFP-8 PostgreSQL certification, relabel rejection, durable holdout, concurrency, restart and parity passed; fixture cannot production-pass',
  );
} finally {
  await pool.end();
}
