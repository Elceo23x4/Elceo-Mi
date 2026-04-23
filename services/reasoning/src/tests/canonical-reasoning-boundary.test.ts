import { buildCanonicalCognitionStateFixture, buildCanonicalEventFixture, buildReasoningInputFrameFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import { CanonicalReasoningBoundaryService, createCanonicalReasoningBoundaryService } from '../runtime/canonical-reasoning-boundary.js';
import { MemoryReasoningPersistenceRepository } from '../persistence/memory-reasoning-repository.js';
import type { ReasoningInputAssemblyResult } from '../input/reasoning-input-assembler.js';
import { DETERMINISTIC_REASONING_ENGINE_NAME } from '../engine/constants.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

class StubAssembler {
  constructor(private readonly result: ReasoningInputAssemblyResult | null, private readonly shouldThrow = false) {}
  async assembleReasoningInput(): Promise<ReasoningInputAssemblyResult> {
    if (this.shouldThrow || !this.result) throw new Error('assemble failed');
    return this.result;
  }
}

const assemblyResult: ReasoningInputAssemblyResult = {
  input: buildReasoningInputFrameFixture({ events: [buildCanonicalEventFixture({ id: 'evt-boundary' })] }),
  sourceRunId: 'ing-1',
  sourceRequestKey: 'rk-1',
  priorSnapshotId: null,
  warnings: [],
  selectedEventCount: 1,
  projectedEvidenceCount: 1,
  zoneCount: 0
};

export async function runCanonicalReasoningBoundaryTests(): Promise<void> {
  const repo = new MemoryReasoningPersistenceRepository();

  const successService = new CanonicalReasoningBoundaryService(
    new StubAssembler(assemblyResult) as never,
    { evaluate: () => buildCanonicalCognitionStateFixture() },
    { engineName: 'mock-engine', reasoningVersion: 'r1', scoringVersion: 's1' },
    repo
  );
  const success = await successService.executeAssetWindow({ asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-04-22T11:00:00.000Z' });
  assert(success.cognition !== null && success.report.status === 'success', 'successful path should persist and return cognition');

  const assemblyFailService = new CanonicalReasoningBoundaryService(
    new StubAssembler(null, true) as never,
    { evaluate: () => buildCanonicalCognitionStateFixture() },
    { engineName: 'mock-engine', reasoningVersion: 'r1', scoringVersion: 's1' },
    repo
  );
  const assemblyFail = await assemblyFailService.executeAssetWindow({ asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-04-22T11:00:00.000Z' });
  assert(assemblyFail.report.status === 'failed' && assemblyFail.cognition === null, 'assembly failure persists failed run');

  const engineThrowService = new CanonicalReasoningBoundaryService(
    new StubAssembler(assemblyResult) as never,
    { evaluate: () => { throw new Error('boom'); } },
    { engineName: 'mock-engine', reasoningVersion: 'r1', scoringVersion: 's1' },
    repo
  );
  const engineFail = await engineThrowService.executeAssetWindow({ asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-04-22T11:00:00.000Z' });
  assert(engineFail.report.status === 'failed' && engineFail.cognition === null, 'engine throw persists failed run');

  const invalidService = new CanonicalReasoningBoundaryService(
    new StubAssembler(assemblyResult) as never,
    { evaluate: () => ({ bad: true } as never) },
    { engineName: 'mock-engine', reasoningVersion: 'r1', scoringVersion: 's1' },
    repo
  );
  const invalid = await invalidService.executeAssetWindow({ asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-04-22T11:00:00.000Z' });
  assert(invalid.report.status === 'failed', 'invalid cognition output persists failed run');

  const failingSnapshotRepo = new MemoryReasoningPersistenceRepository(repo.runRepository, {
    ...repo.snapshotRepository,
    saveCognitionSnapshot: async () => {
      throw new Error('snap fail');
    }
  });
  const partialService = new CanonicalReasoningBoundaryService(
    new StubAssembler(assemblyResult) as never,
    { evaluate: () => buildCanonicalCognitionStateFixture() },
    { engineName: 'mock-engine', reasoningVersion: 'r1', scoringVersion: 's1' },
    failingSnapshotRepo
  );
  const partial = await partialService.executeAssetWindow({ asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-04-22T11:00:00.000Z' });
  assert(partial.report.status === 'partial_success' && partial.cognition !== null, 'snapshot persistence failure returns partial_success with cognition');

  const defaultEngineRepo = new MemoryReasoningPersistenceRepository();
  const defaultEngineService = createCanonicalReasoningBoundaryService({
    assembler: new StubAssembler(assemblyResult) as never,
    persistence: defaultEngineRepo
  });
  const defaultExecution = await defaultEngineService.executeAssetWindow({ asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-04-22T11:00:00.000Z' });
  assert(defaultExecution.cognition !== null, 'default boundary factory should execute with deterministic engine');
  assert(defaultExecution.report.engineName === DETERMINISTIC_REASONING_ENGINE_NAME, 'boundary should use deterministic engine metadata by default');

  const stableRepo = new MemoryReasoningPersistenceRepository();
  const stableService = createCanonicalReasoningBoundaryService({
    assembler: new StubAssembler(assemblyResult) as never,
    persistence: stableRepo
  });
  const stableRun1 = await stableService.executeAssetWindow({ asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-04-22T11:00:00.000Z' });
  const stableRun2 = await stableService.executeAssetWindow({ asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-04-22T11:00:00.000Z' });
  assert(stableRun1.cognition !== null && stableRun2.cognition !== null, 'stable payload test requires cognition output');
  assert(JSON.stringify(stableRun1.cognition) === JSON.stringify(stableRun2.cognition), 'same assembled input should persist stable cognition payload');
}
