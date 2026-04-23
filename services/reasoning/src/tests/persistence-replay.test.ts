import { buildCanonicalCognitionStateFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import type { CognitionDriftReport } from '../delta/contracts.js';
import { MemoryReasoningPersistenceRepository } from '../persistence/memory-reasoning-repository.js';
import {
  getCognitionReplayBundleByReasoningRunId,
  getDriftReplayBundleById,
  getLatestDriftReplayBundle
} from '../persistence/replay.js';
import { serializeCognitionDriftReport } from '../persistence/serialization.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function buildDriftReport(): CognitionDriftReport {
  return {
    driftId: 'drift|snap-1|snap-2',
    asset: 'XAU/USD',
    timeframe: 'H1',
    previousSnapshotId: 'snap-1',
    currentSnapshotId: 'snap-2',
    previousReasoningRunId: 'rr-1',
    currentReasoningRunId: 'rr-2',
    comparedAt: '2026-04-22T10:10:00.000Z',
    biasDelta: { previousBias: 'bullish', currentBias: 'neutral', changed: true, flip: false },
    confidenceDelta: { previous: 70, current: 60, absoluteDelta: 10, direction: 'down' },
    contradictionDelta: { previous: 20, current: 35, absoluteDelta: 15, direction: 'up' },
    freshnessDelta: { previous: 80, current: 74, absoluteDelta: 6, direction: 'down' },
    invalidationDelta: {
      previousPrimaryPrice: 100,
      currentPrimaryPrice: 104,
      priceChanged: true,
      absolutePriceDelta: 4,
      previousRiskLabel: 'warning',
      currentRiskLabel: 'fragile',
      riskLabelChanged: true
    },
    evidenceDelta: {
      previousTopEvidenceIds: ['e1', 'e2'],
      currentTopEvidenceIds: ['e2', 'e3'],
      enteredEvidenceIds: ['e3'],
      exitedEvidenceIds: ['e1'],
      retainedEvidenceIds: ['e2'],
      rerankedEvidenceIds: ['e2'],
      previousTopCount: 2,
      currentTopCount: 2
    },
    chartProjectionDelta: {
      previousAnnotationIds: ['a1'],
      currentAnnotationIds: ['a1', 'a2'],
      enteredAnnotationIds: ['a2'],
      exitedAnnotationIds: [],
      previousEmphasisLevels: [100],
      currentEmphasisLevels: [100, 104],
      emphasisLevelChanged: true,
      contradictionMarkerVisibilityChanged: true
    },
    severity: 'major',
    summary: 'XAU/USD H1 drift is major: bias bullish->neutral, confidence down 10, contradiction up 15, freshness down 6.',
    keyChanges: ['Bias changed from bullish to neutral.'],
    createdAt: '2026-04-22T10:10:00.000Z'
  };
}

export async function runPersistenceReplayTests(): Promise<void> {
  const repo = new MemoryReasoningPersistenceRepository();

  await repo.runRepository.saveReasoningRun({
    reasoningRunId: 'rr-1',
    asset: 'XAU/USD',
    timeframe: 'H1',
    sourceIngestionRunId: 'ing-1',
    sourceIngestionRequestKey: 'rk-1',
    engineName: 'test-engine',
    reasoningVersion: 'r1',
    scoringVersion: 's1',
    startedAt: '2026-04-22T10:00:00.000Z',
    endedAt: '2026-04-22T10:00:01.000Z',
    durationMs: 1,
    status: 'success',
    inputEventCount: 1,
    inputZoneCount: 0,
    projectedEvidenceCount: 1,
    priorSnapshotId: null,
    snapshotId: 'snap-1',
    failureReason: null,
    warningsJson: '[]',
    createdAt: '2026-04-22T10:00:01.000Z'
  });

  await repo.snapshotRepository.saveCognitionSnapshot({
    snapshotId: 'snap-1',
    reasoningRunId: 'rr-1',
    asset: 'XAU/USD',
    timeframe: 'H1',
    evaluatedAt: '2026-04-22T10:00:01.000Z',
    bias: 'bullish',
    confidenceScore: 70,
    contradictionScore: 20,
    freshnessScore: 80,
    sourceIngestionRunId: 'ing-1',
    sourceIngestionRequestKey: 'rk-1',
    reasoningVersion: 'r1',
    scoringVersion: 's1',
    cognitionJson: JSON.stringify(buildCanonicalCognitionStateFixture()),
    createdAt: '2026-04-22T10:00:01.000Z'
  });

  const run = await repo.runRepository.getReasoningRunById('rr-1');
  const snap = await repo.snapshotRepository.getSnapshotById('snap-1');
  assert(run !== null && snap !== null, 'save/get reasoning run and snapshot should work');

  const replay = await getCognitionReplayBundleByReasoningRunId('rr-1', repo.runRepository, repo.snapshotRepository);
  assert(replay?.run.reasoningRunId === 'rr-1', 'replay bundle by run id should work');

  await repo.snapshotRepository.saveCognitionSnapshot({
    ...(snap as NonNullable<typeof snap>),
    snapshotId: 'snap-bad',
    reasoningRunId: 'rr-bad',
    cognitionJson: '{bad'
  });
  await repo.runRepository.saveReasoningRun({ ...(run as NonNullable<typeof run>), reasoningRunId: 'rr-bad', snapshotId: 'snap-bad', createdAt: '2026-04-22T10:00:02.000Z' });

  let threw = false;
  try {
    await getCognitionReplayBundleByReasoningRunId('rr-bad', repo.runRepository, repo.snapshotRepository);
  } catch {
    threw = true;
  }
  assert(threw, 'malformed cognition json should fail deterministically');

  const driftReport = buildDriftReport();
  await repo.driftRepository.saveDriftRecord({
    driftId: driftReport.driftId,
    asset: driftReport.asset,
    timeframe: driftReport.timeframe,
    previousSnapshotId: driftReport.previousSnapshotId,
    currentSnapshotId: driftReport.currentSnapshotId,
    previousReasoningRunId: driftReport.previousReasoningRunId,
    currentReasoningRunId: driftReport.currentReasoningRunId,
    comparedAt: driftReport.comparedAt,
    severity: driftReport.severity,
    summary: driftReport.summary,
    keyChangesJson: JSON.stringify(driftReport.keyChanges),
    confidenceDelta: driftReport.confidenceDelta.absoluteDelta,
    contradictionDelta: driftReport.contradictionDelta.absoluteDelta,
    freshnessDelta: driftReport.freshnessDelta.absoluteDelta,
    invalidationPriceDelta: driftReport.invalidationDelta.absolutePriceDelta,
    createdAt: driftReport.createdAt,
    driftJson: serializeCognitionDriftReport(driftReport)
  });

  const driftById = await getDriftReplayBundleById(driftReport.driftId, repo.driftRepository);
  assert(driftById?.report.driftId === driftReport.driftId, 'drift replay by id should deserialize persisted drift report');

  const latestDrift = await getLatestDriftReplayBundle('XAU/USD', 'H1', repo.driftRepository);
  assert(latestDrift?.report.driftId === driftReport.driftId, 'latest drift replay should resolve newest drift for asset/timeframe');

  await repo.driftRepository.saveDriftRecord({
    driftId: 'drift-bad',
    asset: 'XAU/USD',
    timeframe: 'H1',
    previousSnapshotId: 'snap-x',
    currentSnapshotId: 'snap-y',
    previousReasoningRunId: 'rr-x',
    currentReasoningRunId: 'rr-y',
    comparedAt: '2026-04-22T10:11:00.000Z',
    severity: 'minor',
    summary: 'bad',
    keyChangesJson: '[]',
    confidenceDelta: 0,
    contradictionDelta: 0,
    freshnessDelta: 0,
    invalidationPriceDelta: 0,
    createdAt: '2026-04-22T10:11:00.000Z',
    driftJson: '{bad'
  });

  let driftThrew = false;
  try {
    await getDriftReplayBundleById('drift-bad', repo.driftRepository);
  } catch {
    driftThrew = true;
  }
  assert(driftThrew, 'malformed drift json should fail deterministically');
}
