import { buildDecision, buildDecisionRecord } from './test-fixtures.js';
import {
  MemoryNotificationDecisionRepository,
  MemoryNotificationOutboxAttemptRepository,
  MemoryNotificationOutboxRepository,
  MemoryNotificationSubscriptionRepository,
  MemoryNotificationTargetRepository,
  MemoryNotificationInboxRepository
} from '../persistence/memory-notification-repository.js';
import { stageNotificationDeliveryForDecision } from '../delivery/staging-service.js';
import { deserializeTargetAwareNotificationPayload, getNotificationOutboxReplayById, getNotificationOutboxReplayByKey, listInboxReplayForDecision, listNotificationOutboxReplayForDecision } from '../delivery/replay-delivery.js';

const assert = (condition: boolean, message: string): void => { if (!condition) throw new Error(message); };

export async function runReplayDeliveryTests(): Promise<void> {
  const repos = {
    decisionRepository: new MemoryNotificationDecisionRepository(),
    outboxRepository: new MemoryNotificationOutboxRepository(),
    outboxAttemptRepository: new MemoryNotificationOutboxAttemptRepository(),
    subscriptionRepository: new MemoryNotificationSubscriptionRepository(),
    targetRepository: new MemoryNotificationTargetRepository(),
    inboxRepository: new MemoryNotificationInboxRepository()
  };
  await repos.subscriptionRepository.saveSubscription({ subscriptionId: 'sub-1', subjectKind: 'user', subjectId: 'u-1', channel: 'in_app', asset: '*', timeframe: '*', ruleKey: '*', enabled: true, minMaterialityScore: null, createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z' });
  await repos.targetRepository.saveTarget({ targetId: 'target-1', subjectKind: 'user', subjectId: 'u-1', channel: 'in_app', targetKind: 'in_app_user', status: 'active', label: null, addressJson: '{}', createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z', verifiedAt: null });

  const decision = buildDecision({ channels: ['in_app'] });
  const record = buildDecisionRecord({ decisionJson: JSON.stringify(decision), channelsJson: JSON.stringify(decision.channels) });
  await stageNotificationDeliveryForDecision(record, decision, repos, '2026-01-15T10:05:00.000Z');

  const first = (await repos.outboxRepository.listOutboxForDecision(record.decisionId))[0]!;
  assert((await getNotificationOutboxReplayById(first.outboxId, repos.outboxRepository, repos.outboxAttemptRepository))?.outbox.outboxId === first.outboxId, 'replay by id works');
  assert((await getNotificationOutboxReplayByKey(first.outboxKey, repos.outboxRepository, repos.outboxAttemptRepository))?.outbox.outboxKey === first.outboxKey, 'replay by key works');
  assert((await listNotificationOutboxReplayForDecision(record.decisionId, repos.outboxRepository, repos.outboxAttemptRepository)).length === 1, 'replay by decision returns all rows');

  await repos.inboxRepository.saveInboxRecord({ inboxId: 'inbox|decision-1|target-1', targetId: 'target-1', decisionId: 'decision-1', decisionKey: 'k', asset: 'XAU/USD', timeframe: 'H1', ruleKey: 'critical_drift', headline: 'h', body: 'b', createdAt: '2026-01-15T10:00:00.000Z', readAt: null, archivedAt: null, payloadJson: '{}' });
  assert((await listInboxReplayForDecision('decision-1', repos.inboxRepository)).length === 1, 'inbox replay by decision works');

  let malformedFailed = false;
  try { deserializeTargetAwareNotificationPayload('{bad json'); } catch { malformedFailed = true; }
  assert(malformedFailed, 'malformed target payload should fail deterministically');
}
