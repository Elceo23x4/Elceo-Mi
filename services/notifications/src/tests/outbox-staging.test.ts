import {
  MemoryNotificationDecisionRepository,
  MemoryNotificationOutboxAttemptRepository,
  MemoryNotificationOutboxRepository,
  MemoryNotificationSubscriptionRepository,
  MemoryNotificationTargetRepository
} from '../persistence/memory-notification-repository.js';
import { stageNotificationDeliveryForDecision } from '../delivery/staging-service.js';
import { buildDecision, buildDecisionRecord } from './test-fixtures.js';

const assert = (condition: boolean, message: string): void => { if (!condition) throw new Error(message); };

export async function runOutboxStagingTests(): Promise<void> {
  const repos = {
    decisionRepository: new MemoryNotificationDecisionRepository(),
    outboxRepository: new MemoryNotificationOutboxRepository(),
    outboxAttemptRepository: new MemoryNotificationOutboxAttemptRepository(),
    targetRepository: new MemoryNotificationTargetRepository(),
    subscriptionRepository: new MemoryNotificationSubscriptionRepository()
  };

  await repos.subscriptionRepository.saveSubscription({ subscriptionId: 'sub-1', subjectKind: 'user', subjectId: 'u-1', channel: 'in_app', asset: '*', timeframe: '*', ruleKey: '*', enabled: true, minMaterialityScore: null, createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z' });
  await repos.targetRepository.saveTarget({ targetId: 'target-1', subjectKind: 'user', subjectId: 'u-1', channel: 'in_app', targetKind: 'in_app_user', status: 'active', label: null, addressJson: '{"userId":"u-1"}', createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z', verifiedAt: null });

  const decision = buildDecision({ channels: ['in_app'] });
  const record = buildDecisionRecord({ decisionJson: JSON.stringify(decision), channelsJson: JSON.stringify(decision.channels) });
  const report = await stageNotificationDeliveryForDecision(record, decision, repos, '2026-01-15T10:05:00.000Z');
  assert(report.stagedOutboxCount === 1, 'stages one outbox per matched target/channel');

  const second = await stageNotificationDeliveryForDecision(record, decision, repos, '2026-01-15T10:05:00.000Z');
  assert(second.stagedOutboxCount === 1, 'repeat stage remains idempotent');
  assert((await repos.outboxRepository.listOutboxForDecision(record.decisionId)).length === 1, 'repeated stage must not duplicate rows');

  const noSub = await stageNotificationDeliveryForDecision(record, decision, { ...repos, subscriptionRepository: new MemoryNotificationSubscriptionRepository() }, '2026-01-15T10:05:00.000Z');
  assert(noSub.skipped && noSub.skipReason === 'no_matching_subscriptions', 'no sub match should skip with reason');
}
