import { buildCanonicalEventFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import { MemoryIngestionEventSnapshotRepository, MemoryIngestionRunRepository, type IngestionRunRecordInput } from '../../../ingestion/src/persistence/index.js';
import { ContractBackedJournalInfluenceProvider } from '../input/journal-influence-provider.js';
import { ReasoningInputAssembler } from '../input/reasoning-input-assembler.js';
import { ProviderSuiteMarketContextLoader } from '../input/market-context-loader.js';
import { ReasoningInputSourceSelector } from '../input/source-selector.js';
import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import type { CognitionSnapshotRepository, PersistedCognitionSnapshot } from '../persistence/contracts.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

class EmptySnapshotRepo implements CognitionSnapshotRepository {
  async saveCognitionSnapshot(_record: PersistedCognitionSnapshot): Promise<void> {}
  async getSnapshotById(_snapshotId: string): Promise<PersistedCognitionSnapshot | null> { return null; }
  async getSnapshotByReasoningRunId(_reasoningRunId: string): Promise<PersistedCognitionSnapshot | null> { return null; }
  async getLatestSnapshotForAssetTimeframe(_asset: CanonicalAssetSymbol, _timeframe: Timeframe, _beforeIso?: string): Promise<PersistedCognitionSnapshot | null> { return null; }
}

function runRecord(runId: string): IngestionRunRecordInput {
  return {
    runId,
    asset: 'BTC/USD',
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
    requestKey: 'rk-adopt',
    slotStartAt: null,
    slotEndAt: null,
    schedulerTickId: null,
    comparison: null,
    diagnosticsSummary: { adapterFailureCount: 0, invalidEventCount: 0, mergeCount: 0, droppedEventCount: 0 },
    providerCapabilities: []
  };
}

export async function runJournalInfluenceAdoptionTests(): Promise<void> {
  const runRepo = new MemoryIngestionRunRepository();
  const eventRepo = new MemoryIngestionEventSnapshotRepository();
  await runRepo.saveRunRecord(runRecord('run-adopt'));
  await eventRepo.saveEventSnapshots('run-adopt', 'BTC/USD', 'H1', [buildCanonicalEventFixture({ id: 'evt-adopt' })]);

  const sourceSelector = new ReasoningInputSourceSelector(runRepo, eventRepo);
  const marketLoader = new ProviderSuiteMarketContextLoader({
    getLatestPrice: async () => 60000,
    getRecentRange: async () => ({ high: 60500, low: 59500, close: 60000 }),
    getStructuredMarketEvidence: async () => []
  });

  const provider = new ContractBackedJournalInfluenceProvider({
    getJournalInfluenceForReasoningInput: async () => ({
      enabled: true,
      influenceFlag: 'none',
      linkedEntryIds: ['jc-1'],
      summary: {
        subjectKind: 'user',
        subjectId: 'u-1',
        asset: 'BTC/USD',
        timeframe: 'H1',
        generatedAt: '2026-04-24T10:00:00.000Z',
        reviewedCaseCount: 1,
        closedCaseCount: 1,
        recentCaseCount: 1,
        setupPatterns: [{
          setupType: 'breakout',
          sampleCount: 1,
          winCount: 1,
          lossCount: 0,
          breakevenCount: 0,
          mixedCount: 0,
          avgRMultiple: 1.2,
          avgPnlPercent: 2.1,
          executionQualityBreakdown: { disciplined: 1 },
          influenceScore: 78
        }],
        behaviorPatterns: [],
        directionPatterns: [],
        repeatedMistakes: [],
        repeatedStrengths: [],
        cautionNotes: [],
        confidenceBoostNotes: ['Setup strength detected for breakout.'],
        supportingCaseIds: ['jc-1']
      }
    })
  });

  const assembler = new ReasoningInputAssembler(sourceSelector, marketLoader, new EmptySnapshotRepo(), undefined, provider);
  const result = await assembler.assembleReasoningInput({ asset: 'BTC/USD', timeframe: 'H1', asOf: '2026-04-24T10:00:00.000Z', userId: 'u-1' });
  assert(result.input.userJournalInfluence.summary?.supportingCaseIds[0] === 'jc-1', 'assembler should include structured journal influence summary');
  assert(result.input.userJournalInfluence.influenceFlag === 'strong', 'provider should derive non-placeholder influence flag from summary');

  const failingAssembler = new ReasoningInputAssembler(
    sourceSelector,
    marketLoader,
    new EmptySnapshotRepo(),
    undefined,
    new ContractBackedJournalInfluenceProvider({ getJournalInfluenceForReasoningInput: async () => { throw new Error('down'); } })
  );
  const fallback = await failingAssembler.assembleReasoningInput({ asset: 'BTC/USD', timeframe: 'H1', asOf: '2026-04-24T10:01:00.000Z', userId: 'u-1' });
  assert(fallback.input.userJournalInfluence.enabled === false, 'journal failure should fallback to disabled influence');
  assert(fallback.warnings.some((item) => item.includes('journal_provider_failure')), 'journal failure should be warning and non-fatal');
}
