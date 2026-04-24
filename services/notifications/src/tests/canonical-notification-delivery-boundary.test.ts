import { CanonicalNotificationDeliveryBoundaryService } from '../runtime/canonical-notification-delivery-boundary.js';
import {
  MemoryNotificationDecisionRepository,
  MemoryNotificationInboxRepository,
  MemoryNotificationOutboxAttemptRepository,
  MemoryNotificationOutboxRepository,
  MemoryNotificationSubscriptionRepository,
  MemoryNotificationTargetRepository,
  MemoryNotificationVerificationRepository
} from '../persistence/memory-notification-repository.js';
import { createNotificationDeliveryTransport } from '../delivery/transport.js';
import { buildDecision, buildDecisionRecord, buildReasoningRun } from './test-fixtures.js';

const assert = (condition: boolean, message: string): void => { if (!condition) throw new Error(message); };

export async function runCanonicalNotificationDeliveryBoundaryTests(): Promise<void> {
  const decisionRepository = new MemoryNotificationDecisionRepository();
  const outboxRepository = new MemoryNotificationOutboxRepository();
  const outboxAttemptRepository = new MemoryNotificationOutboxAttemptRepository();
  const targetRepository = new MemoryNotificationTargetRepository();
  const subscriptionRepository = new MemoryNotificationSubscriptionRepository();
  const inboxRepository = new MemoryNotificationInboxRepository();
  const verificationRepository = new MemoryNotificationVerificationRepository();

  await subscriptionRepository.saveSubscription({ subscriptionId: 'sub-1', subjectKind: 'user', subjectId: 'u-1', channel: 'in_app', asset: '*', timeframe: '*', ruleKey: '*', enabled: true, minMaterialityScore: null, createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z' });
  await targetRepository.saveTarget({ targetId: 'target-1', subjectKind: 'user', subjectId: 'u-1', channel: 'in_app', targetKind: 'in_app_user', status: 'active', label: null, addressJson: '{}', createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z', verifiedAt: null });

  const service = new CanonicalNotificationDeliveryBoundaryService({
    decisionRepository,
    outboxRepository,
    outboxAttemptRepository,
    targetRepository,
    subscriptionRepository,
    inboxRepository,
    verificationRepository,
    runRepository: { getLatestReasoningRunForAssetTimeframe: async () => buildReasoningRun(), getReasoningRunById: async () => buildReasoningRun(), listRecentReasoningRuns: async () => [], saveReasoningRun: async () => {} },
    snapshotRepository: { getLatestSnapshotForAssetTimeframe: async () => null, getSnapshotById: async () => null, getSnapshotByReasoningRunId: async () => null, saveCognitionSnapshot: async () => {} },
    driftRepository: { getDriftById: async () => null, getLatestDriftForAssetTimeframe: async () => null, listRecentDrifts: async () => [], saveDriftRecord: async () => {} }
  }, createNotificationDeliveryTransport({}, { inboxRepository }));

  const decision = buildDecision({ channels: ['in_app'] });
  const record = buildDecisionRecord({ decisionJson: JSON.stringify(decision), channelsJson: JSON.stringify(decision.channels) });
  await decisionRepository.saveDecision(record);

  assert((await service.stageForDecision(record.decisionId, '2026-01-15T10:05:00.000Z'))?.record.decisionId === record.decisionId, 'stageForDecision works');
  assert((await service.stageForReasoningRun(record.reasoningRunId ?? 'run-1', '2026-01-15T10:06:00.000Z')).notifyingDecisionCount >= 1, 'stageForReasoningRun works');
  assert((await service.dispatchDue('2026-01-15T10:07:00.000Z', 10)).deliveredCount >= 1, 'dispatchDue works');

  const outboxes = await outboxRepository.listOutboxForDecision(record.decisionId);
  assert((await service.replayDeliveryByOutboxId(outboxes[0]!.outboxId))?.outbox.decisionId === record.decisionId, 'replay by outbox id works');
  assert((await service.replayDeliveryByDecision(record.decisionId)).length === 1, 'replay by decision works');
  assert((await service.listInboxForTarget('target-1')).length >= 1, 'listInboxForTarget works');
}
