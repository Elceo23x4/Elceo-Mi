import assert from 'node:assert/strict';
import {
  createConfiguration,
  createHoldoutLifecycle,
  createRollbackEvidence,
  createTrial,
  finalizeCertification,
  finalizeDatasetManifest,
  calculateOutcome,
  finalizeSplit,
  MemoryIntelligenceAcceptanceRepository,
  partitionHash,
  verifyDatasetCertification,
  verifyManifestSplit,
  verifyRollback,
  validateDecisionTimeEvidence,
  IntelligenceAcceptanceService,
  CANONICAL_RUNTIME_BASELINE,
  CanonicalRuntimeBaselineAuthority,
  assertRuntimeBaseline,
  evaluateCoverage,
  canonicalHash,
} from '../intelligence-acceptance/index.js';
import {
  caseMatchesEmpiricalScope,
  evaluateEmpiricalCriteria,
} from '../intelligence-acceptance/acceptance-gate.js';
import type { ProductionIfpChainAdapter } from '../intelligence-acceptance/production-chain.js';
import type {
  EmpiricalAcceptancePolicy,
  FrozenCaseResult,
} from '../intelligence-acceptance/contracts.js';
const at = '2026-01-01T00:00:00.000Z';
const manifest = (datasetClass: 'fixture' | 'certified_replay') =>
  finalizeDatasetManifest({
    datasetId: 'dataset',
    datasetVersion: '1',
    datasetClass,
    generatedAt: at,
    periodStart: '2025-01-01T00:00:00Z',
    periodEnd: at,
    sourceRegistryVersion: 'registry-v1',
    sourceRegistryHash: 'a'.repeat(64),
    sourceIds: ['fixture-source'],
    assetCoverage: ['xau_usd'],
    eventClassCoverage: ['cpi'],
    horizonCoverage: ['follow_through'],
    sampleCount: 1,
    eventInstanceCount: 1,
    provenanceSummary: 'fixture',
    rawArtifactHashes: ['b'.repeat(64)],
    normalizationPolicyVersion: 'v1',
    outcomePolicyVersion: 'v1',
    splitPolicyVersion: 'v1',
    calibrationPartitionHash: partitionHash(['cal']),
    embargoPartitionHash: partitionHash(['emb']),
    holdoutPartitionHash: partitionHash(['hold']),
  });
const policies = {
  ifp1: 'expectation-reality-v1',
  ifp2: 'historical-analog-retrieval-v1',
  ifp3: 'contradiction-action-protocol-v1',
  ifp4: 'market-cleanliness-v1',
  ifp5: 'narrative-decay-v1',
  ifp6: 'positioning-stress-v1',
  ifp7: 'fragility-score-v1',
};
export async function runIntelligenceAcceptanceTests() {
  const fixture = manifest('fixture'),
    relabeled = manifest('certified_replay');
  const fixtureCertification = finalizeCertification({
    datasetId: fixture.datasetId,
    datasetVersion: fixture.datasetVersion,
    datasetManifestHash: fixture.canonicalPayloadHash,
    claimedDatasetClass: 'fixture',
    sourceRegistryVersion: fixture.sourceRegistryVersion,
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
  assert(verifyDatasetCertification(fixture, fixtureCertification).length > 0);
  assert(
    verifyDatasetCertification(relabeled, fixtureCertification).includes(
      'dataset_certification_manifest_mismatch',
    ),
  );
  assert(
    verifyDatasetCertification(relabeled, null).includes('blocked_missing_certified_evidence'),
  );
  const split = finalizeSplit({
    datasetId: 'dataset',
    createdAt: at,
    calibrationEventIds: ['cal'],
    embargoEventIds: ['emb'],
    holdoutEventIds: ['hold'],
    eventFamilies: { cal: 'a', emb: 'b', hold: 'c' },
    eventTimes: { cal: '2025-01-01', emb: '2025-01-04', hold: '2025-01-10' },
    outcomeWindowEnds: { cal: '2025-01-02', emb: '2025-01-05', hold: '2025-01-11' },
    maximumOutcomeHorizonMs: 86400000,
  });
  verifyManifestSplit(relabeled, split);
  const coveragePolicyBody = {
    coveragePolicyId: 'test-only-coverage-policy',
    status: 'approved' as const,
    cells: [
      {
        cellId: 'xau-cpi-follow-through',
        asset: 'xau_usd',
        eventClass: 'cpi',
        horizon: 'follow_through',
        requiredEvidenceFamilies: [],
        minimumUniqueEvents: 1,
        structuralDecisionId: null,
        policyVersion: 'ifp8-launch-coverage-v1' as const,
      },
    ],
    diagnosticAssets: ['dxy', 'vix'],
    approvalReference: 'TEST-ONLY-NOT-PRODUCTION',
  };
  const coverage = evaluateCoverage(
    { ...coveragePolicyBody, canonicalPayloadHash: canonicalHash(coveragePolicyBody) },
    [
      {
        caseId: 'case',
        eventInstanceId: 'hold',
        eventFamilyId: 'c',
        evidenceCutoffAt: at,
        asset: 'xau_usd',
        eventClass: 'cpi',
        horizon: 'follow_through',
        qualifiedEvidenceFamilies: [],
        references: [],
        productionInput: { eventEvaluationId: 'event', evidenceCutoffAt: at },
      },
    ],
    new Set(),
    { datasetId: 'dataset', splitId: split.splitId, acceptanceRunFamilyId: 'family', createdAt: at },
  );
  assert.equal(coverage.length, 1);
  await new MemoryIntelligenceAcceptanceRepository().save(
    'coverage_decision',
    coverage[0]!.coverageDecisionId,
    coverage[0]!,
  );
  await assert.rejects(
    () =>
      new MemoryIntelligenceAcceptanceRepository().save(
        'coverage_decision',
        `${coverage[0]!.coverageDecisionId}-tampered`,
        coverage[0]!,
      ),
    /derived_id/,
  );
  const riskBody = {
    riskId: 'risk-test',
    scope: 'ifp8',
    severity: 'low' as const,
    evidence: ['fixture'],
    affectedAssets: ['xau_usd'],
    eventClasses: ['cpi'],
    horizons: ['follow_through'],
    classification: 'empirical_limitation' as const,
    resolutionState: 'open',
    blocksAcceptance: true,
    owner: 'test',
    createdAt: at,
  };
  const risk = { ...riskBody, canonicalPayloadHash: canonicalHash(riskBody) };
  const riskRepo = new MemoryIntelligenceAcceptanceRepository();
  await riskRepo.save('residual_risk', risk.riskId, risk);
  await assert.rejects(() => riskRepo.save('residual_risk', 'wrong-risk-id', risk), /risk_id/);
  const criterion = {
    criterionId: 'scoped-xau-cpi',
    engine: 'ifp1' as const,
    metric: 'releaseAlignmentAgreement',
    scope: {
      assets: ['xau_usd'],
      eventClasses: ['cpi'],
      horizons: ['follow_through'],
      segments: ['qualified'],
    },
    rule: 'gte' as const,
    threshold: 1,
    upperThreshold: null,
    minimumSampleSize: 2,
    required: true,
    structuralTreatment: 'must_evaluate' as const,
    rationale: 'test-only scoped selection',
  } satisfies EmpiricalAcceptancePolicy['criteria'][number];
  const scopedCase = (asset: string, eventClass: string, horizon: string, regime: string) =>
    ({ outputs: { confidence: { asset, eventClass, horizon, regime, evidenceSufficiency: 'sufficient', sourceClass: 'qualified' } } }) as unknown as FrozenCaseResult;
  assert.equal(caseMatchesEmpiricalScope(scopedCase('xau_usd', 'cpi', 'follow_through', 'calm'), criterion), true);
  assert.equal(caseMatchesEmpiricalScope(scopedCase('eur_usd', 'cpi', 'follow_through', 'calm'), criterion), false);
  assert.equal(caseMatchesEmpiricalScope(scopedCase('xau_usd', 'nfp', 'follow_through', 'calm'), criterion), false);
  assert.equal(caseMatchesEmpiricalScope(scopedCase('xau_usd', 'cpi', 'initial', 'calm'), criterion), false);
  const wildcard = { ...criterion, scope: { assets: [], eventClasses: [], horizons: [], segments: [] } };
  assert.equal(caseMatchesEmpiricalScope(scopedCase('eur_usd', 'nfp', 'initial', 'tense'), wildcard), true);
  const empiricalPolicy = {
    policyId: 'test-only-empirical-policy',
    policyVersion: 'test-v1',
    status: 'approved' as const,
    minimumSamples: { ifp1: 1, ifp2: 1, ifp3: 1, ifp4: 1, ifp5: 1, ifp6: 1, ifp7: 1 },
    requiredMetrics: { ifp1: [], ifp2: [], ifp3: [], ifp4: [], ifp5: [], ifp6: [], ifp7: [] },
    approvalReference: 'TEST-ONLY-NOT-PRODUCTION',
    criteria: [criterion],
    canonicalPayloadHash: 'test-only',
  } satisfies EmpiricalAcceptancePolicy;
  assert.deepEqual(evaluateEmpiricalCriteria(empiricalPolicy, [], coverage), [
    {
      criterionId: criterion.criterionId,
      matchedSampleN: 0,
      metricValue: null,
      state: 'insufficient_evidence',
      reason: 'scoped_minimum_sample_not_met',
    },
  ]);
  const structuralDecision = {
    ...coverage[0]!,
    structuralDecisionId: 'approved-existing-structural-decision',
    state: 'structurally_unavailable' as const,
  };
  const structuralCriterion = {
    ...criterion,
    structuralTreatment: 'not_applicable_allowed' as const,
  };
  const structuralPolicy = { ...empiricalPolicy, criteria: [structuralCriterion] };
  assert.equal(
    evaluateEmpiricalCriteria(structuralPolicy, [], [structuralDecision])[0]?.state,
    'not_applicable',
  );
  assert.equal(
    evaluateEmpiricalCriteria(structuralPolicy, [], coverage)[0]?.state,
    'insufficient_evidence',
  );
  assert.throws(() => finalizeSplit({ ...split, holdoutEventIds: ['cal'] }), /overlap/);
  const baseline = createConfiguration({
    configurationVersionId: 'baseline',
    parentConfigurationVersionId: null,
    status: 'baseline',
    policyVersions: policies,
    parameterSnapshot: { unchanged: true },
    sourceCalibrationRunId: null,
    approvedBy: null,
    approvalReference: null,
    changeClass: 'no_change',
    changeReason: 'baseline',
    createdAt: at,
    supersededAt: null,
    rollbackTargetVersionId: null,
  });
  const restored = createConfiguration({
    ...baseline,
    configurationVersionId: 'restored',
    parentConfigurationVersionId: 'baseline',
    rollbackTargetVersionId: 'baseline',
  });
  const rollback = createRollbackEvidence({
    datasetId: 'dataset',
    splitId: split.splitId,
    acceptanceRunFamilyId: 'family',
    fromConfigurationVersionId: 'baseline',
    restoredConfigurationVersionId: 'restored',
    expectedPreviousParameterSnapshotHash: baseline.parameterSnapshotHash,
    restoredParameterSnapshotHash: restored.parameterSnapshotHash,
    reproductions: [
      {
        caseId: 'case',
        decisionTimeEvidenceHash: 'e'.repeat(64),
        previousCanonicalOutputHash: 'c'.repeat(64),
        restoredCanonicalOutputHash: 'c'.repeat(64),
        match: false,
      },
    ],
    createdAt: at,
  });
  verifyRollback(rollback, baseline, restored);
  const trial = createTrial({
    trialId: 'trial',
    acceptanceRunFamilyId: 'family',
    configurationVersionId: 'restored',
    parentConfigurationVersionId: 'baseline',
    datasetId: 'dataset',
    calibrationPartitionHash: split.calibrationPartitionHash,
    candidateSequence: 1,
    parametersChanged: {},
    reasonForCandidate: 'test mechanics',
    calibrationMetricsHash: 'd'.repeat(64),
    createdAt: at,
  });
  assert.equal(trial.trialId, 'trial');
  const decisionEvidence = {
    caseId: 'case',
    eventInstanceId: 'hold',
    eventFamilyId: 'family',
    evidenceCutoffAt: at,
    asset: 'xau_usd',
    eventClass: 'cpi',
    horizon: 'follow_through',
    qualifiedEvidenceFamilies: [],
    references: [],
    productionInput: { eventEvaluationId: 'event', evidenceCutoffAt: at },
  } as const;
  assert.throws(
    () =>
      calculateOutcome(decisionEvidence, {
        caseId: 'case',
        eventInstanceId: 'hold',
        asset: 'xau_usd',
        horizon: 'follow_through',
        measurementStartAt: '2025-12-31',
        measurementEndAt: '2026-01-02',
        outcomeAvailableAt: '2026-01-03',
        observations: [],
      }),
    /before_decision_cutoff/,
  );
  const unavailableOutcome = calculateOutcome(decisionEvidence, {
    caseId: 'case',
    eventInstanceId: 'hold',
    asset: 'xau_usd',
    horizon: 'follow_through',
    measurementStartAt: at,
    measurementEndAt: '2026-01-02',
    outcomeAvailableAt: '2026-01-03',
    observations: [],
  });
  assert.deepEqual(unavailableOutcome.properties, {});
  assert(
    unavailableOutcome.notEvaluable.includes('releaseAligned_canonical_calculation_unavailable'),
  );
  assert.throws(
    () =>
      validateDecisionTimeEvidence({
        ...decisionEvidence,
        productionInput: { ...decisionEvidence.productionInput, evidenceCutoffAt: '2026-01-02' },
      }),
    /cutoff_mismatch/,
  );
  assert.throws(
    () =>
      createRollbackEvidence({
        datasetId: 'dataset',
        splitId: split.splitId,
        acceptanceRunFamilyId: 'family',
        fromConfigurationVersionId: 'baseline',
        restoredConfigurationVersionId: 'restored',
        expectedPreviousParameterSnapshotHash: baseline.parameterSnapshotHash,
        restoredParameterSnapshotHash: restored.parameterSnapshotHash,
        reproductions: [],
        createdAt: at,
      }),
    /empty/,
  );
  assert.throws(
    () =>
      createRollbackEvidence({
        datasetId: 'dataset',
        splitId: split.splitId,
        acceptanceRunFamilyId: 'family',
        fromConfigurationVersionId: 'baseline',
        restoredConfigurationVersionId: 'restored',
        expectedPreviousParameterSnapshotHash: baseline.parameterSnapshotHash,
        restoredParameterSnapshotHash: restored.parameterSnapshotHash,
        reproductions: [
          {
            caseId: 'case',
            decisionTimeEvidenceHash: 'e'.repeat(64),
            previousCanonicalOutputHash: 'a',
            restoredCanonicalOutputHash: 'a',
            match: true,
          },
          {
            caseId: 'case',
            decisionTimeEvidenceHash: 'e'.repeat(64),
            previousCanonicalOutputHash: 'b',
            restoredCanonicalOutputHash: 'b',
            match: true,
          },
        ],
        createdAt: at,
      }),
    /duplicate/,
  );
  const mismatchedRollback = createRollbackEvidence({
    datasetId: 'dataset',
    splitId: split.splitId,
    acceptanceRunFamilyId: 'family',
    fromConfigurationVersionId: 'baseline',
    restoredConfigurationVersionId: 'restored',
    expectedPreviousParameterSnapshotHash: baseline.parameterSnapshotHash,
    restoredParameterSnapshotHash: restored.parameterSnapshotHash,
    reproductions: [
      {
        caseId: 'case-a',
        decisionTimeEvidenceHash: 'e'.repeat(64),
        previousCanonicalOutputHash: 'a',
        restoredCanonicalOutputHash: 'b',
        match: true,
      },
    ],
    createdAt: at,
  });
  assert.equal(mismatchedRollback.reproductionMatch, false);
  assert.throws(() => verifyRollback(mismatchedRollback, baseline, restored), /invalid/);
  const repo = new MemoryIntelligenceAcceptanceRepository(),
    lifecycle = createHoldoutLifecycle({
      acceptanceRunFamilyId: 'family',
      datasetId: 'dataset',
      holdoutPartitionHash: split.holdoutPartitionHash,
      selectedConfigurationVersionId: 'baseline',
      selectedAt: at,
    });
  await assert.rejects(
    () =>
      repo.save('dataset_manifest', 'tampered', {
        ...fixture,
        datasetId: 'tampered',
        canonicalPayloadHash: 'f'.repeat(64),
      }),
    /canonical_hash/,
  );
  await repo.freezeCandidate(lifecycle);
  await repo.openHoldout('family', '2026-01-02');
  assert.equal((await repo.get('holdout_lifecycle', 'family'))?.state, 'opened');
  await repo.completeHoldout('family', '2026-01-03');
  assert.equal((await repo.get('holdout_lifecycle', 'family'))?.state, 'completed');
  const reuse = createHoldoutLifecycle({ ...lifecycle, acceptanceRunFamilyId: 'other-family' });
  await assert.rejects(() => repo.freezeCandidate(reuse), /reserved/);
  const preflightRepo = new MemoryIntelligenceAcceptanceRepository();
  await assert.rejects(
    () => assertRuntimeBaseline(baseline, new CanonicalRuntimeBaselineAuthority()),
    /not_canonical_baseline/,
  );
  await preflightRepo.save('dataset_manifest', fixture.datasetId, fixture);
  await preflightRepo.save('dataset_certification', fixture.datasetId, fixtureCertification);
  await preflightRepo.save('split_manifest', fixture.datasetId, split);
  await preflightRepo.save(
    'configuration_version',
    CANONICAL_RUNTIME_BASELINE.configurationVersionId,
    CANONICAL_RUNTIME_BASELINE,
  );
  const preflightRollback = createRollbackEvidence({
    datasetId: fixture.datasetId,
    splitId: split.splitId,
    acceptanceRunFamilyId: 'family',
    fromConfigurationVersionId: CANONICAL_RUNTIME_BASELINE.configurationVersionId,
    restoredConfigurationVersionId: CANONICAL_RUNTIME_BASELINE.configurationVersionId,
    expectedPreviousParameterSnapshotHash: CANONICAL_RUNTIME_BASELINE.parameterSnapshotHash,
    restoredParameterSnapshotHash: CANONICAL_RUNTIME_BASELINE.parameterSnapshotHash,
    reproductions: [
      {
        caseId: 'case',
        decisionTimeEvidenceHash: 'e'.repeat(64),
        previousCanonicalOutputHash: 'f'.repeat(64),
        restoredCanonicalOutputHash: 'f'.repeat(64),
        match: true,
      },
    ],
    createdAt: at,
  });
  await preflightRepo.save(
    'rollback_evidence',
    preflightRollback.rollbackEvidenceId,
    preflightRollback,
  );
  await preflightRepo.freezeCandidate(lifecycle);
  let sourceCalls = 0;
  const preflightService = new IntelligenceAcceptanceService(
    preflightRepo,
    {
      validateConfiguration: async () => CANONICAL_RUNTIME_BASELINE,
    } as unknown as ProductionIfpChainAdapter,
    {
      list: async () => {
        sourceCalls++;
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
      preflightService.run({
        runFamilyId: 'family',
        datasetId: fixture.datasetId,
        configurationVersionId: CANONICAL_RUNTIME_BASELINE.configurationVersionId,
        rollbackEvidenceId: preflightRollback.rollbackEvidenceId,
        createdAt: at,
      }),
    /preflight_blocked_missing_certified_evidence/,
  );
  assert.equal(sourceCalls, 0);
  assert.equal((await preflightRepo.get('holdout_lifecycle', 'family'))?.state, 'selected');
  console.log('IFP-8 production acceptance integrity tests passed');
}
