import { CanonicalNotificationDeliveryBoundaryService } from '../runtime/canonical-notification-delivery-boundary.js';
import { MemoryNotificationDecisionRepository, MemoryNotificationOutboxAttemptRepository, MemoryNotificationOutboxRepository } from '../persistence/memory-notification-repository.js';
import { MemoryNotificationDeliveryTransport } from '../delivery/transport.js';
import { buildDecision, buildDecisionRecord } from './test-fixtures.js';
import { buildReasoningRun } from './test-fixtures.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export async function runCanonicalNotificationDeliveryBoundaryTests(): Promise<void> {
  const decisionRepository = new MemoryNotificationDecisionRepository();
  const outboxRepository = new MemoryNotificationOutboxRepository();
  const outboxAttemptRepository = new MemoryNotificationOutboxAttemptRepository();

  const service = new CanonicalNotificationDeliveryBoundaryService({
    decisionRepository,
    outboxRepository,
    outboxAttemptRepository,
    runRepository: { getLatestReasoningRunForAssetTimeframe: async () => buildReasoningRun(), getReasoningRunById: async () => buildReasoningRun(), listRecentReasoningRuns: async () => [], saveReasoningRun: async () => {} },
    snapshotRepository: { getLatestSnapshotForAssetTimeframe: async () => null, getSnapshotById: async () => null, getSnapshotByReasoningRunId: async () => null, saveCognitionSnapshot: async () => {} },
    driftRepository: { getDriftById: async () => null, getLatestDriftForAssetTimeframe: async () => null, listRecentDrifts: async () => [], saveDriftRecord: async () => {} }
  }, new MemoryNotificationDeliveryTransport());

  const decision = buildDecision();
  const record = buildDecisionRecord();
  await decisionRepository.saveDecision(record);

  const stagedSingle = await service.stageForDecision(record.decisionId, '2026-01-15T10:05:00.000Z');
  assert(stagedSingle?.record.decisionId === record.decisionId, 'stageForDecision should stage one decision');

  const stagedRun = await service.stageForReasoningRun(record.reasoningRunId ?? 'run-1', '2026-01-15T10:06:00.000Z');
  assert(stagedRun.notifyingDecisionCount >= 1, 'stageForReasoningRun should stage notifying decisions');

  const dispatch = await service.dispatchDue('2026-01-15T10:07:00.000Z', 10);
  assert(dispatch.deliveredCount >= 1, 'dispatchDue should deliver due outbox');

  const outboxes = await outboxRepository.listOutboxForDecision(record.decisionId);
  const replayOne = await service.replayDeliveryByOutboxId(outboxes[0]!.outboxId);
  assert(replayOne?.outbox.decisionId === record.decisionId, 'replayDeliveryByOutboxId should return bundle');

  const replayDecision = await service.replayDeliveryByDecision(record.decisionId);
  assert(replayDecision.length === decision.channels.length, 'replayDeliveryByDecision should return all channel outboxes');
}
