import { deserializeNotificationDecision } from '../persistence/serialization';
import type { NotificationDeliveryRuntimeRepositories, NotificationDecisionReplayBundle, PersistedNotificationDecisionRecord } from '../persistence/contracts';
import { dispatchDueNotificationOutbox, type NotificationOutboxDispatchReport } from '../delivery/outbox-dispatcher';
import { getNotificationOutboxReplayById, listInboxReplayForDecision, listNotificationOutboxReplayForDecision } from '../delivery/replay-delivery';
import { stageNotificationDeliveryForDecision } from '../delivery/staging-service';
import type { NotificationDeliveryTransport } from '../delivery/transport';
import type { NotificationOutboxReplayBundle } from '../delivery/outbox-contracts';
import type { NotificationInboxRecord } from '@elceo/types';
import type { NotificationDeliveryStagingAggregateReport } from '../orchestration/contracts';
import { stageDeliveriesForReasoningRun } from '../orchestration/staging-aggregator';

export class CanonicalNotificationDeliveryBoundaryService {
  constructor(private readonly repositories: NotificationDeliveryRuntimeRepositories, private readonly transport: NotificationDeliveryTransport) {}

  async stageForReasoningRun(reasoningRunId: string, stagedAt?: string): Promise<NotificationDeliveryStagingAggregateReport> {
    return stageDeliveriesForReasoningRun(this.repositories, reasoningRunId, stagedAt);
  }

  async stageForDecision(decisionId: string, stagedAt?: string): Promise<NotificationDecisionReplayBundle | null> {
    const record = await this.repositories.decisionRepository.getDecisionById(decisionId); if (!record) return null;
    await stageNotificationDeliveryForDecision(record, deserializeNotificationDecision(record.decisionJson), this.repositories, stagedAt ?? new Date().toISOString());
    return { record, decision: deserializeNotificationDecision(record.decisionJson) };
  }

  async dispatchDue(asOf?: string, limit = 100): Promise<NotificationOutboxDispatchReport> { return dispatchDueNotificationOutbox(asOf ?? new Date().toISOString(), limit, this.repositories, this.transport); }
  async replayDeliveryByOutboxId(outboxId: string): Promise<NotificationOutboxReplayBundle | null> { return getNotificationOutboxReplayById(outboxId, this.repositories.outboxRepository, this.repositories.outboxAttemptRepository, this.repositories.inboxRepository); }
  async replayDeliveryByDecision(decisionId: string): Promise<NotificationOutboxReplayBundle[]> { return listNotificationOutboxReplayForDecision(decisionId, this.repositories.outboxRepository, this.repositories.outboxAttemptRepository); }
  async listInboxForTarget(targetId: string, limit?: number): Promise<NotificationInboxRecord[]> { return this.repositories.inboxRepository.listInboxForTarget(targetId, limit); }
  async listInboxForDecision(decisionId: string): Promise<NotificationInboxRecord[]> { return listInboxReplayForDecision(decisionId, this.repositories.inboxRepository); }
  async stageFromDecisionRecord(record: PersistedNotificationDecisionRecord, stagedAt?: string): Promise<void> { await stageNotificationDeliveryForDecision(record, deserializeNotificationDecision(record.decisionJson), this.repositories, stagedAt ?? new Date().toISOString()); }
}
