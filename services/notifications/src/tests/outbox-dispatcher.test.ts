import { dispatchDueNotificationOutbox } from '../delivery/outbox-dispatcher.js';
import { buildDecision, buildDecisionRecord } from './test-fixtures.js';
import { MemoryNotificationDecisionRepository, MemoryNotificationOutboxAttemptRepository, MemoryNotificationOutboxRepository } from '../persistence/memory-notification-repository.js';
import { stageNotificationDeliveryForDecision } from '../delivery/staging-service.js';
import { MemoryNotificationDeliveryTransport } from '../delivery/transport.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export async function runOutboxDispatcherTests(): Promise<void> {
  const repos = {
    decisionRepository: new MemoryNotificationDecisionRepository(),
    outboxRepository: new MemoryNotificationOutboxRepository(),
    outboxAttemptRepository: new MemoryNotificationOutboxAttemptRepository()
  };

  const decision = buildDecision();
  const record = buildDecisionRecord();
  await stageNotificationDeliveryForDecision(record, decision, repos, '2026-01-15T10:05:00.000Z');

  const successReport = await dispatchDueNotificationOutbox('2026-01-15T10:06:00.000Z', 10, repos, new MemoryNotificationDeliveryTransport());
  assert(successReport.deliveredCount === 3, 'successful dispatch should mark delivered');

  const retryRepos = {
    decisionRepository: new MemoryNotificationDecisionRepository(),
    outboxRepository: new MemoryNotificationOutboxRepository(),
    outboxAttemptRepository: new MemoryNotificationOutboxAttemptRepository()
  };
  await stageNotificationDeliveryForDecision(record, decision, retryRepos, '2026-01-15T11:00:00.000Z');
  const failingTransport = new MemoryNotificationDeliveryTransport({ in_app: { errorCode: 'x', errorMessage: 'x' }, push: { errorCode: 'x', errorMessage: 'x' }, email: { errorCode: 'x', errorMessage: 'x' } });

  const fail1 = await dispatchDueNotificationOutbox('2026-01-15T11:00:00.000Z', 10, retryRepos, failingTransport);
  assert(fail1.failedCount === 3, 'first failure should produce failed status');

  await dispatchDueNotificationOutbox('2026-01-15T12:30:00.000Z', 10, retryRepos, failingTransport);
  await dispatchDueNotificationOutbox('2026-01-15T13:30:00.000Z', 10, retryRepos, failingTransport);
  await dispatchDueNotificationOutbox('2026-01-15T14:30:00.000Z', 10, retryRepos, failingTransport);
  await dispatchDueNotificationOutbox('2026-01-15T15:30:00.000Z', 10, retryRepos, failingTransport);
  const outboxes = await retryRepos.outboxRepository.listOutboxForDecision(record.decisionId);
  assert(outboxes.every((item) => item.status === 'dead'), 'fifth failure should mark dead');
}
