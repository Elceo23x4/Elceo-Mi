import { runReasoningTests } from './reasoning.test.js';
import { runEvidenceProjectionTests } from './evidence-projection.test.js';
import { runSourceSelectorTests } from './source-selector.test.js';
import { runInputAssemblerTests } from './input-assembler.test.js';
import { runPersistenceReplayTests } from './persistence-replay.test.js';
import { runCanonicalReasoningBoundaryTests } from './canonical-reasoning-boundary.test.js';

async function run(): Promise<void> {
  runReasoningTests();
  runEvidenceProjectionTests();
  await runSourceSelectorTests();
  await runInputAssemblerTests();
  await runPersistenceReplayTests();
  await runCanonicalReasoningBoundaryTests();
  console.log('reasoning runtime contract tests passed');
}

void run();
