import assert from 'node:assert/strict';
import {
  createConfiguration,
  createHoldoutLifecycle,
  createRollbackEvidence,
  createTrial,
  finalizeCertification,
  finalizeDatasetManifest,
  finalizeOutcome,
  finalizeSplit,
  MemoryIntelligenceAcceptanceRepository,
  partitionHash,
  verifyDatasetCertification,
  verifyManifestSplit,
  verifyRollback,
} from '../intelligence-acceptance/index.js';
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
    calibrationEventIds: ['cal'],
    embargoEventIds: ['emb'],
    holdoutEventIds: ['hold'],
    eventFamilies: { cal: 'a', emb: 'b', hold: 'c' },
    eventTimes: { cal: '2025-01-01', emb: '2025-01-04', hold: '2025-01-10' },
    outcomeWindowEnds: { cal: '2025-01-02', emb: '2025-01-05', hold: '2025-01-11' },
    maximumOutcomeHorizonMs: 86400000,
  });
  verifyManifestSplit(relabeled, split);
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
    fromConfigurationVersionId: 'baseline',
    restoredConfigurationVersionId: 'restored',
    expectedPreviousParameterSnapshotHash: baseline.parameterSnapshotHash,
    restoredParameterSnapshotHash: restored.parameterSnapshotHash,
    replayCaseIds: ['case'],
    previousCanonicalOutputHashes: ['c'.repeat(64)],
    restoredCanonicalOutputHashes: ['c'.repeat(64)],
    reproductionMatch: true,
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
  assert.throws(
    () =>
      finalizeOutcome({
        caseId: 'case',
        eventInstanceId: 'hold',
        horizon: 'follow_through',
        measurementStartAt: at,
        measurementEndAt: '2026-01-02',
        outcomeAvailableAt: '2026-01-01',
        calculationPolicyVersion: 'v1',
        sourceReferences: [],
        properties: {},
      }),
    /outcome/,
  );
  const repo = new MemoryIntelligenceAcceptanceRepository(),
    lifecycle = createHoldoutLifecycle({
      acceptanceRunFamilyId: 'family',
      datasetId: 'dataset',
      holdoutPartitionHash: split.holdoutPartitionHash,
      selectedConfigurationVersionId: 'baseline',
      selectedAt: at,
    });
  await repo.freezeCandidate(lifecycle);
  await repo.openHoldout('family', '2026-01-02');
  const second = new MemoryIntelligenceAcceptanceRepository();
  assert.equal((await repo.get('holdout_lifecycle', 'family'))?.state, 'opened');
  assert.equal(await second.get('holdout_lifecycle', 'family'), null);
  console.log('IFP-8 production acceptance integrity tests passed');
}
