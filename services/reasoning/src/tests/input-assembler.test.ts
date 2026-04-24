import { buildCanonicalCognitionStateFixture, buildCanonicalEventFixture, buildZoneSignificanceFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import { MemoryIngestionEventSnapshotRepository, MemoryIngestionRunRepository, type IngestionRunRecordInput } from '../../../ingestion/src/persistence/index.js';
import { ReasoningInputAssembler } from '../input/reasoning-input-assembler.js';
import { ProviderSuiteMarketContextLoader } from '../input/market-context-loader.js';
import { ReasoningInputSourceSelector } from '../input/source-selector.js';
import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import type { CognitionSnapshotRepository, PersistedCognitionSnapshot } from '../persistence/contracts.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

class MemorySnapshotRepo implements CognitionSnapshotRepository {
  private row: PersistedCognitionSnapshot | null = null;
  async saveCognitionSnapshot(record: PersistedCognitionSnapshot): Promise<void> { this.row = record; }
  async getSnapshotById(_snapshotId: string): Promise<PersistedCognitionSnapshot | null> { return this.row; }
  async getSnapshotByReasoningRunId(_reasoningRunId: string): Promise<PersistedCognitionSnapshot | null> { return this.row; }
  async getLatestSnapshotForAssetTimeframe(_asset: CanonicalAssetSymbol, _timeframe: Timeframe, _beforeIso?: string): Promise<PersistedCognitionSnapshot | null> { return this.row; }
}

function runRecord(runId: string): IngestionRunRecordInput {
  return {
    runId,
    asset: 'XAU/USD',
    timeframe: 'H1',
    mode: 'canonical',
    activeBoundary: 'canonical',
    status: 'success',
    startedAt: '2026-04-22T10:00:00.000Z',
    endedAt: '2026-04-22T10:00:01.000Z',
    durationMs: 1,
    canonicalEventCount: 1,
    legacyEventCount: null,
    outputEventCount: 1,
    fallbackApplied: false,
    fallbackReason: null,
    boundaryVersion: 'c2',
    triggerKind: 'scheduled',
    requestKey: 'rk-1',
    slotStartAt: null,
    slotEndAt: null,
    schedulerTickId: null,
    comparison: null,
    diagnosticsSummary: { adapterFailureCount: 0, invalidEventCount: 0, mergeCount: 0, droppedEventCount: 0 },
    providerCapabilities: []
  };
}

export async function runInputAssemblerTests(): Promise<void> {
  const runRepo = new MemoryIngestionRunRepository();
  const eventRepo = new MemoryIngestionEventSnapshotRepository();
  await runRepo.saveRunRecord(runRecord('run-ia1'));
  await eventRepo.saveEventSnapshots('run-ia1', 'XAU/USD', 'H1', [buildCanonicalEventFixture({ id: 'evt-ia1' })]);

  const sourceSelector = new ReasoningInputSourceSelector(runRepo, eventRepo);
  const marketLoader = new ProviderSuiteMarketContextLoader({
    getLatestPrice: async () => 2001,
    getRecentRange: async () => ({ high: 2010, low: 1990, close: 2001 }),
    getStructuredMarketEvidence: async () => []
  });
  const snapshotRepo = new MemorySnapshotRepo();

  const assembler = new ReasoningInputAssembler(
    sourceSelector,
    marketLoader,
    snapshotRepo,
    { loadZones: async () => [buildZoneSignificanceFixture()] },
    { loadJournalInfluence: async () => ({ enabled: true, influenceFlag: 'weak', linkedEntryIds: ['j1'], summary: null }) }
  );
  const assembled = await assembler.assembleReasoningInput({ asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-04-22T11:00:00.000Z' });
  assert(assembled.input.latestPrice === 2001, 'successful full assembly should include market context');

  const failingMarketAssembler = new ReasoningInputAssembler(sourceSelector, new ProviderSuiteMarketContextLoader(null), snapshotRepo);
  let missingAdapterFailed = false;
  try {
    await failingMarketAssembler.assembleReasoningInput({ asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-04-22T11:00:00.000Z' });
  } catch {
    missingAdapterFailed = true;
  }
  assert(missingAdapterFailed, 'missing marketData adapter should fail deterministically');

  const fallbackAssembler = new ReasoningInputAssembler(
    sourceSelector,
    marketLoader,
    snapshotRepo,
    { loadZones: async () => { throw new Error('zone down'); } },
    { loadJournalInfluence: async () => { throw new Error('journal down'); } }
  );
  const fallback = await fallbackAssembler.assembleReasoningInput({ asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-04-22T11:00:00.000Z' });
  assert(fallback.zoneCount === 0 && fallback.warnings.length === 2, 'zone/journal failures should fallback with warnings');

  await snapshotRepo.saveCognitionSnapshot({
    snapshotId: 'snap-1',
    reasoningRunId: 'reason-1',
    asset: 'XAU/USD',
    timeframe: 'H1',
    evaluatedAt: '2026-04-22T10:30:00.000Z',
    bias: 'bullish',
    confidenceScore: 50,
    contradictionScore: 20,
    freshnessScore: 60,
    sourceIngestionRunId: 'run-ia1',
    sourceIngestionRequestKey: 'rk-1',
    reasoningVersion: 'v1',
    scoringVersion: 's1',
    cognitionJson: JSON.stringify(buildCanonicalCognitionStateFixture()),
    createdAt: '2026-04-22T10:30:00.000Z'
  });
  const withPrior = await assembler.assembleReasoningInput({ asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-04-22T11:00:00.000Z' });
  assert(withPrior.input.priorCognition !== null, 'prior cognition should load when available');

  const baseSnapshot = await snapshotRepo.getSnapshotById('snap-1');
  const corruptRepo: CognitionSnapshotRepository = {
    saveCognitionSnapshot: async (record) => snapshotRepo.saveCognitionSnapshot(record),
    getSnapshotById: async (snapshotId) => snapshotRepo.getSnapshotById(snapshotId),
    getSnapshotByReasoningRunId: async (reasoningRunId) => snapshotRepo.getSnapshotByReasoningRunId(reasoningRunId),
    getLatestSnapshotForAssetTimeframe: async (_asset, _timeframe, _beforeIso) => ({ ...(baseSnapshot as PersistedCognitionSnapshot), cognitionJson: '{bad' })
  };
  const corruptAssembler = new ReasoningInputAssembler(sourceSelector, marketLoader, corruptRepo);
  let corruptFailed = false;
  try {
    await corruptAssembler.assembleReasoningInput({ asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-04-22T11:00:00.000Z' });
  } catch {
    corruptFailed = true;
  }
  assert(corruptFailed, 'corrupt prior cognition should fail deterministically');
}
