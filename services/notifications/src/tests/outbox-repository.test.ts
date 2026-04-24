import {
  MemoryNotificationInboxRepository,
  MemoryNotificationOutboxAttemptRepository,
  MemoryNotificationOutboxRepository,
  MemoryNotificationSubscriptionRepository,
  MemoryNotificationTargetRepository
} from '../persistence/memory-notification-repository.js';
import type { NotificationOutboxRecord } from '../delivery/outbox-contracts.js';

const assert = (condition: boolean, message: string): void => { if (!condition) throw new Error(message); };

function buildOutbox(outboxId: string, availableAt: string, createdAt: string): NotificationOutboxRecord {
  return {
    outboxId,
    outboxKey: outboxId,
    decisionId: 'decision-1',
    decisionKey: 'decision-key',
    asset: 'XAU/USD',
    timeframe: 'H1',
    ruleKey: 'critical_drift',
    channel: 'in_app',
    targetId: 'target-1',
    subjectKind: 'user',
    subjectId: 'u-1',
    targetKey: 'target|target-1',
    deliveryAddressJson: '{"userId":"u-1"}',
    status: 'staged',
    availableAt,
    lastAttemptAt: null,
    deliveredAt: null,
    deadAt: null,
    attemptCount: 0,
    lastErrorCode: null,
    lastErrorMessage: null,
    payloadJson: '{}',
    createdAt,
    updatedAt: createdAt
  };
}

export async function runOutboxRepositoryTests(): Promise<void> {
  const outboxRepo = new MemoryNotificationOutboxRepository();
  const attemptRepo = new MemoryNotificationOutboxAttemptRepository();
  const targetRepo = new MemoryNotificationTargetRepository();
  const subRepo = new MemoryNotificationSubscriptionRepository();
  const inboxRepo = new MemoryNotificationInboxRepository();

  await targetRepo.saveTarget({ targetId: 'target-1', subjectKind: 'user', subjectId: 'u-1', channel: 'in_app', targetKind: 'in_app_user', status: 'active', label: null, addressJson: '{}', createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z', verifiedAt: null });
  await subRepo.saveSubscription({ subscriptionId: 'sub-1', subjectKind: 'user', subjectId: 'u-1', channel: 'in_app', asset: '*', timeframe: '*', ruleKey: '*', enabled: true, minMaterialityScore: null, createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z' });
  await inboxRepo.saveInboxRecord({ inboxId: 'inbox-1', targetId: 'target-1', decisionId: 'decision-1', decisionKey: 'decision-key', asset: 'XAU/USD', timeframe: 'H1', ruleKey: 'critical_drift', headline: 'h', body: 'b', createdAt: '2026-01-15T10:00:00.000Z', readAt: null, archivedAt: null, payloadJson: '{}' });
  assert((await targetRepo.listTargetsForSubject('user', 'u-1')).length === 1, 'target repo save/get/list works');
  assert((await subRepo.listSubscriptionsForSubject('user', 'u-1')).length === 1, 'subscription repo save/get/list works');
  assert((await inboxRepo.listInboxForDecision('decision-1')).length === 1, 'inbox repo save/get/list works');

  await outboxRepo.stageOutbox(buildOutbox('o2', '2026-01-15T10:10:00.000Z', '2026-01-15T10:00:02.000Z'));
  await outboxRepo.stageOutbox(buildOutbox('o1', '2026-01-15T10:05:00.000Z', '2026-01-15T10:00:01.000Z'));
  await outboxRepo.stageOutbox(buildOutbox('o1', '2026-01-15T10:05:00.000Z', '2026-01-15T10:00:01.000Z'));
  const due = await outboxRepo.listDueOutboxItems('2026-01-15T10:10:00.000Z', 10);
  assert(due[0]?.outboxId === 'o1' && due[1]?.outboxId === 'o2', 'due ordering remains deterministic');

  await outboxRepo.markDispatching('o1', '2026-01-15T10:11:00.000Z');
  await outboxRepo.markFailed('o1', '2026-01-15T10:11:00.000Z', '2026-01-15T10:16:00.000Z', 'err', 'err');
  assert((await outboxRepo.getOutboxById('o1'))?.status === 'failed', 'failed transition persists');

  await outboxRepo.markDelivered('o1', '2026-01-15T10:17:00.000Z');
  await outboxRepo.markDead('o2', '2026-01-15T10:20:00.000Z', 'dead', 'dead');
  assert((await outboxRepo.getOutboxById('o1'))?.status === 'delivered', 'delivered transition persists');
  assert((await outboxRepo.getOutboxById('o2'))?.status === 'dead', 'dead transition persists');

  await attemptRepo.saveAttempt({ attemptId: 'a1', outboxId: 'o1', channel: 'in_app', attemptedAt: '2026-01-15T10:11:00.000Z', status: 'failure', errorCode: 'err', errorMessage: 'err', responseMetaJson: null });
  assert((await attemptRepo.listAttemptsForOutbox('o1')).length === 1, 'attempt save/list works');
}
