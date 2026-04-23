import { runMaterialChangeTests } from './material-change.test.js';
import { runCooldownTests } from './cooldown.test.js';
import { runMessageBuilderTests } from './message-builder.test.js';
import { runDecisionEngineTests } from './decision-engine.test.js';
import { runPersistenceReplayTests } from './persistence-replay.test.js';
import { runCanonicalNotificationPolicyBoundaryTests } from './canonical-notification-policy-boundary.test.js';

async function run(): Promise<void> {
  runMaterialChangeTests();
  runCooldownTests();
  runMessageBuilderTests();
  await runDecisionEngineTests();
  await runPersistenceReplayTests();
  await runCanonicalNotificationPolicyBoundaryTests();
  console.log('notifications runtime contract tests passed');
}

void run();
