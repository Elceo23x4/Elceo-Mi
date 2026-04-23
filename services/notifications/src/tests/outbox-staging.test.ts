import { MemoryNotificationDecisionRepository, MemoryNotificationOutboxAttemptRepository, MemoryNotificationOutboxRepository } from '../persistence/memory-notification-repository.js';
import { stageNotificationDeliveryForDecision } from '../delivery/staging-service.js';
import { buildDecision, buildDecisionRecord } from './test-fixtures.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export async function runOutboxStagingTests(): Promise<void> {
  const repos = {
    decisionRepository: new MemoryNotificationDecisionRepository(),
    outboxRepository: new MemoryNotificationOutboxRepository(),
    outboxAttemptRepository: new MemoryNotificationOutboxAttemptRepository()
  };

  const decision = buildDecision();
  const record = buildDecisionRecord();
  const report = await stageNotificationDeliveryForDecision(record, decision, repos, '2026-01-15T10:05:00.000Z');
  assert(report.stagedChannelCount === 3, 'should stage one outbox record per channel');
  assert(report.channels.join(',') === 'in_app,push,email', 'staging should preserve channel order');

  const second = await stageNotificationDeliveryForDecision(record, decision, repos, '2026-01-15T10:05:00.000Z');
  assert(second.stagedChannelCount === 3, 'repeat stage should still resolve channel ids idempotently');
  assert((await repos.outboxRepository.listOutboxForDecision(record.decisionId)).length === 3, 'repeated stage should not duplicate rows');

  const suppressedDecision = buildDecision({ shouldNotify: false, shouldFire: false, channels: [] });
  const suppressedRecord = buildDecisionRecord({ shouldNotify: false, decisionJson: JSON.stringify(suppressedDecision) });
  const suppressed = await stageNotificationDeliveryForDecision(suppressedRecord, suppressedDecision, repos, '2026-01-15T10:05:00.000Z');
  assert(suppressed.skipped === true && suppressed.stagedChannelCount === 0, 'shouldNotify false should stage nothing');
}
