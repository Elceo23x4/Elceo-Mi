import type { NotificationSubjectKind } from '@elceo/types';
import type { NotificationDeliveryRuntimeRepositories } from '../persistence/contracts';
import type { InboxListQuery, UpsertNotificationSubscriptionInput, UpsertNotificationTargetInput } from '../management/contracts';
import { NotificationInboxManagementService } from '../management/inbox-service';
import { NotificationOperationalSummaryService } from '../management/summary-service';
import { NotificationSubscriptionManagementService } from '../management/subscription-service';
import { NotificationTargetManagementService } from '../management/target-service';

export class CanonicalNotificationManagementBoundaryService {
  private readonly targetService: NotificationTargetManagementService;
  private readonly subscriptionService: NotificationSubscriptionManagementService;
  private readonly inboxService: NotificationInboxManagementService;
  private readonly summaryService: NotificationOperationalSummaryService;

  constructor(private readonly repositories: NotificationDeliveryRuntimeRepositories, private readonly env: Record<string, string | undefined> = {}) {
    this.targetService = new NotificationTargetManagementService(repositories.targetRepository);
    this.subscriptionService = new NotificationSubscriptionManagementService(repositories.subscriptionRepository);
    this.inboxService = new NotificationInboxManagementService(repositories.inboxRepository, repositories.targetRepository);
    this.summaryService = new NotificationOperationalSummaryService({
      targetRepository: repositories.targetRepository,
      subscriptionRepository: repositories.subscriptionRepository,
      inboxRepository: repositories.inboxRepository,
      outboxRepository: repositories.outboxRepository,
      decisionRepository: repositories.decisionRepository
    }, this.env);
  }

  async registerOrUpdateTarget(input: UpsertNotificationTargetInput, nowIso?: string) { return this.targetService.registerOrUpdateTarget(input, nowIso); }
  async verifyTarget(targetId: string, verifiedAt?: string) { return this.targetService.verifyTarget(targetId, verifiedAt); }
  async disableTarget(targetId: string, updatedAt?: string) { return this.targetService.disableTarget(targetId, updatedAt); }
  async enableTarget(targetId: string, updatedAt?: string) { return this.targetService.enableTarget(targetId, updatedAt); }

  async registerOrUpdateSubscription(input: UpsertNotificationSubscriptionInput, nowIso?: string) { return this.subscriptionService.registerOrUpdateSubscription(input, nowIso); }
  async enableSubscription(subscriptionId: string, updatedAt?: string) { return this.subscriptionService.enableSubscription(subscriptionId, updatedAt); }
  async disableSubscription(subscriptionId: string, updatedAt?: string) { return this.subscriptionService.disableSubscription(subscriptionId, updatedAt); }
  async updateSubscriptionThreshold(subscriptionId: string, minMaterialityScore: number | null, updatedAt?: string) { return this.subscriptionService.updateSubscriptionThreshold(subscriptionId, minMaterialityScore, updatedAt); }

  async listInbox(query: InboxListQuery) { return this.inboxService.listInbox(query); }
  async markInboxRead(inboxId: string, readAt?: string) { return this.inboxService.markRead(inboxId, readAt); }
  async markInboxUnread(inboxId: string) { return this.inboxService.markUnread(inboxId); }
  async archiveInboxItem(inboxId: string, archivedAt?: string) { return this.inboxService.archive(inboxId, archivedAt); }
  async unarchiveInboxItem(inboxId: string) { return this.inboxService.unarchive(inboxId); }

  async getNotificationOperationalSummaryForSubject(subjectKind: NotificationSubjectKind, subjectId: string, _asOfIso?: string) {
    return this.summaryService.getNotificationOperationalSummaryForSubject(subjectKind, subjectId);
  }

  async getNotificationDeliveryHealthSummary(asOfIso?: string, lookbackHours?: number) {
    return this.summaryService.getNotificationDeliveryHealthSummary(asOfIso, lookbackHours);
  }

  getNotificationProviderCapabilities(_asOfIso?: string) {
    return this.summaryService.getNotificationProviderCapabilities();
  }

  async getNotificationDeliveryOperationalSummary(asOfIso?: string, lookbackHours?: number) {
    return this.summaryService.getNotificationDeliveryOperationalSummary(asOfIso, lookbackHours);
  }

  async listTargetsForSubjectDetailed(subjectKind: NotificationSubjectKind, subjectId: string) { return this.summaryService.listTargetsForSubjectDetailed(subjectKind, subjectId); }
  async listSubscriptionsForSubjectDetailed(subjectKind: NotificationSubjectKind, subjectId: string) { return this.summaryService.listSubscriptionsForSubjectDetailed(subjectKind, subjectId); }
  async listRecentDeliveriesForSubject(subjectKind: NotificationSubjectKind, subjectId: string, limit?: number) { return this.summaryService.listRecentDeliveriesForSubject(subjectKind, subjectId, limit); }
  async listRecentDecisionsForSubject(subjectKind: NotificationSubjectKind, subjectId: string, limit?: number) { return this.summaryService.listRecentDecisionsForSubject(subjectKind, subjectId, limit); }
}
