import { runMaterialChangeTests } from './material-change.test.js';
import { runCooldownTests } from './cooldown.test.js';
import { runMessageBuilderTests } from './message-builder.test.js';
import { runDecisionEngineTests } from './decision-engine.test.js';
import { runPersistenceReplayTests } from './persistence-replay.test.js';
import { runCanonicalNotificationPolicyBoundaryTests } from './canonical-notification-policy-boundary.test.js';
import { runTransportTests } from './transport.test.js';
import { runOutboxStagingTests } from './outbox-staging.test.js';
import { runOutboxRepositoryTests } from './outbox-repository.test.js';
import { runOutboxDispatcherTests } from './outbox-dispatcher.test.js';
import { runReplayDeliveryTests } from './replay-delivery.test.js';
import { runCanonicalNotificationDeliveryBoundaryTests } from './canonical-notification-delivery-boundary.test.js';

async function run(): Promise<void> {
  runMaterialChangeTests();
  runCooldownTests();
  runMessageBuilderTests();
  await runDecisionEngineTests();
  await runPersistenceReplayTests();
  await runCanonicalNotificationPolicyBoundaryTests();
  await runTransportTests();
  await runOutboxStagingTests();
  await runOutboxRepositoryTests();
  await runOutboxDispatcherTests();
  await runReplayDeliveryTests();
  await runCanonicalNotificationDeliveryBoundaryTests();
  console.log('notifications runtime contract tests passed');
}

void run();
