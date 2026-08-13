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
  const directInsert = (kind, id, payload, hash = 'a'.repeat(64)) =>
    pool.query(
      'INSERT INTO intelligence_acceptance_records(record_kind,record_id,canonical_payload,canonical_payload_hash,created_at) VALUES($1,$2,$3,$4,$5)',
      [kind, id, JSON.stringify(payload), hash, '2026-01-01T00:00:00Z'],
    );
  for (const [kind, identityField] of Object.entries({
    dataset_manifest: 'datasetId',
    dataset_certification: 'datasetId',
    split_manifest: 'datasetId',
    configuration_version: 'configurationVersionId',
    calibration_trial: 'trialId',
    holdout_lifecycle: 'acceptanceRunFamilyId',
    acceptance_run: 'acceptanceRunId',
    case_result: 'caseResultId',
    coverage_decision: 'coverageDecisionId',
    residual_risk: 'riskId',
    rollback_evidence: 'rollbackEvidenceId',
  })) {
    const id = `db-constraint-${kind}`;
    for (const [label, identity] of [
      ['missing', undefined], ['null', null], ['empty', ''], ['mismatch', `${id}-other`],
    ]) {
      const payload = { canonicalPayloadHash: 'a'.repeat(64) };
      if (identity !== undefined) payload[identityField] = identity;
      await assert.rejects(() => directInsert(kind, `${id}-${label}`, payload), /check constraint/i);
    }
  }
  for (const [label, payload, columnHash] of [
    ['missing', { datasetId: 'db-hash-missing' }, 'a'.repeat(64)],
    ['null', { datasetId: 'db-hash-null', canonicalPayloadHash: null }, 'a'.repeat(64)],
    ['mismatch', { datasetId: 'db-hash-mismatch', canonicalPayloadHash: 'b'.repeat(64) }, 'a'.repeat(64)],
  ]) {
    await assert.rejects(
      () => directInsert('dataset_manifest', `db-hash-${label}`, payload, columnHash),
      /check constraint/i,
    );
  }
  const compiled = new URL(
    '../services/reasoning/dist-test-cjs/services/reasoning/src/intelligence-acceptance/',
    import.meta.url,
  );
  const api = await import(new URL('index.cjs', compiled));
  const acceptanceApi = await import(new URL('acceptance-gate.cjs', compiled));
  const fixtureApi = await import(
    new URL('../tests/intelligence-acceptance-production-fixture.cjs', compiled)
  );
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
  assert.throws(
    () =>
      api.evaluateCoverage(
        { ...testCoverageBody, canonicalPayloadHash: api.canonicalHash(testCoverageBody) },
        [],
        new Set(),
        { datasetId: fixture.datasetId, splitId: '', acceptanceRunFamilyId: preflightFamily, createdAt: at },
      ),
    /coverage_split_id_required/,
  );
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
    /storage_identity/,
  );
  const futureContext = await fixtureApi.buildContractValidAcceptanceCaseContext('future-service');
  const futureFamily = 'ifp8-future-outcome-service';
  const futureSplit = api.finalizeSplit({
    datasetId: 'ifp8-future-outcome-dataset', createdAt: at,
    calibrationEventIds: ['future-cal'], embargoEventIds: ['future-emb'],
    holdoutEventIds: [futureContext.evidence.eventInstanceId],
    eventFamilies: { 'future-cal': 'future-a', 'future-emb': 'future-b',
      [futureContext.evidence.eventInstanceId]: futureContext.evidence.eventFamilyId },
    eventTimes: { 'future-cal': '2025-01-01', 'future-emb': '2025-01-04',
      [futureContext.evidence.eventInstanceId]: '2025-01-10' },
    outcomeWindowEnds: { 'future-cal': '2025-01-02', 'future-emb': '2025-01-05',
      [futureContext.evidence.eventInstanceId]: '2025-01-11' },
    maximumOutcomeHorizonMs: 86400000,
  });
  const { canonicalPayloadHash: ignoredFutureHash, ...futureDatasetDraft } = fixture;
  void ignoredFutureHash;
  const futureDataset = api.finalizeDatasetManifest({
    ...futureDatasetDraft, datasetId: futureSplit.datasetId, datasetClass: 'certified_replay',
    provenanceSummary: 'TEST-ONLY replay evidence; not production acceptance',
    sourceIds: ['test-only-source'], rawArtifactHashes: ['8'.repeat(64)],
    calibrationPartitionHash: futureSplit.calibrationPartitionHash,
    embargoPartitionHash: futureSplit.embargoPartitionHash,
    holdoutPartitionHash: futureSplit.holdoutPartitionHash,
  });
  const futureCertification = api.finalizeCertification({
    datasetId: futureDataset.datasetId, datasetVersion: futureDataset.datasetVersion,
    datasetManifestHash: futureDataset.canonicalPayloadHash,
    claimedDatasetClass: futureDataset.datasetClass,
    sourceRegistryVersion: futureDataset.sourceRegistryVersion,
    sourceRegistryHash: futureDataset.sourceRegistryHash,
    rawArtifactHashes: futureDataset.rawArtifactHashes,
    captureReplayProvenance: ['TEST-ONLY-replay'], sourceIds: futureDataset.sourceIds,
    reliabilitySummary: { 'test-only-source': 1 }, fixtureContamination: false,
    unverifiedContamination: false, certificationEvidenceReferences: ['TEST-ONLY-certification'],
    certifiedAt: at,
  });
  const futureRollback = api.createRollbackEvidence({
    datasetId: futureDataset.datasetId, splitId: futureSplit.splitId,
    acceptanceRunFamilyId: futureFamily,
    fromConfigurationVersionId: api.CANONICAL_RUNTIME_BASELINE.configurationVersionId,
    restoredConfigurationVersionId: api.CANONICAL_RUNTIME_BASELINE.configurationVersionId,
    expectedPreviousParameterSnapshotHash: api.CANONICAL_RUNTIME_BASELINE.parameterSnapshotHash,
    restoredParameterSnapshotHash: api.CANONICAL_RUNTIME_BASELINE.parameterSnapshotHash,
    reproductions: [{ caseId: futureContext.evidence.caseId,
      decisionTimeEvidenceHash: api.canonicalHash(futureContext.evidence),
      previousCanonicalOutputHash: api.canonicalHash(futureContext.outputs.canonicalOutputHashes),
      restoredCanonicalOutputHash: api.canonicalHash(futureContext.outputs.canonicalOutputHashes),
      match: true }], createdAt: '2026-01-01T02:30:00Z',
  });
  for (const [kind, id, entity] of [
    ['dataset_manifest', futureDataset.datasetId, futureDataset],
    ['dataset_certification', futureDataset.datasetId, futureCertification],
    ['split_manifest', futureDataset.datasetId, futureSplit],
    ['rollback_evidence', futureRollback.rollbackEvidenceId, futureRollback],
  ]) await sql.save(kind, id, entity);
  await sql.freezeCandidate(api.createHoldoutLifecycle({
    acceptanceRunFamilyId: futureFamily, datasetId: futureDataset.datasetId,
    holdoutPartitionHash: futureSplit.holdoutPartitionHash,
    selectedConfigurationVersionId: api.CANONICAL_RUNTIME_BASELINE.configurationVersionId,
    selectedAt: at,
  }));
  const outcomePolicyBody = { policyId: 'TEST-ONLY-outcome', policyVersion: 'test-v1',
    status: 'approved', supportedProperties: [], approvalReference: 'TEST-ONLY-NOT-PRODUCTION' };
  const empiricalPolicyBody = { policyId: 'TEST-ONLY-empirical', policyVersion: 'test-v1',
    status: 'approved', minimumSamples: { ifp1: 1, ifp2: 1, ifp3: 1, ifp4: 1, ifp5: 1, ifp6: 1, ifp7: 1 },
    requiredMetrics: { ifp1: [], ifp2: [], ifp3: [], ifp4: [], ifp5: [], ifp6: [], ifp7: [] },
    approvalReference: 'TEST-ONLY-NOT-PRODUCTION', criteria: [] };
  const futureService = new api.IntelligenceAcceptanceService(
    sql,
    { validateConfiguration: async () => api.CANONICAL_RUNTIME_BASELINE,
      runAndPersist: async () => futureContext.outputs },
    { list: async () => [futureContext.evidence],
      outcomeObservations: async () => ({
        caseId: futureContext.evidence.caseId,
        eventInstanceId: futureContext.evidence.eventInstanceId,
        asset: futureContext.evidence.asset, horizon: futureContext.evidence.horizon,
        measurementStartAt: '2026-01-01T02:00:00Z', measurementEndAt: '2026-01-01T03:00:00Z',
        outcomeAvailableAt: '2026-01-01T03:00:00Z', observations: [],
      }) },
    { verify: async () => true },
    { resolve: async () => ({ policy: { ...testCoverageBody,
      canonicalPayloadHash: api.canonicalHash(testCoverageBody) }, approvedStructuralDecisionIds: new Set() }) },
    { resolveOutcomePolicy: async () => ({ ...outcomePolicyBody,
      canonicalPayloadHash: api.canonicalHash(outcomePolicyBody) }),
      resolveEmpiricalPolicy: async () => ({ ...empiricalPolicyBody,
        canonicalPayloadHash: api.canonicalHash(empiricalPolicyBody) }) },
  );
  const futureRisk = (() => {
    const body = { riskId: 'ifp8-future-service-risk', scope: 'TEST-ONLY', severity: 'high',
      evidence: ['future-outcome'], affectedAssets: ['xau_usd'], eventClasses: ['cpi'],
      horizons: ['follow_through'], classification: 'empirical_limitation', resolutionState: 'open',
      blocksAcceptance: true, owner: 'ifp8-test', createdAt: '2026-01-01T02:30:00Z' };
    return { ...body, canonicalPayloadHash: api.canonicalHash(body) };
  })();
  const linksBeforeFutureRun = Number((await pool.query(
    'SELECT count(*) n FROM intelligence_acceptance_links',
  )).rows[0].n);
  await assert.rejects(() => futureService.run({
    runFamilyId: futureFamily, datasetId: futureDataset.datasetId,
    configurationVersionId: api.CANONICAL_RUNTIME_BASELINE.configurationVersionId,
    rollbackEvidenceId: futureRollback.rollbackEvidenceId, residualRisks: [futureRisk],
    createdAt: '2026-01-01T02:30:00Z',
  }), /outcome_not_available_at_acceptance_time/);
  assert.equal((await sql.get('holdout_lifecycle', futureFamily)).state, 'failed');
  assert.equal((await pool.query("SELECT count(*) n FROM intelligence_acceptance_records WHERE record_kind='case_result' AND canonical_payload->>'caseId'=$1", [futureContext.evidence.caseId])).rows[0].n, '0');
  for (const kind of ['coverage_decision', 'acceptance_run'])
    assert.equal((await pool.query("SELECT count(*) n FROM intelligence_acceptance_records WHERE record_kind=$1 AND canonical_payload->>'acceptanceRunFamilyId'=$2", [kind, futureFamily])).rows[0].n, '0');
  assert.equal(await sql.get('residual_risk', futureRisk.riskId), null);
  assert.equal(Number((await pool.query('SELECT count(*) n FROM intelligence_acceptance_links')).rows[0].n), linksBeforeFutureRun);
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
    "INSERT INTO intelligence_acceptance_records(record_kind,record_id,canonical_payload,canonical_payload_hash,created_at) VALUES('acceptance_run','link-proof',$1,$2,$3)",
    [JSON.stringify({ acceptanceRunId: 'link-proof', canonicalPayloadHash: 'c'.repeat(64) }), 'c'.repeat(64), at],
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
  const temporalLifecycle = api.createHoldoutLifecycle({
    acceptanceRunFamilyId: 'ifp8-temporal-lifecycle',
    datasetId: 'ifp8-temporal-dataset',
    holdoutPartitionHash: api.partitionHash(['temporal-holdout']),
    selectedConfigurationVersionId: api.CANONICAL_RUNTIME_BASELINE.configurationVersionId,
    selectedAt: '2026-01-02T00:00:00Z',
  });
  await sql.freezeCandidate(temporalLifecycle);
  await assert.rejects(
    () => sql.openHoldout(temporalLifecycle.acceptanceRunFamilyId, '2026-01-01T00:00:00Z'),
    /time_order_invalid/,
  );
  await sql.openHoldout(temporalLifecycle.acceptanceRunFamilyId, '2026-01-03T00:00:00Z');
  await assert.rejects(
    () => sql.completeHoldout(temporalLifecycle.acceptanceRunFamilyId, '2026-01-02T00:00:00Z'),
    /time_order_invalid/,
  );
  await assert.rejects(
    () => sql.failHoldout(temporalLifecycle.acceptanceRunFamilyId, '2026-01-02T00:00:00Z', 'early'),
    /time_order_invalid/,
  );
  await assert.rejects(
    () =>
      sql.freezeCandidate(
        api.createHoldoutLifecycle({ ...lifecycle, acceptanceRunFamilyId: 'ifp8-family-reuse' }),
      ),
    /reserved/i,
  );
  const makeRisk = (riskId, createdAt = at) => {
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
      createdAt,
    };
    return { ...body, canonicalPayloadHash: api.canonicalHash(body) };
  };
  const makeAtomicBundle = async (family, suffix, repository = sql, options = {}) => {
    const acceptanceAt = '2026-01-01T04:00:00.000Z';
    const { canonicalPayloadHash: ignoredAtomicHash, ...atomicDatasetDraft } = fixture;
    void ignoredAtomicHash;
    const calibrationId = `cal-${suffix}`, embargoId = `emb-${suffix}`, holdoutId = `hold-${suffix}`;
    const atomicSplit = api.finalizeSplit({
      datasetId: `ifp8-atomic-${suffix}`, createdAt: at,
      calibrationEventIds: [calibrationId], embargoEventIds: [embargoId], holdoutEventIds: [holdoutId],
      eventFamilies: { [calibrationId]: `a-${suffix}`, [embargoId]: `b-${suffix}`, [holdoutId]: `c-${suffix}` },
      eventTimes: { [calibrationId]: '2025-01-01', [embargoId]: '2025-01-04', [holdoutId]: '2025-01-10' },
      outcomeWindowEnds: { [calibrationId]: '2025-01-02', [embargoId]: '2025-01-05', [holdoutId]: '2025-01-11' },
      maximumOutcomeHorizonMs: 86400000,
    });
    const atomicDataset = api.finalizeDatasetManifest({
      ...atomicDatasetDraft, datasetId: atomicSplit.datasetId,
      calibrationPartitionHash: atomicSplit.calibrationPartitionHash,
      embargoPartitionHash: atomicSplit.embargoPartitionHash,
      holdoutPartitionHash: atomicSplit.holdoutPartitionHash,
    });
    await repository.save('dataset_manifest', atomicDataset.datasetId, atomicDataset);
    const persistedSplit = options.persistedSplit?.(atomicSplit) ?? atomicSplit;
    await repository.save('split_manifest', atomicDataset.datasetId, persistedSplit);
    const sourceTrialId = options.withTrial ? `trial-${suffix}` : null;
    const configuration = options.withTrial ? api.createConfiguration({
      ...api.CANONICAL_RUNTIME_BASELINE,
      configurationVersionId: `configuration-${suffix}`,
      sourceCalibrationRunId: sourceTrialId,
      changeClass: 'explicitly_approved_parameter_calibration',
      approvedBy: 'TEST-ONLY', approvalReference: 'TEST-ONLY-NOT-PRODUCTION',
      changeReason: 'test-only relationship proof', createdAt: at,
    }) : api.CANONICAL_RUNTIME_BASELINE;
    await repository.save(
      'configuration_version',
      configuration.configurationVersionId,
      configuration,
    );
    const canonicalTrial = sourceTrialId ? api.createTrial({
      trialId: sourceTrialId, acceptanceRunFamilyId: family,
      configurationVersionId: configuration.configurationVersionId,
      parentConfigurationVersionId: api.CANONICAL_RUNTIME_BASELINE.configurationVersionId,
      datasetId: atomicDataset.datasetId,
      calibrationPartitionHash: atomicSplit.calibrationPartitionHash,
      candidateSequence: 1, parametersChanged: {}, reasonForCandidate: 'test-only relationship proof',
      calibrationMetricsHash: '7'.repeat(64), createdAt: at,
    }) : null;
    const persistedTrial = canonicalTrial && (options.persistedTrial?.(canonicalTrial) ?? canonicalTrial);
    if (persistedTrial && !options.missingTrial)
      await repository.save('calibration_trial', persistedTrial.trialId, persistedTrial);
    const certification = options.withCertification ? api.finalizeCertification({
      datasetId: atomicDataset.datasetId, datasetVersion: atomicDataset.datasetVersion,
      datasetManifestHash: atomicDataset.canonicalPayloadHash,
      claimedDatasetClass: atomicDataset.datasetClass,
      sourceRegistryVersion: atomicDataset.sourceRegistryVersion,
      sourceRegistryHash: atomicDataset.sourceRegistryHash,
      rawArtifactHashes: atomicDataset.rawArtifactHashes,
      captureReplayProvenance: ['TEST-ONLY'], sourceIds: atomicDataset.sourceIds,
      reliabilitySummary: { test: 1 }, fixtureContamination: true, unverifiedContamination: false,
      certificationEvidenceReferences: ['TEST-ONLY'], certifiedAt: at,
    }) : null;
    const persistedCertification = certification &&
      (options.persistedCertification?.(certification) ?? certification);
    if (persistedCertification)
      await repository.save('dataset_certification', atomicDataset.datasetId, persistedCertification);
    await repository.freezeCandidate(api.createHoldoutLifecycle({
      acceptanceRunFamilyId: family, datasetId: atomicDataset.datasetId,
      holdoutPartitionHash: atomicSplit.holdoutPartitionHash,
      selectedConfigurationVersionId: configuration.configurationVersionId, selectedAt: at,
      ...options.lifecycleOverrides,
    }));
    await repository.openHoldout(family, options.openedAt ?? acceptanceAt);
    const caseResult = await fixtureApi.buildContractValidAcceptanceCase(suffix);
    const [atomicCoverage] = api.evaluateCoverage(
      { ...testCoverageBody, canonicalPayloadHash: api.canonicalHash(testCoverageBody) },
      [{ caseId: caseResult.caseId, eventInstanceId: holdoutId, eventFamilyId: `c-${suffix}`, evidenceCutoffAt: at, asset: 'xau_usd', eventClass: 'cpi', horizon: 'follow_through', qualifiedEvidenceFamilies: [], references: [], productionInput: { eventEvaluationId: `event-${suffix}`, evidenceCutoffAt: at } }],
      new Set(),
      { datasetId: atomicDataset.datasetId, splitId: atomicSplit.splitId, acceptanceRunFamilyId: family, createdAt: acceptanceAt },
    );
    const rollback = api.createRollbackEvidence({
      datasetId: atomicDataset.datasetId,
      splitId: atomicSplit.splitId,
      acceptanceRunFamilyId: family,
      fromConfigurationVersionId: configuration.configurationVersionId,
      restoredConfigurationVersionId: configuration.configurationVersionId,
      expectedPreviousParameterSnapshotHash: configuration.parameterSnapshotHash,
      restoredParameterSnapshotHash: configuration.parameterSnapshotHash,
      reproductions: [{
        caseId: caseResult.caseId,
        decisionTimeEvidenceHash: caseResult.decisionTimeEvidenceHash,
        previousCanonicalOutputHash: api.canonicalHash(caseResult.canonicalOutputHashes),
        restoredCanonicalOutputHash: api.canonicalHash(caseResult.canonicalOutputHashes),
        match: true,
      }],
      createdAt: acceptanceAt,
    });
    const risk = makeRisk(`risk-${suffix}`, acceptanceAt);
    const run = acceptanceApi.decideValidatedAcceptance({
      runFamilyId: family,
      dataset: atomicDataset,
      certification,
      split: atomicSplit,
      configuration,
      trial: canonicalTrial,
      cases: [caseResult],
      coverage: [atomicCoverage],
      coverageContractApproved: false,
      outcomePolicyApproved: false,
      empiricalAcceptancePolicy: null,
      rollback,
      residualRisks: [risk],
      createdAt: acceptanceAt,
    });
    return {
      run,
      cases: [caseResult],
      coverage: [atomicCoverage],
      risks: [risk],
      rollback,
      completedAt: acceptanceAt,
      atomicDataset,
      atomicSplit,
      referenceLinks: [
        { kind: 'dataset_manifest', id: atomicDataset.datasetId },
        { kind: 'split_manifest', id: atomicDataset.datasetId },
        { kind: 'configuration_version', id: configuration.configurationVersionId },
        ...(certification ? [{ kind: 'dataset_certification', id: atomicDataset.datasetId }] : []),
        ...(canonicalTrial ? [{ kind: 'calibration_trial', id: canonicalTrial.trialId }] : []),
        { kind: 'case_result', id: caseResult.caseResultId },
        { kind: 'coverage_decision', id: atomicCoverage.coverageDecisionId },
        { kind: 'residual_risk', id: risk.riskId },
        { kind: 'rollback_evidence', id: rollback.rollbackEvidenceId },
      ],
    };
  };
  const scopedCoverage = (bundle, overrides) => api.evaluateCoverage(
    { ...testCoverageBody, canonicalPayloadHash: api.canonicalHash(testCoverageBody) },
    [{ caseId: bundle.cases[0].caseId, eventInstanceId: bundle.cases[0].eventInstanceId,
      eventFamilyId: 'matrix-family', evidenceCutoffAt: at, asset: 'xau_usd', eventClass: 'cpi',
      horizon: 'follow_through', qualifiedEvidenceFamilies: [], references: [],
      productionInput: { eventEvaluationId: 'matrix-event', evidenceCutoffAt: at } }],
    new Set(),
    { datasetId: bundle.run.datasetId, splitId: bundle.run.splitId,
      acceptanceRunFamilyId: bundle.run.acceptanceRunFamilyId, createdAt: bundle.completedAt,
      ...overrides },
  )[0];
  const scopedRollback = (bundle, overrides) => api.createRollbackEvidence({
    datasetId: bundle.run.datasetId, splitId: bundle.run.splitId,
    acceptanceRunFamilyId: bundle.run.acceptanceRunFamilyId,
    fromConfigurationVersionId: api.CANONICAL_RUNTIME_BASELINE.configurationVersionId,
    restoredConfigurationVersionId: api.CANONICAL_RUNTIME_BASELINE.configurationVersionId,
    expectedPreviousParameterSnapshotHash: api.CANONICAL_RUNTIME_BASELINE.parameterSnapshotHash,
    restoredParameterSnapshotHash: api.CANONICAL_RUNTIME_BASELINE.parameterSnapshotHash,
    reproductions: bundle.rollback.reproductions, createdAt: bundle.completedAt, ...overrides,
  });
  const malformedCases = [
    ['wrong run family', (bundle) => ({ runFamilyId: `${bundle.run.acceptanceRunFamilyId}-wrong` })],
    ['missing declared case', (bundle) => ({ bundle: { ...bundle, cases: [] } })],
    ['extra undeclared case', async (bundle, suffix) => ({ bundle: {
      ...bundle,
      cases: [...bundle.cases, await fixtureApi.buildContractValidAcceptanceCase(`${suffix}-extra`)],
    } })],
    ['duplicate case', (bundle) => ({ bundle: { ...bundle, cases: [...bundle.cases, ...bundle.cases] } })],
    ['case hash mismatch', (bundle) => ({ bundle: { ...bundle, run: { ...bundle.run, caseResultHashes: ['f'.repeat(64)] } } })],
    ['coverage wrong family', (bundle) => ({ bundle: { ...bundle, coverage: [scopedCoverage(bundle, { acceptanceRunFamilyId: 'wrong-family' })] } })],
    ['coverage wrong dataset', (bundle) => ({ bundle: { ...bundle, coverage: [scopedCoverage(bundle, { datasetId: 'wrong-dataset' })] } })],
    ['coverage wrong split', (bundle) => ({ bundle: { ...bundle, coverage: [scopedCoverage(bundle, { splitId: 'wrong-split' })] } })],
    ['extra coverage', (bundle) => ({ bundle: { ...bundle, coverage: [...bundle.coverage, scopedCoverage(bundle, { createdAt: '2026-01-01T04:00:01Z' })] } })],
    ['wrong risk', (bundle, suffix) => ({ bundle: { ...bundle, risks: [makeRisk(`wrong-${suffix}`, bundle.completedAt)] } })],
    ['extra risk', (bundle, suffix) => ({ bundle: { ...bundle, risks: [...bundle.risks, makeRisk(`extra-${suffix}`, bundle.completedAt)] } })],
    ['rollback wrong family', (bundle) => ({ bundle: { ...bundle, rollback: scopedRollback(bundle, { acceptanceRunFamilyId: 'wrong-family' }) } })],
    ['rollback wrong dataset', (bundle) => ({ bundle: { ...bundle, rollback: scopedRollback(bundle, { datasetId: 'wrong-dataset' }) } })],
    ['rollback wrong split', (bundle) => ({ bundle: { ...bundle, rollback: scopedRollback(bundle, { splitId: 'wrong-split' }) } })],
    ['missing case link', (bundle) => ({ bundle: { ...bundle, referenceLinks: bundle.referenceLinks.filter((x) => x.kind !== 'case_result') } })],
    ['missing coverage link', (bundle) => ({ bundle: { ...bundle, referenceLinks: bundle.referenceLinks.filter((x) => x.kind !== 'coverage_decision') } })],
    ['missing risk link', (bundle) => ({ bundle: { ...bundle, referenceLinks: bundle.referenceLinks.filter((x) => x.kind !== 'residual_risk') } })],
    ['duplicate link', (bundle) => ({ bundle: { ...bundle, referenceLinks: [...bundle.referenceLinks, bundle.referenceLinks[0]] } })],
    ['unexplained link', (bundle) => ({ bundle: { ...bundle, referenceLinks: [...bundle.referenceLinks, { kind: 'dataset_manifest', id: 'unexplained' }] } })],
    ['freeze before outcome', (bundle) => ({ bundle: { ...bundle, cases: [{ ...bundle.cases[0], frozenAt: '2026-01-01T02:59:59Z' }] } })],
    ['run before freeze', (bundle) => ({ bundle: { ...bundle, run: { ...bundle.run, createdAt: '2026-01-01T02:59:59Z' } } })],
    ['completion before run', (bundle) => ({ completedAt: '2026-01-01T03:59:59Z' })],
  ];
  for (const [repositoryName, repositoryFactory] of [
    ['memory', () => new api.MemoryIntelligenceAcceptanceRepository()],
    ['sql', () => sql],
  ]) {
    let matrixIndex = 0;
    for (const [name, mutate] of malformedCases) {
      const suffix = `matrix-${repositoryName}-${matrixIndex++}`;
      const repository = repositoryFactory();
      const family = `ifp8-${suffix}`;
      const valid = await makeAtomicBundle(family, suffix, repository);
      const mutation = await mutate(valid, suffix);
      const malformed = mutation.bundle ?? valid;
      await assert.rejects(
        () => repository.finalizeAcceptanceBundle(
          mutation.runFamilyId ?? family, malformed, mutation.completedAt ?? valid.completedAt,
        ),
        /coherence_mismatch|temporal_mismatch/,
        `${repositoryName}: ${name}`,
      );
      assert.equal(await repository.get('case_result', valid.cases[0].caseResultId), null, name);
      assert.equal(await repository.get('coverage_decision', valid.coverage[0].coverageDecisionId), null, name);
      assert.equal(await repository.get('residual_risk', valid.risks[0].riskId), null, name);
      assert.equal(await repository.get('rollback_evidence', valid.rollback.rollbackEvidenceId), null, name);
      assert.equal(await repository.get('acceptance_run', valid.run.acceptanceRunId), null, name);
      assert.deepEqual(await repository.listLinks(valid.run.acceptanceRunId), [], name);
      assert.equal((await repository.get('holdout_lifecycle', family)).state, 'opened', name);
    }
  }
  const relationshipCases = [
    ['lifecycle configuration mismatch', () => ({
      lifecycleOverrides: { selectedConfigurationVersionId: 'wrong-configuration' },
    })],
    ['lifecycle partition mismatch', () => ({
      lifecycleOverrides: { holdoutPartitionHash: api.partitionHash(['wrong-holdout']) },
    })],
    ['lifecycle opened after run', () => ({ openedAt: '2026-01-01T05:00:00Z' })],
    ['persisted split semantic mismatch', () => ({
      persistedSplit: (row) => api.finalizeSplit({
        datasetId: row.datasetId, createdAt: row.createdAt,
        calibrationEventIds: ['replacement-cal'], embargoEventIds: ['replacement-emb'],
        holdoutEventIds: ['replacement-hold'],
        eventFamilies: { 'replacement-cal': 'a', 'replacement-emb': 'b', 'replacement-hold': 'c' },
        eventTimes: { 'replacement-cal': '2025-01-01', 'replacement-emb': '2025-01-04', 'replacement-hold': '2025-01-10' },
        outcomeWindowEnds: { 'replacement-cal': '2025-01-02', 'replacement-emb': '2025-01-05', 'replacement-hold': '2025-01-11' },
        maximumOutcomeHorizonMs: row.maximumOutcomeHorizonMs,
      }),
    })],
    ['certification id mismatch', () => ({ withCertification: true,
      persistedCertification: (row) => api.finalizeCertification({ ...row, certifiedAt: '2026-01-01T00:01:00Z' }) })],
    ['certification version mismatch', () => ({ withCertification: true,
      persistedCertification: (row) => api.finalizeCertification({ ...row, datasetVersion: 'wrong-version' }) })],
    ['certification manifest mismatch', () => ({ withCertification: true,
      persistedCertification: (row) => api.finalizeCertification({ ...row, datasetManifestHash: '6'.repeat(64) }) })],
    ['required trial missing', () => ({ withTrial: true, missingTrial: true })],
    ['trial family mismatch', () => ({ withTrial: true,
      persistedTrial: (row) => api.createTrial({ ...row, acceptanceRunFamilyId: 'wrong-family' }) })],
    ['trial dataset mismatch', () => ({ withTrial: true,
      persistedTrial: (row) => api.createTrial({ ...row, datasetId: 'wrong-dataset' }) })],
    ['trial configuration mismatch', () => ({ withTrial: true,
      persistedTrial: (row) => api.createTrial({ ...row, configurationVersionId: 'wrong-configuration' }) })],
  ];
  for (const [repositoryName, repositoryFactory] of [
    ['memory', () => new api.MemoryIntelligenceAcceptanceRepository()],
    ['sql', () => sql],
  ]) {
    let relationshipIndex = 0;
    for (const [name, makeOptions] of relationshipCases) {
      const suffix = `relationship-${repositoryName}-${relationshipIndex++}`;
      const repository = repositoryFactory();
      const family = `ifp8-${suffix}`;
      const valid = await makeAtomicBundle(family, suffix, repository, makeOptions());
      await assert.rejects(
        () => repository.finalizeAcceptanceBundle(family, valid, valid.completedAt),
        /coherence_mismatch|temporal_mismatch/,
        `${repositoryName}: ${name}`,
      );
      for (const [kind, id] of [
        ['case_result', valid.cases[0].caseResultId],
        ['coverage_decision', valid.coverage[0].coverageDecisionId],
        ['residual_risk', valid.risks[0].riskId],
        ['rollback_evidence', valid.rollback.rollbackEvidenceId],
        ['acceptance_run', valid.run.acceptanceRunId],
      ]) assert.equal(await repository.get(kind, id), null, `${repositoryName}: ${name}`);
      assert.deepEqual(await repository.listLinks(valid.run.acceptanceRunId), [], name);
      assert.notEqual((await repository.get('holdout_lifecycle', family)).state, 'completed', name);
    }
  }
  const atomicFailureFamily = 'ifp8-atomic-failure';
  const failureBundle = await makeAtomicBundle(atomicFailureFamily, 'failure');
  await assert.rejects(
    () => sql.finalizeAcceptanceBundle(atomicFailureFamily, failureBundle, failureBundle.completedAt, 1),
    /injected_bundle_failure/,
  );
  assert.equal(await sql.get('case_result', failureBundle.cases[0].caseResultId), null);
  assert.equal(await sql.get('coverage_decision', failureBundle.coverage[0].coverageDecisionId), null);
  assert.equal(await sql.get('residual_risk', failureBundle.risks[0].riskId), null);
  assert.equal(await sql.get('rollback_evidence', failureBundle.rollback.rollbackEvidenceId), null);
  assert.equal(await sql.get('acceptance_run', failureBundle.run.acceptanceRunId), null);
  assert.deepEqual(await sql.listLinks(failureBundle.run.acceptanceRunId), []);
  assert.equal((await sql.get('holdout_lifecycle', atomicFailureFamily)).state, 'opened');
  await sql.failHoldout(atomicFailureFamily, failureBundle.completedAt, 'injected_bundle_failure');
  assert.equal((await sql.get('holdout_lifecycle', atomicFailureFamily)).state, 'failed');

  const atomicSuccessFamily = 'ifp8-atomic-success';
  const successBundle = await makeAtomicBundle(atomicSuccessFamily, 'success');
  await sql.finalizeAcceptanceBundle(atomicSuccessFamily, successBundle, successBundle.completedAt);
  assert.equal(successBundle.run.productionAcceptance, false);
  assert.deepEqual(await sql.get('case_result', successBundle.cases[0].caseResultId), successBundle.cases[0]);
  assert.deepEqual(await sql.get('coverage_decision', successBundle.coverage[0].coverageDecisionId), successBundle.coverage[0]);
  assert.deepEqual(await sql.get('residual_risk', successBundle.risks[0].riskId), successBundle.risks[0]);
  assert.deepEqual(await sql.get('rollback_evidence', successBundle.rollback.rollbackEvidenceId), successBundle.rollback);
  assert.deepEqual(await sql.get('acceptance_run', successBundle.run.acceptanceRunId), successBundle.run);
  assert((await sql.listLinks(successBundle.run.acceptanceRunId)).some((link) => link.kind === 'residual_risk' && link.id === successBundle.risks[0].riskId));
  assert.equal((await sql.get('holdout_lifecycle', atomicSuccessFamily)).state, 'completed');
  const successDataset = await sql.get('dataset_manifest', successBundle.run.datasetId);
  const successSplit = await sql.get('split_manifest', successBundle.run.datasetId);
  const successLifecycle = await sql.get('holdout_lifecycle', atomicSuccessFamily);
  const identityTrial = api.createTrial({
    trialId: 'ifp8-pg-identity-trial',
    acceptanceRunFamilyId: atomicSuccessFamily,
    configurationVersionId: api.CANONICAL_RUNTIME_BASELINE.configurationVersionId,
    parentConfigurationVersionId: api.CANONICAL_RUNTIME_BASELINE.configurationVersionId,
    datasetId: successBundle.run.datasetId,
    calibrationPartitionHash: successSplit.calibrationPartitionHash,
    candidateSequence: 1,
    parametersChanged: {},
    reasonForCandidate: 'test-only storage identity proof',
    calibrationMetricsHash: '9'.repeat(64),
    createdAt: successBundle.completedAt,
  });
  const identityEntities = [
    ['dataset_manifest', successDataset.datasetId, successDataset],
    ['dataset_certification', fixture.datasetId, certification],
    ['split_manifest', successSplit.datasetId, successSplit],
    ['configuration_version', api.CANONICAL_RUNTIME_BASELINE.configurationVersionId, api.CANONICAL_RUNTIME_BASELINE],
    ['calibration_trial', identityTrial.trialId, identityTrial],
    ['holdout_lifecycle', successLifecycle.acceptanceRunFamilyId, successLifecycle],
    ['case_result', successBundle.cases[0].caseResultId, successBundle.cases[0]],
    ['coverage_decision', successBundle.coverage[0].coverageDecisionId, successBundle.coverage[0]],
    ['residual_risk', successBundle.risks[0].riskId, successBundle.risks[0]],
    ['rollback_evidence', successBundle.rollback.rollbackEvidenceId, successBundle.rollback],
    ['acceptance_run', successBundle.run.acceptanceRunId, successBundle.run],
  ];
  for (const repo of [memory, sql])
    for (const [kind, id, entity] of identityEntities) {
      await assert.rejects(() => repo.save(kind, `${id}-wrong`, entity), /storage_identity/);
      await assert.rejects(() => repo.save(kind, '', entity), /storage_identity/);
    }
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
