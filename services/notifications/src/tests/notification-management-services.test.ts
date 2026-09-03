import { NotificationInboxManagementService } from '../management/inbox-service.js';
import { NotificationSubscriptionManagementService } from '../management/subscription-service.js';
import { NotificationOperationalSummaryService } from '../management/summary-service.js';
import { NotificationTargetManagementService } from '../management/target-service.js';
import {
  MemoryNotificationDecisionRepository,
  MemoryNotificationInboxRepository,
  MemoryNotificationOutboxRepository,
  MemoryNotificationSubscriptionRepository,
  MemoryNotificationTargetRepository
} from '../persistence/memory-notification-repository.js';

const assert = (condition: boolean, message: string): void => { if (!condition) throw new Error(message); };

export async function runNotificationManagementServiceTests(): Promise<void> {
  const targetRepository = new MemoryNotificationTargetRepository();
  const subscriptionRepository = new MemoryNotificationSubscriptionRepository();
  const inboxRepository = new MemoryNotificationInboxRepository();
  const outboxRepository = new MemoryNotificationOutboxRepository();
  const decisionRepository = new MemoryNotificationDecisionRepository();

  const targetService = new NotificationTargetManagementService(targetRepository);
  const subscriptionService = new NotificationSubscriptionManagementService(subscriptionRepository);
  const inboxService = new NotificationInboxManagementService(inboxRepository, targetRepository);
  const summaryService = new NotificationOperationalSummaryService({ targetRepository, subscriptionRepository, inboxRepository, outboxRepository, decisionRepository });

  const inApp = await targetService.registerOrUpdateTarget({ subjectKind: 'user', subjectId: 'u1', channel: 'in_app', targetKind: 'in_app_user', addressJson: '{"userId":"u1"}' }, '2026-01-15T10:00:00.000Z');
  assert(inApp.status === 'active' && inApp.verifiedAt !== null, 'in-app target should default active+verified');

  const email = await targetService.registerOrUpdateTarget({ subjectKind: 'user', subjectId: 'u1', channel: 'email', targetKind: 'email_address', addressJson: '{"email":"A@B.C"}' }, '2026-01-15T10:00:01.000Z');
  assert(email.status === 'unverified', 'email target should default to unverified');

  let blocked = false;
  try { await targetService.enableTargetForSubject('user', 'u1', email.targetId, '2026-01-15T10:00:02.000Z'); } catch { blocked = true; }
  assert(blocked, 'cannot activate unverified email target');

  await targetService.verifyTarget(email.targetId, '2026-01-15T10:00:03.000Z');
  const verifiedEmail = await targetRepository.getTargetById(email.targetId);
  assert(verifiedEmail?.status === 'active' && verifiedEmail.verifiedAt === '2026-01-15T10:00:03.000Z', 'verifyTarget should activate target');

  await targetService.disableTargetForSubject('user', 'u1', email.targetId, '2026-01-15T10:00:04.000Z');
  let foreignDenied = false;
  try { await targetService.disableTargetForSubject('user', 'USER_A', email.targetId, '2026-01-15T10:00:03.500Z'); } catch { foreignDenied = true; }
  assert(foreignDenied, 'USER_A cannot disable USER_B target');
  const disabledEmail = await targetRepository.getTargetById(email.targetId);
  assert(disabledEmail?.status === 'disabled' && disabledEmail.verifiedAt === '2026-01-15T10:00:03.000Z', 'disable should preserve verifiedAt');

  const repeat = await targetService.registerOrUpdateTarget({ subjectKind: 'user', subjectId: 'u1', channel: 'email', targetKind: 'email_address', addressJson: '{"email":" a@b.c "}', label: 'Primary' }, '2026-01-15T10:00:05.000Z');
  assert(repeat.targetId === email.targetId, 'idempotent target upsert should not duplicate rows');
  const emailB = await targetService.registerOrUpdateTarget({ subjectKind: 'user', subjectId: 'u1', channel: 'email', targetKind: 'email_address', addressJson: '{"email":"different@example.test"}' }, '2026-01-15T10:00:06.000Z');
  assert(emailB.targetId !== email.targetId && emailB.targetKey !== email.targetKey, 'different normalized email must have distinct identity');
  assert(emailB.status === 'unverified' && emailB.verifiedAt === null, 'email A verification must not carry to email B');
  const pushA = await targetService.registerOrUpdateTarget({ subjectKind: 'user', subjectId: 'u1', channel: 'push', targetKind: 'push_endpoint', addressJson: '{"endpoint":" https://push.example/a "}' }, '2026-01-15T10:00:07.000Z');
  await targetService.verifyTarget(pushA.targetId, '2026-01-15T10:00:08.000Z');
  const pushB = await targetService.registerOrUpdateTarget({ subjectKind: 'user', subjectId: 'u1', channel: 'push', targetKind: 'push_endpoint', addressJson: '{"endpoint":"https://push.example/b"}' }, '2026-01-15T10:00:09.000Z');
  assert(pushB.targetId !== pushA.targetId && pushB.status === 'unverified' && pushB.verifiedAt === null, 'push A verification must not carry to push B');

  const subA = await subscriptionService.registerOrUpdateSubscription({ subjectKind: 'user', subjectId: 'u1', channel: 'in_app', assetScope: '*', timeframeScope: '*', ruleKeyScope: '*', enabled: true }, '2026-01-15T10:00:00.000Z');
  const subB = await subscriptionService.registerOrUpdateSubscription({ subjectKind: 'user', subjectId: 'u1', channel: 'in_app', assetScope: '*', timeframeScope: '*', ruleKeyScope: '*', enabled: false }, '2026-01-15T10:00:01.000Z');
  assert(subA.subscriptionId === subB.subscriptionId && subB.enabled === false, 'subscription upsert by key must be idempotent and mutable');

  const subScoped = await subscriptionService.registerOrUpdateSubscription({ subjectKind: 'user', subjectId: 'u1', channel: 'in_app', assetScope: 'XAU/USD', timeframeScope: 'H1', ruleKeyScope: 'critical_drift', enabled: true }, '2026-01-15T10:00:02.000Z');
  assert(subScoped.subscriptionId !== subA.subscriptionId, 'identity-scope changes should create distinct subscription key rows');

  await subscriptionService.updateSubscriptionThreshold(subScoped.subscriptionId, 80, '2026-01-15T10:00:03.000Z');
  await subscriptionService.disableSubscription(subScoped.subscriptionId, '2026-01-15T10:00:04.000Z');
  await subscriptionService.enableSubscription(subScoped.subscriptionId, '2026-01-15T10:00:05.000Z');
  const updatedSub = await subscriptionRepository.getSubscriptionById(subScoped.subscriptionId);
  assert(updatedSub?.enabled === true && updatedSub.minMaterialityScore === 80, 'subscription lifecycle updates should persist');

  await inboxRepository.saveInboxRecord({ inboxId: 'i1', targetId: inApp.targetId, decisionId: 'd1', decisionKey: 'k1', asset: 'XAU/USD', timeframe: 'H1', ruleKey: 'critical_drift', headline: 'h1', body: 'b1', createdAt: '2026-01-15T10:10:00.000Z', readAt: null, archivedAt: null, payloadJson: '{}' });
  await inboxRepository.saveInboxRecord({ inboxId: 'i2', targetId: repeat.targetId, decisionId: 'd2', decisionKey: 'k2', asset: 'XAU/USD', timeframe: 'H1', ruleKey: 'major_drift', headline: 'h2', body: 'b2', createdAt: '2026-01-15T10:11:00.000Z', readAt: null, archivedAt: null, payloadJson: '{}' });

  const subjectInbox = await inboxService.listInbox({ subjectKind: 'user', subjectId: 'u1', includeArchived: false });
  assert(subjectInbox.length === 2 && subjectInbox[0]?.inboxId === 'i2', 'subject-level inbox aggregation must be ordered and include all targets');

  await inboxService.markRead('i1', '2026-01-15T10:12:00.000Z');
  await inboxService.markUnread('i1');
  await inboxService.archive('i2', '2026-01-15T10:13:00.000Z');
  const unreadOnly = await inboxService.listInbox({ subjectKind: 'user', subjectId: 'u1', unreadOnly: true, includeArchived: false });
  assert(unreadOnly.length === 1 && unreadOnly[0]?.inboxId === 'i1', 'inbox unread/archive filters should be deterministic');
  await inboxService.unarchive('i2');

  await outboxRepository.stageOutbox({ outboxId: 'o1', outboxKey: 'ok1', decisionId: 'd1', decisionKey: 'k1', asset: 'XAU/USD', timeframe: 'H1', ruleKey: 'critical_drift', channel: 'in_app', targetId: inApp.targetId, subjectKind: 'user', subjectId: 'u1', targetKey: inApp.targetKey ?? 'target|fallback', deliveryAddressJson: '{}', status: 'delivered', availableAt: '2026-01-15T10:00:00.000Z', lastAttemptAt: null, deliveredAt: '2026-01-15T10:01:00.000Z', deadAt: null, attemptCount: 1, lastErrorCode: null, lastErrorMessage: null, payloadJson: '{}', createdAt: '2026-01-15T10:01:00.000Z', updatedAt: '2026-01-15T10:01:00.000Z' });
  await outboxRepository.stageOutbox({ outboxId: 'o2', outboxKey: 'ok2', decisionId: 'd2', decisionKey: 'k2', asset: 'XAU/USD', timeframe: 'H1', ruleKey: 'major_drift', channel: 'email', targetId: repeat.targetId, subjectKind: 'user', subjectId: 'u1', targetKey: repeat.targetKey ?? 'target|fallback2', deliveryAddressJson: '{}', status: 'failed', availableAt: '2026-01-15T10:00:00.000Z', lastAttemptAt: null, deliveredAt: null, deadAt: null, attemptCount: 1, lastErrorCode: 'ERR', lastErrorMessage: 'x', payloadJson: '{}', createdAt: '2026-01-15T10:02:00.000Z', updatedAt: '2026-01-15T10:02:00.000Z' });

  const summary = await summaryService.getNotificationOperationalSummaryForSubject('user', 'u1');
  assert(summary.subjectTargetCount === 5 && summary.recentDeliveredCount === 1 && summary.recentFailedCount === 1, 'operational summary counts should be exact');

  const health = await summaryService.getNotificationDeliveryHealthSummary('2026-01-15T10:03:00.000Z', 2);
  assert(health.delivered === 1 && health.failed === 1, 'delivery health summary should count by status in lookback');
}
