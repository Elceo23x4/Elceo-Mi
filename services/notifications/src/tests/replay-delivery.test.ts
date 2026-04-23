import { buildDecision, buildDecisionRecord } from './test-fixtures.js';
import { MemoryNotificationDecisionRepository, MemoryNotificationOutboxAttemptRepository, MemoryNotificationOutboxRepository } from '../persistence/memory-notification-repository.js';
import { stageNotificationDeliveryForDecision } from '../delivery/staging-service.js';
import { getNotificationOutboxReplayById, getNotificationOutboxReplayByKey, listNotificationOutboxReplayForDecision } from '../delivery/replay-delivery.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export async function runReplayDeliveryTests(): Promise<void> {
  const repos = {
    decisionRepository: new MemoryNotificationDecisionRepository(),
    outboxRepository: new MemoryNotificationOutboxRepository(),
    outboxAttemptRepository: new MemoryNotificationOutboxAttemptRepository()
  };
  const decision = buildDecision();
  const record = buildDecisionRecord();
  await stageNotificationDeliveryForDecision(record, decision, repos, '2026-01-15T10:05:00.000Z');

  const outboxes = await repos.outboxRepository.listOutboxForDecision(record.decisionId);
  const first = outboxes[0]!;
  const replayById = await getNotificationOutboxReplayById(first.outboxId, repos.outboxRepository, repos.outboxAttemptRepository);
  assert(replayById?.outbox.outboxId === first.outboxId, 'replay by id should work');

  const replayByKey = await getNotificationOutboxReplayByKey(first.outboxKey, repos.outboxRepository, repos.outboxAttemptRepository);
  assert(replayByKey?.outbox.outboxKey === first.outboxKey, 'replay by key should work');

  const listed = await listNotificationOutboxReplayForDecision(record.decisionId, repos.outboxRepository, repos.outboxAttemptRepository);
  assert(listed.length === 3, 'replay by decision should return all channel outboxes');

  const bad = { ...first, outboxId: 'bad', outboxKey: 'bad', payloadJson: '{bad json', createdAt: '2026-01-15T10:05:00.000Z', updatedAt: '2026-01-15T10:05:00.000Z' };
  await repos.outboxRepository.stageOutbox(bad);
  let malformedFailed = false;
  try {
    await getNotificationOutboxReplayById('bad', repos.outboxRepository, repos.outboxAttemptRepository);
  } catch {
    malformedFailed = true;
  }
  assert(malformedFailed, 'malformed payload JSON should fail deterministically');
}
