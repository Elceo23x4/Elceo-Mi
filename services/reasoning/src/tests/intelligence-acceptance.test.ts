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
  assertOutcomeAvailableAtAcceptance,
  CANONICAL_RUNTIME_BASELINE,
  CanonicalRuntimeBaselineAuthority,
  assertRuntimeBaseline,
  evaluateCoverage,
  canonicalHash,
} from '../intelligence-acceptance/index.js';
import {
  caseMatchesEmpiricalScope,
  evaluateEmpiricalCriteria,
  decideValidatedAcceptance,
} from '../intelligence-acceptance/acceptance-gate.js';
import type { ProductionIfpChainAdapter } from '../intelligence-acceptance/production-chain.js';
import type {
  EmpiricalAcceptancePolicy,
  FrozenCaseResult,
} from '../intelligence-acceptance/contracts.js';
import { ProductionIfpChainAdapter as ActualProductionIfpChainAdapter } from '../intelligence-acceptance/production-chain.js';
import { MemoryReasoningPersistenceRepository } from '../persistence/memory-reasoning-repository.js';
import { serializeCanonicalCognitionState } from '../persistence/serialization.js';
import { buildCleanlinessEventFixture } from './market-cleanliness-fixtures.js';
import { buildCanonicalCognitionStateFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import { normalizePersistedContradictionInputRecord } from '../contradiction-action-protocol/input-repository.js';
import { validateAcceptanceBundleCoherence } from '../intelligence-acceptance/bundle-integrity.js';
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
  assert.throws(
    () =>
      assertOutcomeAvailableAtAcceptance(
        '2026-01-01T03:00:00Z',
        '2026-01-01T02:59:59Z',
      ),
    /outcome_not_available_at_acceptance_time/,
  );
  assert.doesNotThrow(() =>
    assertOutcomeAvailableAtAcceptance('2026-01-01T03:00:00Z', '2026-01-01T03:00:00Z'),
  );
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
  const productionPersistence = new MemoryReasoningPersistenceRepository();
  const productionEvent = buildCleanlinessEventFixture({
    eventEvaluationId: 'ifp8-production-chain-event',
    interpretedAt: '2026-01-01T01:00:00.000Z',
  });
  await productionPersistence.eventExpectationRepository.saveEventExpectation(
    productionEvent.expectation,
  );
  await productionPersistence.eventRealityRepository.saveEventEvaluation(productionEvent);
  const contradictionInput = {
    asset: 'xau_usd',
    horizon: 'intraday',
    generatedAt: productionEvent.interpretedAt,
    evidencePoints: [
      {
        evidencePointId: 'ifp8-point', asset: 'xau_usd', horizon: 'intraday',
        observedAt: '2026-01-01T00:45:00.000Z', evidenceClass: 'diagnostic',
        driverKind: 'unknown', side: 'context', direction: 'unknown', strength: 0,
        quality: 1, providerId: 'test-provider', sourceId: 'ifp8-source',
        rationale: 'Persisted test context.', reasonCodes: [], warnings: [],
      },
    ],
    priceReactionAvailable: true,
    priceReaction: productionEvent.reality.primaryPriceReaction,
    providerReliabilitySupplied: true,
    sourceIndependenceVerified: true,
    warnings: [],
  } as never;
  await productionPersistence.persistedContradictionInputRepository.saveContradictionInput(
    normalizePersistedContradictionInputRecord({
      recordId: '', eventEvaluationId: productionEvent.eventEvaluationId,
      expectationId: productionEvent.expectationId, asset: 'xau_usd',
      assessmentStage: productionEvent.assessmentStage,
      assessmentEvidenceHash: productionEvent.assessmentEvidenceHash,
      availableAt: productionEvent.interpretedAt, evidenceCutoffAt: productionEvent.interpretedAt,
      input: contradictionInput, normalizedInputHash: '', sourceEvidenceIds: ['ifp8-source'],
      provenance: [{ sourceId: 'ifp8-source', contentHash: 'ifp8-source-hash', reliability: 'verified' }],
      providerReliabilitySupplied: true, sourceIndependenceVerified: true,
      warnings: [], limitations: [], createdAt: productionEvent.interpretedAt,
      canonicalPayloadHash: '',
    }),
  );
  for (const [snapshotId, reasoningRunId, evaluatedAt] of [
    ['pre', 'ifp8-pre-run', '2025-12-30T23:59:00.000Z'],
    ['post', 'ifp8-post-run', '2026-01-01T00:30:00.000Z'],
  ] as const) {
    const cognition = buildCanonicalCognitionStateFixture({
      asset: 'xau_usd',
      evaluatedAt,
      evaluationWindowStart: evaluatedAt,
      evaluationWindowEnd: evaluatedAt,
      audit: { dataCutoffAt: evaluatedAt },
    } as never);
    await productionPersistence.snapshotRepository.saveCognitionSnapshot({
      snapshotId,
      reasoningRunId,
      asset: 'xau_usd',
      timeframe: 'H1',
      evaluatedAt,
      bias: cognition.bias,
      confidenceScore: cognition.confidence.score,
      contradictionScore: cognition.contradiction.score,
      freshnessScore: cognition.freshness.freshnessScore,
      sourceIngestionRunId: null,
      sourceIngestionRequestKey: null,
      reasoningVersion: cognition.audit.reasoningVersion,
      scoringVersion: cognition.audit.scoringVersion,
      cognitionJson: serializeCanonicalCognitionState(cognition),
      createdAt: evaluatedAt,
    });
  }
  const productionEvidence = {
    caseId: 'ifp8-production-chain-case',
    eventInstanceId: 'ifp8-production-chain-event-instance',
    eventFamilyId: 'ifp8-production-chain-family',
    evidenceCutoffAt: productionEvent.interpretedAt,
    asset: productionEvent.asset,
    eventClass: productionEvent.expectation.eventKind,
    horizon: productionEvent.assessmentStage,
    qualifiedEvidenceFamilies: [],
    references: [],
    productionInput: {
      eventEvaluationId: productionEvent.eventEvaluationId,
      evidenceCutoffAt: productionEvent.interpretedAt,
    },
  } as const;
  const productionAdapter = new ActualProductionIfpChainAdapter(
    productionPersistence,
    new CanonicalRuntimeBaselineAuthority(),
  );
  const productionOutputs = await productionAdapter.runAndPersist(
    productionEvidence.productionInput,
    productionEvidence,
    CANONICAL_RUNTIME_BASELINE,
  );
  assert.equal(productionOutputs.ifp1.eventEvaluationId, productionEvent.eventEvaluationId);
  assert(productionOutputs.ifp2?.retrievalId);
  assert(productionOutputs.ifp3.protocolDecisionId);
  assert(productionOutputs.ifp4.cleanlinessEvaluationId);
  assert(productionOutputs.ifp5.narrativeDecayEvaluationId);
  assert(productionOutputs.ifp6.positioningStressEvaluationId);
  assert(productionOutputs.ifp7.fragilityScoreEvaluationId);
  assert.equal(productionOutputs.canonicalOutputHashes.length, 7);
  assert.equal(productionOutputs.configurationVersionId, CANONICAL_RUNTIME_BASELINE.configurationVersionId);
  assert.equal(productionOutputs.parameterSnapshotHash, CANONICAL_RUNTIME_BASELINE.parameterSnapshotHash);
  assert.equal(productionOutputs.confidence.preSnapshotId, 'pre');
  assert.equal(productionOutputs.confidence.postSnapshotId, 'post');
  assert.equal(productionOutputs.confidence.availability, 'available');
  assert.deepEqual(
    await productionPersistence.historicalAnalogRepository.getRetrievalById(
      productionOutputs.ifp2!.retrievalId,
    ),
    productionOutputs.ifp2,
  );
  assert.deepEqual(
    await productionPersistence.contradictionActionProtocolRepository.getProtocolRecordById(
      productionOutputs.ifp3.protocolDecisionId,
    ),
    productionOutputs.ifp3,
  );
  assert.deepEqual(
    await productionPersistence.marketCleanlinessRepository.getEvaluationById(
      productionOutputs.ifp4.cleanlinessEvaluationId,
    ),
    productionOutputs.ifp4,
  );
  assert.deepEqual(
    await productionPersistence.narrativeDecayRepository.getEvaluationById(
      productionOutputs.ifp5.narrativeDecayEvaluationId,
    ),
    productionOutputs.ifp5,
  );
  assert.deepEqual(
    await productionPersistence.positioningStressRepository.getEvaluationById(
      productionOutputs.ifp6.positioningStressEvaluationId,
    ),
    productionOutputs.ifp6,
  );
  assert.deepEqual(
    await productionPersistence.fragilityScoreRepository.getEvaluationById(
      productionOutputs.ifp7.fragilityScoreEvaluationId,
    ),
    productionOutputs.ifp7,
  );
  const replayedOutputs = await productionAdapter.runAndPersist(
    productionEvidence.productionInput,
    productionEvidence,
    CANONICAL_RUNTIME_BASELINE,
  );
  assert.deepEqual(replayedOutputs.canonicalOutputHashes, productionOutputs.canonicalOutputHashes);
  const provisionalEvent = buildCleanlinessEventFixture({
    expectationId: 'ifp8-production-chain-provisional-expectation',
    eventEvaluationId: 'ifp8-production-chain-provisional-event',
    interpretedAt: productionEvent.interpretedAt,
  });
  provisionalEvent.postEventCognitionSnapshotId = null;
  provisionalEvent.reality.postEventCognitionSnapshotId = null;
  provisionalEvent.reality.postEventCognitionEvaluatedAt = null;
  provisionalEvent.reality.postEventConfidence = null;
  provisionalEvent.assessmentEvidenceHash = 'ifp8-provisional-assessment';
  await productionPersistence.eventExpectationRepository.saveEventExpectation(
    provisionalEvent.expectation,
  );
  await productionPersistence.eventRealityRepository.saveEventEvaluation(provisionalEvent);
  await productionPersistence.persistedContradictionInputRepository.saveContradictionInput(
    normalizePersistedContradictionInputRecord({
      recordId: '', eventEvaluationId: provisionalEvent.eventEvaluationId,
      expectationId: provisionalEvent.expectationId, asset: 'xau_usd',
      assessmentStage: provisionalEvent.assessmentStage,
      assessmentEvidenceHash: provisionalEvent.assessmentEvidenceHash,
      availableAt: provisionalEvent.interpretedAt, evidenceCutoffAt: provisionalEvent.interpretedAt,
      input: contradictionInput, normalizedInputHash: '', sourceEvidenceIds: ['ifp8-source'],
      provenance: [{ sourceId: 'ifp8-source', contentHash: 'ifp8-source-hash', reliability: 'verified' }],
      providerReliabilitySupplied: true, sourceIndependenceVerified: true,
      warnings: [], limitations: [], createdAt: provisionalEvent.interpretedAt,
      canonicalPayloadHash: '',
    }),
  );
  const provisionalEvidence = {
    ...productionEvidence,
    caseId: 'ifp8-production-chain-provisional-case',
    eventInstanceId: 'ifp8-production-chain-provisional-instance',
    productionInput: {
      ...productionEvidence.productionInput,
      eventEvaluationId: provisionalEvent.eventEvaluationId,
    },
  };
  const provisionalOutputs = await productionAdapter.runAndPersist(
    provisionalEvidence.productionInput,
    provisionalEvidence,
    CANONICAL_RUNTIME_BASELINE,
  );
  assert.equal(provisionalOutputs.confidence.postSnapshotId, null);
  assert.equal(provisionalOutputs.confidence.postReasoningRunId, null);
  assert.equal(provisionalOutputs.confidence.postClampValue, null);
  assert.equal(provisionalOutputs.confidence.availability, 'provisional');
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
    /storage_identity/,
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
  await assert.rejects(() => riskRepo.save('residual_risk', 'wrong-risk-id', risk), /storage_identity/);
  for (const [kind, value] of [
    ['dataset_manifest', fixture],
    ['dataset_certification', fixtureCertification],
    ['split_manifest', split],
    ['configuration_version', CANONICAL_RUNTIME_BASELINE],
    ['holdout_lifecycle', createHoldoutLifecycle({ acceptanceRunFamilyId: 'identity-family', datasetId: 'dataset', holdoutPartitionHash: split.holdoutPartitionHash, selectedConfigurationVersionId: CANONICAL_RUNTIME_BASELINE.configurationVersionId, selectedAt: at })],
  ] as const)
    await assert.rejects(
      () => new MemoryIntelligenceAcceptanceRepository().save(kind, 'wrong-storage-id', value),
      /storage_identity/,
    );
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
    structuralDecisionIds: [],
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
    structuralDecisionIds: ['approved-existing-structural-decision'],
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
  const unrelatedStructuralPolicy = {
    ...empiricalPolicy,
    criteria: [{ ...structuralCriterion, structuralDecisionIds: ['unrelated-decision'] }],
  };
  assert.equal(
    evaluateEmpiricalCriteria(unrelatedStructuralPolicy, [], [structuralDecision])[0]?.state,
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
  const empiricalCase = (
    caseId: string,
    asset: string,
    releaseStatus: 'aligned' | 'contradicted',
  ) => {
    const outputs = {
      ...productionOutputs,
      ifp1: {
        ...productionOutputs.ifp1,
        reality: {
          ...productionOutputs.ifp1.reality,
          releaseAlignment: {
            ...productionOutputs.ifp1.reality.releaseAlignment,
            status: releaseStatus,
          },
        },
      },
      confidence: {
        ...productionOutputs.confidence,
        caseId,
        asset,
        eventClass: 'cpi',
        horizon: 'follow_through',
        sourceClass: 'qualified',
      },
    };
    return {
      caseResultId: `test-${caseId}`,
      caseId,
      eventInstanceId: `event-${caseId}`,
      decisionTimeEvidenceHash: canonicalHash(caseId),
      outputs,
      canonicalOutputHashes: outputs.canonicalOutputHashes,
      frozenAt: at,
      outcome: {
        caseId,
        eventInstanceId: `event-${caseId}`,
        horizon: 'follow_through',
        measurementStartAt: at,
        measurementEndAt: '2026-01-01T01:00:00.000Z',
        outcomeAvailableAt: at,
        asset,
        calculationPolicyVersion: 'ifp8-outcome-observation-v1' as const,
        sourceReferences: [],
        properties: { releaseAligned: true },
        notEvaluable: [],
        canonicalPayloadHash: canonicalHash({ caseId, asset }),
      },
      canonicalPayloadHash: canonicalHash({ caseId }),
    } satisfies FrozenCaseResult;
  };
  const scopedCases = [
    empiricalCase('target-fail', 'xau_usd', 'contradicted'),
    empiricalCase('global-pass-1', 'eur_usd', 'aligned'),
    empiricalCase('global-pass-2', 'eur_usd', 'aligned'),
    empiricalCase('global-pass-3', 'eur_usd', 'aligned'),
  ];
  const scopedCriterion = {
    ...criterion,
    minimumSampleSize: 1,
    threshold: 0.5,
    structuralDecisionIds: [],
  };
  const scopedPolicy = { ...empiricalPolicy, criteria: [scopedCriterion] };
  const globalResult = evaluateEmpiricalCriteria(
    { ...empiricalPolicy, criteria: [{ ...scopedCriterion, scope: wildcard.scope }] },
    scopedCases,
    coverage,
  )[0]!;
  const scopedResult = evaluateEmpiricalCriteria(scopedPolicy, scopedCases, coverage)[0]!;
  assert.equal(globalResult.metricValue, 0.75);
  assert.deepEqual(scopedResult, {
    criterionId: criterion.criterionId,
    matchedSampleN: 1,
    metricValue: 0,
    state: 'fail',
    reason: 'scoped_criterion_failed',
  });
  const scopedRollback = createRollbackEvidence({
    ...rollback,
    acceptanceRunFamilyId: 'scoped-family',
  });
  const scopedCoverage = evaluateCoverage(
    { ...coveragePolicyBody, canonicalPayloadHash: canonicalHash(coveragePolicyBody) },
    [],
    new Set(),
    {
      datasetId: relabeled.datasetId,
      splitId: split.splitId,
      acceptanceRunFamilyId: 'scoped-family',
      createdAt: at,
    },
  );
  const scopedDecision = decideValidatedAcceptance({
    runFamilyId: 'scoped-family',
    dataset: relabeled,
    certification: null,
    split,
    configuration: baseline,
    trial: null,
    cases: scopedCases,
    coverage: scopedCoverage,
    coverageContractApproved: true,
    outcomePolicyApproved: true,
    empiricalAcceptancePolicy: scopedPolicy,
    rollback: scopedRollback,
    residualRisks: [],
    createdAt: at,
  });
  assert.equal(scopedDecision.empiricalCriterionResults[0]?.state, 'fail');
  assert.equal(scopedDecision.empiricalEngineStates.ifp1, 'fail');
  assert.notEqual(scopedDecision.empiricalIntelligenceGate, 'pass');
  assert.equal(scopedDecision.productionAcceptance, false);
  const optionalDecision = decideValidatedAcceptance({
    ...{
      runFamilyId: 'optional-family', dataset: relabeled, certification: null, split,
      configuration: baseline, trial: null, cases: scopedCases, coverage,
      coverageContractApproved: true, outcomePolicyApproved: true, rollback,
      residualRisks: [], createdAt: at,
    },
    empiricalAcceptancePolicy: {
      ...scopedPolicy,
      criteria: [{ ...scopedCriterion, required: false }],
    },
  });
  assert.notEqual(optionalDecision.empiricalEngineStates.ifp1, 'fail');
  const unsupported = evaluateEmpiricalCriteria(
    { ...scopedPolicy, criteria: [{ ...scopedCriterion, metric: 'unsupportedMetric' }] },
    scopedCases,
    scopedCoverage,
  )[0]!;
  assert.equal(unsupported.state, 'insufficient_evidence');
  const coherentBundle = {
    run: scopedDecision,
    cases: scopedCases,
    coverage: scopedCoverage,
    risks: [],
    rollback: scopedRollback,
    referenceLinks: [
      { kind: 'dataset_manifest' as const, id: relabeled.datasetId },
      { kind: 'split_manifest' as const, id: relabeled.datasetId },
      { kind: 'configuration_version' as const, id: baseline.configurationVersionId },
      { kind: 'rollback_evidence' as const, id: scopedRollback.rollbackEvidenceId },
      ...scopedCases.map((row) => ({ kind: 'case_result' as const, id: row.caseResultId })),
      ...scopedCoverage.map((row) => ({ kind: 'coverage_decision' as const, id: row.coverageDecisionId })),
    ],
  };
  const resolveBundle = async (kind: string, id: string) => {
    if (kind === 'dataset_manifest' && id === relabeled.datasetId) return relabeled;
    if (kind === 'split_manifest' && id === relabeled.datasetId) return split;
    if (kind === 'configuration_version' && id === baseline.configurationVersionId) return baseline;
    if (kind === 'holdout_lifecycle' && id === scopedDecision.acceptanceRunFamilyId)
      return createHoldoutLifecycle({
        acceptanceRunFamilyId: scopedDecision.acceptanceRunFamilyId,
        datasetId: relabeled.datasetId,
        holdoutPartitionHash: split.holdoutPartitionHash,
        selectedConfigurationVersionId: baseline.configurationVersionId,
        selectedAt: at,
      });
    return null;
  };
  await validateAcceptanceBundleCoherence(
    scopedDecision.acceptanceRunFamilyId,
    coherentBundle,
    resolveBundle as never,
  );
  await assert.rejects(
    () =>
      validateAcceptanceBundleCoherence(
        'wrong-family',
        coherentBundle,
        resolveBundle as never,
      ),
    /coherence_mismatch/,
  );
  await assert.rejects(
    () =>
      validateAcceptanceBundleCoherence(
        scopedDecision.acceptanceRunFamilyId,
        {
          ...coherentBundle,
          cases: coherentBundle.cases.map((row, index) =>
            index === 0
              ? { ...row, frozenAt: '2025-12-31T23:59:59Z', outcome: { ...row.outcome, outcomeAvailableAt: at } }
              : row,
          ),
        },
        resolveBundle as never,
      ),
    /coherence_mismatch/,
  );
  await assert.rejects(
    () =>
      validateAcceptanceBundleCoherence(
        scopedDecision.acceptanceRunFamilyId,
        {
          ...coherentBundle,
          run: { ...coherentBundle.run, createdAt: '2025-12-31T23:59:59Z' },
        },
        resolveBundle as never,
      ),
    /coherence_mismatch/,
  );
  await assert.rejects(
    () =>
      validateAcceptanceBundleCoherence(
        scopedDecision.acceptanceRunFamilyId,
        { ...coherentBundle, cases: coherentBundle.cases.slice(1) },
        resolveBundle as never,
      ),
    /coherence_mismatch/,
  );
  await assert.rejects(
    () =>
      validateAcceptanceBundleCoherence(
        scopedDecision.acceptanceRunFamilyId,
        { ...coherentBundle, referenceLinks: coherentBundle.referenceLinks.slice(1) },
        resolveBundle as never,
      ),
    /coherence_mismatch/,
  );
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
  assert.deepEqual(finalizeCertification({ ...fixtureCertification } as never), fixtureCertification);
  assert.deepEqual(finalizeSplit({ ...split } as never), split);
  assert.deepEqual(createConfiguration({ ...baseline } as never), baseline);
  assert.deepEqual(createTrial({ ...trial } as never), trial);
  const constructorLifecycle = createHoldoutLifecycle({
    acceptanceRunFamilyId: 'constructor-family',
    datasetId: 'dataset',
    holdoutPartitionHash: split.holdoutPartitionHash,
    selectedConfigurationVersionId: baseline.configurationVersionId,
    selectedAt: at,
  });
  assert.deepEqual(createHoldoutLifecycle({ ...constructorLifecycle } as never), constructorLifecycle);
  assert.deepEqual(createRollbackEvidence({ ...rollback } as never), rollback);
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
  const earlyOpenRepo = new MemoryIntelligenceAcceptanceRepository();
  await earlyOpenRepo.freezeCandidate(
    createHoldoutLifecycle({
      ...lifecycle,
      acceptanceRunFamilyId: 'early-open-family',
      selectedAt: '2026-01-02T00:00:00Z',
    }),
  );
  await assert.rejects(
    () => earlyOpenRepo.openHoldout('early-open-family', '2026-01-01T00:00:00Z'),
    /time_order_invalid/,
  );
  await earlyOpenRepo.openHoldout('early-open-family', '2026-01-03T00:00:00Z');
  await assert.rejects(
    () => earlyOpenRepo.completeHoldout('early-open-family', '2026-01-02T00:00:00Z'),
    /time_order_invalid/,
  );
  await assert.rejects(
    () => earlyOpenRepo.failHoldout('early-open-family', '2026-01-02T00:00:00Z', 'early'),
    /time_order_invalid/,
  );
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
