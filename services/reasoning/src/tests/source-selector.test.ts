import { buildCanonicalEventFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import { MemoryIngestionEventSnapshotRepository, MemoryIngestionRunRepository, type IngestionRunRecordInput } from '../../../ingestion/src/persistence/index.js';
import { ReasoningInputSourceSelector } from '../input/source-selector.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function runRecord(runId: string, status: IngestionRunRecordInput['status'], endedAt: string, outputEventCount = 1): IngestionRunRecordInput {
  return {
    runId,
    asset: 'XAU/USD',
    timeframe: 'H1',
    mode: 'canonical',
    activeBoundary: 'canonical',
    status,
    startedAt: endedAt,
    endedAt,
    durationMs: 1,
    canonicalEventCount: outputEventCount,
    legacyEventCount: null,
    outputEventCount,
    fallbackApplied: false,
    fallbackReason: null,
    boundaryVersion: 'c2',
    triggerKind: 'scheduled',
    requestKey: `rk-${runId}`,
    slotStartAt: null,
    slotEndAt: null,
    schedulerTickId: null,
    comparison: null,
    diagnosticsSummary: { adapterFailureCount: 0, invalidEventCount: 0, mergeCount: 0, droppedEventCount: 0 },
    providerCapabilities: []
  };
}

export async function runSourceSelectorTests(): Promise<void> {
  const runRepo = new MemoryIngestionRunRepository();
  const eventRepo = new MemoryIngestionEventSnapshotRepository();
  const selector = new ReasoningInputSourceSelector(runRepo, eventRepo);

  await runRepo.saveRunRecord(runRecord('run-1', 'success', '2026-04-22T10:00:00.000Z'));
  await eventRepo.saveEventSnapshots('run-1', 'XAU/USD', 'H1', [buildCanonicalEventFixture({ id: 'evt-1' })]);
  const explicit = await selector.selectReasoningInputSource({ asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-04-22T10:01:00.000Z', sourceIngestionRunId: 'run-1' });
  assert(explicit.run.runId === 'run-1', 'explicit sourceIngestionRunId should be honored');

  await runRepo.saveRunRecord(runRecord('run-2', 'failed', '2026-04-22T11:00:00.000Z'));
  await runRepo.saveRunRecord(runRecord('run-3', 'partial_success', '2026-04-22T12:00:00.000Z'));
  await eventRepo.saveEventSnapshots('run-3', 'XAU/USD', 'H1', [buildCanonicalEventFixture({ id: 'evt-3' })]);
  const latestUsable = await selector.selectReasoningInputSource({ asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-04-22T12:01:00.000Z' });
  assert(latestUsable.run.runId === 'run-3', 'latest usable run should skip failed runs');

  await runRepo.saveRunRecord(runRecord('run-4', 'success', '2026-04-22T13:00:00.000Z', 1));
  let threwMissingSnapshots = false;
  try {
    await selector.selectReasoningInputSource({ asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-04-22T13:05:00.000Z', sourceIngestionRunId: 'run-4' });
  } catch {
    threwMissingSnapshots = true;
  }
  assert(threwMissingSnapshots, 'missing snapshots for non-zero output should fail');

  await runRepo.saveRunRecord(runRecord('run-5', 'success', '2026-04-22T14:00:00.000Z', 0));
  const zeroOutput = await selector.selectReasoningInputSource({ asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-04-22T14:05:00.000Z', sourceIngestionRunId: 'run-5' });
  assert(zeroOutput.events.length === 0, 'zero-output run with no snapshots should be allowed');
}
