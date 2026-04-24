import type { NotificationChannel } from '@elceo/types';
import type { NotificationDeliveryRuntimeRepositories } from '../persistence/contracts';
import { processProviderEvent } from '../feedback/feedback-service';
import { getFeedbackDeliveryReceiptReplayById, getFeedbackProviderEventReplayById, getFeedbackTargetHealthReplay, listFeedbackProviderEventReplayForTarget, listFeedbackReceiptReplayForTarget } from '../feedback/replay';
import { NotificationOperationalSummaryService } from '../management/summary-service';

export class CanonicalNotificationFeedbackBoundaryService {
  private readonly summaryService: NotificationOperationalSummaryService;
  constructor(private readonly repositories: NotificationDeliveryRuntimeRepositories, env: Record<string, string | undefined> = {}) {
    this.summaryService = new NotificationOperationalSummaryService(repositories, env);
  }

  processProviderEvent(providerKind: string, channel: NotificationChannel, rawEvent: unknown, receivedAt?: string) {
    if (!this.repositories.providerEventRepository || !this.repositories.receiptRepository || !this.repositories.targetHealthRepository) {
      throw new Error('missing_feedback_repositories');
    }
    return processProviderEvent({ providerKind, channel, rawEvent, ...(receivedAt ? { receivedAt } : {}) }, {
      providerEventRepository: this.repositories.providerEventRepository,
      receiptRepository: this.repositories.receiptRepository,
      targetHealthRepository: this.repositories.targetHealthRepository,
      targetRepository: this.repositories.targetRepository,
      outboxRepository: this.repositories.outboxRepository,
      outboxAttemptRepository: this.repositories.outboxAttemptRepository,
      decisionRepository: this.repositories.decisionRepository
    });
  }

  getProviderEventReplayById(providerEventId: string) { if (!this.repositories.providerEventRepository) throw new Error('missing_feedback_repositories'); return getFeedbackProviderEventReplayById(providerEventId, this.repositories.providerEventRepository); }
  getDeliveryReceiptReplayById(receiptId: string) { if (!this.repositories.receiptRepository) throw new Error('missing_feedback_repositories'); return getFeedbackDeliveryReceiptReplayById(receiptId, this.repositories.receiptRepository); }
  listReceiptReplayForTarget(targetId: string, limit?: number) { if (!this.repositories.receiptRepository) throw new Error('missing_feedback_repositories'); return listFeedbackReceiptReplayForTarget(targetId, this.repositories.receiptRepository, limit); }
  listProviderEventReplayForTarget(targetId: string, limit?: number) { if (!this.repositories.providerEventRepository) throw new Error('missing_feedback_repositories'); return listFeedbackProviderEventReplayForTarget(targetId, this.repositories.providerEventRepository, limit); }
  getTargetHealthReplay(targetId: string) { if (!this.repositories.targetHealthRepository) throw new Error('missing_feedback_repositories'); return getFeedbackTargetHealthReplay(targetId, this.repositories.targetHealthRepository); }
  getNotificationFeedbackSummary(asOfIso?: string, lookbackHours?: number) { return this.summaryService.getNotificationFeedbackSummary(asOfIso, lookbackHours); }
  listTargetsWithDegradedHealth(limit?: number) { return this.summaryService.listTargetsWithDegradedHealth(limit); }
  listRecentCriticalReceipts(limit?: number) { return this.summaryService.listRecentCriticalReceipts(limit); }
}
