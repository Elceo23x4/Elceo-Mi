import { CanonicalNotificationManagementBoundaryService } from '../runtime/canonical-notification-management-boundary.js';
import {
  MemoryNotificationDecisionRepository,
  MemoryNotificationInboxRepository,
  MemoryNotificationOutboxAttemptRepository,
  MemoryNotificationOutboxRepository,
  MemoryNotificationSubscriptionRepository,
  MemoryNotificationTargetRepository
} from '../persistence/memory-notification-repository.js';

const assert = (condition: boolean, message: string): void => { if (!condition) throw new Error(message); };

export async function runCanonicalNotificationManagementBoundaryTests(): Promise<void> {
  const boundary = new CanonicalNotificationManagementBoundaryService({
    runRepository: { getRunById: async () => null } as never,
    snapshotRepository: { getSnapshotById: async () => null } as never,
    driftRepository: { getDriftById: async () => null } as never,
    decisionRepository: new MemoryNotificationDecisionRepository(),
    outboxRepository: new MemoryNotificationOutboxRepository(),
    outboxAttemptRepository: new MemoryNotificationOutboxAttemptRepository(),
    targetRepository: new MemoryNotificationTargetRepository(),
    subscriptionRepository: new MemoryNotificationSubscriptionRepository(),
    inboxRepository: new MemoryNotificationInboxRepository()
  });

  const target = await boundary.registerOrUpdateTarget({ subjectKind: 'user', subjectId: 'u-b', channel: 'in_app', targetKind: 'in_app_user', addressJson: '{"userId":"u-b"}' }, '2026-01-15T10:00:00.000Z');
  await boundary.registerOrUpdateSubscription({ subjectKind: 'user', subjectId: 'u-b', channel: 'in_app', assetScope: '*', timeframeScope: '*', ruleKeyScope: '*', enabled: true }, '2026-01-15T10:00:01.000Z');

  await boundary.markInboxRead('missing', '2026-01-15T10:00:02.000Z');
  await boundary.archiveInboxItem('missing', '2026-01-15T10:00:03.000Z');
  await boundary.unarchiveInboxItem('missing');

  const inbox = await boundary.listInbox({ subjectKind: 'user', subjectId: 'u-b' });
  assert(Array.isArray(inbox), 'boundary listInbox should return array');

  const targets = await boundary.listTargetsForSubjectDetailed('user', 'u-b');
  assert(targets.length === 1 && targets[0]?.targetId === target.targetId, 'boundary target listing should include registered target');

  const summary = await boundary.getNotificationOperationalSummaryForSubject('user', 'u-b');
  assert(summary.subjectTargetCount === 1, 'boundary summary should reflect persisted targets');

  const health = await boundary.getNotificationDeliveryHealthSummary('2026-01-15T10:00:04.000Z', 24);
  assert(health.delivered === 0 && health.failed === 0, 'boundary health summary should execute');
}
