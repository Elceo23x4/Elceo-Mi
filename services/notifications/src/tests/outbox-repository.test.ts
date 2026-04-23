import { MemoryNotificationOutboxAttemptRepository, MemoryNotificationOutboxRepository } from '../persistence/memory-notification-repository.js';
import type { NotificationOutboxRecord } from '../delivery/outbox-contracts.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

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

  await outboxRepo.stageOutbox(buildOutbox('o2', '2026-01-15T10:10:00.000Z', '2026-01-15T10:00:02.000Z'));
  await outboxRepo.stageOutbox(buildOutbox('o1', '2026-01-15T10:05:00.000Z', '2026-01-15T10:00:01.000Z'));
  await outboxRepo.stageOutbox(buildOutbox('o1', '2026-01-15T10:05:00.000Z', '2026-01-15T10:00:01.000Z'));

  const due = await outboxRepo.listDueOutboxItems('2026-01-15T10:10:00.000Z', 10);
  assert(due[0]?.outboxId === 'o1' && due[1]?.outboxId === 'o2', 'due list ordering should be availableAt, createdAt, outboxId asc');

  await outboxRepo.markDispatching('o1', '2026-01-15T10:11:00.000Z');
  await outboxRepo.markFailed('o1', '2026-01-15T10:11:00.000Z', '2026-01-15T10:16:00.000Z', 'err', 'err');
  const failed = await outboxRepo.getOutboxById('o1');
  assert(failed?.status === 'failed' && failed.attemptCount === 1, 'markFailed should set failed and increment attempt count');

  await outboxRepo.markDelivered('o1', '2026-01-15T10:17:00.000Z');
  const delivered = await outboxRepo.getOutboxById('o1');
  assert(delivered?.status === 'delivered', 'markDelivered should set delivered');

  await outboxRepo.markDead('o2', '2026-01-15T10:20:00.000Z', 'dead', 'dead');
  const dead = await outboxRepo.getOutboxById('o2');
  assert(dead?.status === 'dead', 'markDead should set dead');

  await attemptRepo.saveAttempt({
    attemptId: 'a1',
    outboxId: 'o1',
    channel: 'in_app',
    attemptedAt: '2026-01-15T10:11:00.000Z',
    status: 'failure',
    errorCode: 'err',
    errorMessage: 'err',
    responseMetaJson: null
  });
  assert((await attemptRepo.listAttemptsForOutbox('o1')).length === 1, 'attempt repository save/list should work');
}
