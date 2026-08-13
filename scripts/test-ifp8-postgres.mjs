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
  const acceptanceApi = await import(new URL('acceptance-gate.cjs', compiled));
  const persistenceApi = await import(
    new URL('../persistence/memory-reasoning-repository.cjs', compiled)
  );
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
    createdAt: at,
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
  await sql.save(
    'configuration_version',
    api.CANONICAL_RUNTIME_BASELINE.configurationVersionId,
    api.CANONICAL_RUNTIME_BASELINE,
  );
  const preflightFamily = 'ifp8-sql-public-preflight';
  const preflightRollback = api.createRollbackEvidence({
    datasetId: fixture.datasetId,
    splitId: split.splitId,
    acceptanceRunFamilyId: preflightFamily,
    fromConfigurationVersionId: api.CANONICAL_RUNTIME_BASELINE.configurationVersionId,
    restoredConfigurationVersionId: api.CANONICAL_RUNTIME_BASELINE.configurationVersionId,
    expectedPreviousParameterSnapshotHash: api.CANONICAL_RUNTIME_BASELINE.parameterSnapshotHash,
    restoredParameterSnapshotHash: api.CANONICAL_RUNTIME_BASELINE.parameterSnapshotHash,
    reproductions: [
      {
        caseId: 'fixture-case',
        decisionTimeEvidenceHash: 'd'.repeat(64),
        previousCanonicalOutputHash: 'e'.repeat(64),
        restoredCanonicalOutputHash: 'e'.repeat(64),
        match: true,
      },
    ],
    createdAt: at,
  });
  await sql.save('rollback_evidence', preflightRollback.rollbackEvidenceId, preflightRollback);
  await sql.freezeCandidate(
    api.createHoldoutLifecycle({
      acceptanceRunFamilyId: preflightFamily,
      datasetId: fixture.datasetId,
      holdoutPartitionHash: split.holdoutPartitionHash,
      selectedConfigurationVersionId: api.CANONICAL_RUNTIME_BASELINE.configurationVersionId,
      selectedAt: at,
    }),
  );
  let publicSourceCalls = 0;
  const productionAdapter = new api.ProductionIfpChainAdapter(
    new persistenceApi.MemoryReasoningPersistenceRepository(),
    new api.CanonicalRuntimeBaselineAuthority(),
  );
  const service = new api.IntelligenceAcceptanceService(
    sql,
    productionAdapter,
    {
      list: async () => {
        publicSourceCalls++;
        return [];
      },
      outcomeObservations: async () => null,
    },
    { verify: async () => true },
    { resolve: async () => null },
    { resolveOutcomePolicy: async () => null, resolveEmpiricalPolicy: async () => null },
  );
  await assert.rejects(
    () =>
      service.run({
        runFamilyId: preflightFamily,
        datasetId: fixture.datasetId,
        configurationVersionId: api.CANONICAL_RUNTIME_BASELINE.configurationVersionId,
        rollbackEvidenceId: preflightRollback.rollbackEvidenceId,
        createdAt: at,
      }),
    /preflight_blocked_missing_certified_evidence/,
  );
  assert.equal(publicSourceCalls, 0);
  assert.equal((await sql.get('holdout_lifecycle', preflightFamily)).state, 'selected');
  await assert.rejects(
    () =>
      sql.freezeCandidate(
        api.createHoldoutLifecycle({
          acceptanceRunFamilyId: 'ifp8-preflight-conflicting-family',
          datasetId: fixture.datasetId,
          holdoutPartitionHash: split.holdoutPartitionHash,
          selectedConfigurationVersionId: api.CANONICAL_RUNTIME_BASELINE.configurationVersionId,
          selectedAt: at,
        }),
      ),
    /holdout_tranche_already_reserved/,
  );
  const testCoverageBody = {
    coveragePolicyId: 'TEST-ONLY-NOT-PRODUCTION',
    status: 'approved',
    cells: [
      {
        cellId: 'test-xau-cpi-follow-through',
        asset: 'xau_usd',
        eventClass: 'cpi',
        horizon: 'follow_through',
        requiredEvidenceFamilies: [],
        minimumUniqueEvents: 1,
        structuralDecisionId: null,
        policyVersion: 'ifp8-launch-coverage-v1',
      },
    ],
    diagnosticAssets: ['dxy', 'vix'],
    approvalReference: 'TEST-ONLY-NOT-PRODUCTION',
  };
  const [coverageDecision] = api.evaluateCoverage(
    { ...testCoverageBody, canonicalPayloadHash: api.canonicalHash(testCoverageBody) },
    [
      {
        caseId: 'fixture-case',
        eventInstanceId: 'hold',
        eventFamilyId: 'c',
        evidenceCutoffAt: at,
        asset: 'xau_usd',
        eventClass: 'cpi',
        horizon: 'follow_through',
        qualifiedEvidenceFamilies: [],
        references: [],
        productionInput: { eventEvaluationId: 'fixture-event', evidenceCutoffAt: at },
      },
    ],
    new Set(),
    {
      datasetId: fixture.datasetId,
      splitId: split.splitId,
      acceptanceRunFamilyId: preflightFamily,
      createdAt: at,
    },
  );
  await sql.save('coverage_decision', coverageDecision.coverageDecisionId, coverageDecision);
  assert.deepEqual(
    await sql.get('coverage_decision', coverageDecision.coverageDecisionId),
    coverageDecision,
  );
  await assert.rejects(
    () =>
      sql.save('coverage_decision', `${coverageDecision.coverageDecisionId}-tampered`, coverageDecision),
    /derived_id/,
  );
  const riskBody = {
    riskId: 'ifp8-test-risk',
    scope: 'test-only',
    severity: 'low',
    evidence: ['fixture'],
    affectedAssets: ['xau_usd'],
    eventClasses: ['cpi'],
    horizons: ['follow_through'],
    classification: 'empirical_limitation',
    resolutionState: 'open',
    blocksAcceptance: true,
    owner: 'test',
    createdAt: at,
  };
  const risk = { ...riskBody, canonicalPayloadHash: api.canonicalHash(riskBody) };
  await sql.save('residual_risk', risk.riskId, risk);
  assert.deepEqual(await sql.get('residual_risk', risk.riskId), risk);
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
    datasetId: 'ifp8-pg-lifecycle-fixture',
    holdoutPartitionHash: api.partitionHash(['lifecycle-hold']),
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
  const makeRisk = (riskId) => {
    const body = {
      riskId,
      scope: 'test-only-atomicity',
      severity: 'high',
      evidence: ['fixture-test-authority'],
      affectedAssets: ['xau_usd'],
      eventClasses: ['cpi'],
      horizons: ['follow_through'],
      classification: 'empirical_limitation',
      resolutionState: 'open',
      blocksAcceptance: true,
      owner: 'ifp8-test',
      createdAt: at,
    };
    return { ...body, canonicalPayloadHash: api.canonicalHash(body) };
  };
  const makeAtomicBundle = (family, suffix) => {
    const rollback = api.createRollbackEvidence({
      datasetId: fixture.datasetId,
      splitId: split.splitId,
      acceptanceRunFamilyId: family,
      fromConfigurationVersionId: api.CANONICAL_RUNTIME_BASELINE.configurationVersionId,
      restoredConfigurationVersionId: api.CANONICAL_RUNTIME_BASELINE.configurationVersionId,
      expectedPreviousParameterSnapshotHash: api.CANONICAL_RUNTIME_BASELINE.parameterSnapshotHash,
      restoredParameterSnapshotHash: api.CANONICAL_RUNTIME_BASELINE.parameterSnapshotHash,
      reproductions: [{ caseId: `case-${suffix}`, decisionTimeEvidenceHash: '1'.repeat(64), previousCanonicalOutputHash: '2'.repeat(64), restoredCanonicalOutputHash: '2'.repeat(64), match: true }],
      createdAt: at,
    });
    const risk = makeRisk(`risk-${suffix}`);
    const run = acceptanceApi.decideValidatedAcceptance({
      runFamilyId: family,
      dataset: fixture,
      certification: null,
      split,
      configuration: api.CANONICAL_RUNTIME_BASELINE,
      trial: null,
      cases: [],
      coverage: [],
      coverageContractApproved: false,
      outcomePolicyApproved: false,
      empiricalAcceptancePolicy: null,
      rollback,
      residualRisks: [risk],
      createdAt: at,
    });
    return {
      run,
      cases: [],
      coverage: [],
      risks: [risk],
      rollback,
      referenceLinks: [
        { kind: 'dataset_manifest', id: fixture.datasetId },
        { kind: 'split_manifest', id: fixture.datasetId },
        { kind: 'configuration_version', id: api.CANONICAL_RUNTIME_BASELINE.configurationVersionId },
        { kind: 'residual_risk', id: risk.riskId },
        { kind: 'rollback_evidence', id: rollback.rollbackEvidenceId },
      ],
    };
  };
  const atomicFailureFamily = 'ifp8-atomic-failure';
  await sql.freezeCandidate(api.createHoldoutLifecycle({
    acceptanceRunFamilyId: atomicFailureFamily,
    datasetId: fixture.datasetId,
    holdoutPartitionHash: api.partitionHash(['atomic-failure']),
    selectedConfigurationVersionId: api.CANONICAL_RUNTIME_BASELINE.configurationVersionId,
    selectedAt: at,
  }));
  await sql.openHoldout(atomicFailureFamily, at);
  const failureBundle = makeAtomicBundle(atomicFailureFamily, 'failure');
  await assert.rejects(
    () => sql.finalizeAcceptanceBundle(atomicFailureFamily, failureBundle, at, 1),
    /injected_bundle_failure/,
  );
  assert.equal(await sql.get('residual_risk', failureBundle.risks[0].riskId), null);
  assert.equal(await sql.get('rollback_evidence', failureBundle.rollback.rollbackEvidenceId), null);
  assert.equal(await sql.get('acceptance_run', failureBundle.run.acceptanceRunId), null);
  assert.deepEqual(await sql.listLinks(failureBundle.run.acceptanceRunId), []);
  assert.equal((await sql.get('holdout_lifecycle', atomicFailureFamily)).state, 'opened');
  await sql.failHoldout(atomicFailureFamily, at, 'injected_bundle_failure');
  assert.equal((await sql.get('holdout_lifecycle', atomicFailureFamily)).state, 'failed');

  const atomicSuccessFamily = 'ifp8-atomic-success';
  await sql.freezeCandidate(api.createHoldoutLifecycle({
    acceptanceRunFamilyId: atomicSuccessFamily,
    datasetId: fixture.datasetId,
    holdoutPartitionHash: api.partitionHash(['atomic-success']),
    selectedConfigurationVersionId: api.CANONICAL_RUNTIME_BASELINE.configurationVersionId,
    selectedAt: at,
  }));
  await sql.openHoldout(atomicSuccessFamily, at);
  const successBundle = makeAtomicBundle(atomicSuccessFamily, 'success');
  await sql.finalizeAcceptanceBundle(atomicSuccessFamily, successBundle, at);
  assert.equal(successBundle.run.productionAcceptance, false);
  assert.deepEqual(await sql.get('residual_risk', successBundle.risks[0].riskId), successBundle.risks[0]);
  assert.deepEqual(await sql.get('acceptance_run', successBundle.run.acceptanceRunId), successBundle.run);
  assert((await sql.listLinks(successBundle.run.acceptanceRunId)).some((link) => link.kind === 'residual_risk' && link.id === successBundle.risks[0].riskId));
  assert.equal((await sql.get('holdout_lifecycle', atomicSuccessFamily)).state, 'completed');
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
    /invalid_dataset_manifest_canonical_hash/,
  );
  const { canonicalPayloadHash: ignoredManifestHash, ...fixtureDraft } = fixture;
  void ignoredManifestHash;
  const validConflict = api.finalizeDatasetManifest({
    ...fixtureDraft,
    provenanceSummary: 'valid immutable conflict',
  });
  await assert.rejects(
    () => sql.save('dataset_manifest', fixture.datasetId, validConflict),
    /immutable_acceptance_conflict/,
  );
  console.log(
    'IFP-8 PostgreSQL certification, relabel rejection, durable holdout, concurrency, restart and parity passed; fixture cannot production-pass',
  );
} finally {
  await pool.end();
}
