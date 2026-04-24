import { runMaterialChangeTests } from './material-change.test.js';
import { runCooldownTests } from './cooldown.test.js';
import { runMessageBuilderTests } from './message-builder.test.js';
import { runDecisionEngineTests } from './decision-engine.test.js';
import { runPersistenceReplayTests } from './persistence-replay.test.js';
import { runCanonicalNotificationPolicyBoundaryTests } from './canonical-notification-policy-boundary.test.js';
import { runTransportTests } from './transport.test.js';
import { runOutboxStagingTests } from './outbox-staging.test.js';
import { runOutboxRepositoryTests } from './outbox-repository.test.js';
import { runOutboxDispatcherHardeningTests, runOutboxDispatcherTests } from './outbox-dispatcher.test.js';
import { runReplayDeliveryTests } from './replay-delivery.test.js';
import { runCanonicalNotificationDeliveryBoundaryTests } from './canonical-notification-delivery-boundary.test.js';
import { runSubscriptionMatcherTests } from './subscription-matcher.test.js';
import { runTargetResolverTests } from './target-resolver.test.js';
import { runInAppDeliveryTests } from './in-app-delivery.test.js';
import { runNotificationManagementKeyTests } from './notification-management-keys.test.js';
import { runNotificationManagementServiceTests } from './notification-management-services.test.js';
import { runCanonicalNotificationManagementBoundaryTests } from './canonical-notification-management-boundary.test.js';
import { runCanonicalNotificationVerificationBoundaryTests } from './canonical-notification-verification-boundary.test.js';
import { runVerificationProviderTests } from './verification-provider.test.js';
import { runNotificationOrchestrationRuntimeTests } from './notification-orchestration-runtime.test.js';

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
  await runOutboxDispatcherHardeningTests();
  await runReplayDeliveryTests();
  await runCanonicalNotificationDeliveryBoundaryTests();
  await runSubscriptionMatcherTests();
  await runTargetResolverTests();
  await runInAppDeliveryTests();
  runNotificationManagementKeyTests();
  await runNotificationManagementServiceTests();
  await runCanonicalNotificationManagementBoundaryTests();
  await runCanonicalNotificationVerificationBoundaryTests();
  await runVerificationProviderTests();
  await runNotificationOrchestrationRuntimeTests();
  console.log('notifications runtime contract tests passed');
}

void run();
