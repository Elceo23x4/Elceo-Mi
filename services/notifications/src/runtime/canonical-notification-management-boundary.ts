import type { NotificationSubjectKind } from '@elceo/types';
import type { NotificationDeliveryRuntimeRepositories } from '../persistence/contracts';
import type { InboxListQuery, UpsertNotificationSubscriptionInput, UpsertNotificationTargetInput } from '../management/contracts';
import { NotificationInboxManagementService } from '../management/inbox-service';
import { NotificationOperationalSummaryService } from '../management/summary-service';
import { NotificationSubscriptionManagementService } from '../management/subscription-service';
import { NotificationTargetManagementService } from '../management/target-service';
import { buildNotificationTargetKey } from '../management/keys';
import { buildDeterministicId } from '../management/ids';

const ONESIGNAL_SUBSCRIPTION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  async disableTargetForSubject(subjectKind: NotificationSubjectKind, subjectId: string, targetId: string, updatedAt?: string) { return this.targetService.disableTargetForSubject(subjectKind, subjectId, targetId, updatedAt); }
  async enableTargetForSubject(subjectKind: NotificationSubjectKind, subjectId: string, targetId: string, updatedAt?: string) { return this.targetService.enableTargetForSubject(subjectKind, subjectId, targetId, updatedAt); }

  async bindPushSubscription(subjectId: string, subscriptionId: string, nowIso = new Date().toISOString()) {
    const normalized = subscriptionId.trim().toLowerCase();
    if (!ONESIGNAL_SUBSCRIPTION_ID.test(normalized)) throw new Error('validation_error:invalid_subscription_id');
    if (!this.repositories.pushOwnershipRepository) throw new Error('dependency_push_ownership_repository');
    const addressJson = JSON.stringify({ subscriptionId: normalized });
    const targetKey = buildNotificationTargetKey({ subjectKind: 'user', subjectId, channel: 'push', targetKind: 'push_endpoint', addressJson });
    return this.repositories.pushOwnershipRepository.bind({ targetId: buildDeterministicId('target', targetKey), targetKey, subjectKind: 'user', subjectId, channel: 'push', targetKind: 'push_endpoint', status: 'active', label: null, addressJson, createdAt: nowIso, updatedAt: nowIso, verifiedAt: nowIso });
  }

  async unbindPushSubscription(subjectId: string, subscriptionId: string, nowIso = new Date().toISOString()) {
    const normalized = subscriptionId.trim().toLowerCase();
    if (!ONESIGNAL_SUBSCRIPTION_ID.test(normalized)) throw new Error('validation_error:invalid_subscription_id');
    if (!this.repositories.pushOwnershipRepository) throw new Error('dependency_push_ownership_repository');
    return { detached: await this.repositories.pushOwnershipRepository.unbind('user', subjectId, normalized, nowIso) };
  }

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
