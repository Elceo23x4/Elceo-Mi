import { buildCanonicalCognitionStateFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import { MemoryReasoningPersistenceRepository } from '../persistence/memory-reasoning-repository.js';
import { getCognitionReplayBundleByReasoningRunId } from '../persistence/replay.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
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

  const latest = await repo.snapshotRepository.getLatestSnapshotForAssetTimeframe('XAU/USD', 'H1');
  assert(latest?.snapshotId === 'snap-1', 'latest snapshot retrieval should work');

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
}
