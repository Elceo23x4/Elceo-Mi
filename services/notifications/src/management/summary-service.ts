import type { NotificationSubjectKind, NotificationTargetRecord } from '@elceo/types';
import type { NotificationDecisionRepository, NotificationInboxRepository, NotificationOutboxRepository, NotificationSubscriptionRepository, NotificationTargetRepository } from '../persistence/contracts';
import type { NotificationDeliveryHealthSummary, NotificationOperationalSummary, NotificationSubjectDecisionView } from './contracts';

type SummaryDeps = {
  targetRepository: NotificationTargetRepository;
  subscriptionRepository: NotificationSubscriptionRepository;
  inboxRepository: NotificationInboxRepository;
  outboxRepository: NotificationOutboxRepository;
  decisionRepository: NotificationDecisionRepository;
};

export class NotificationOperationalSummaryService {
  constructor(private readonly deps: SummaryDeps) {}

  async getNotificationOperationalSummaryForSubject(subjectKind: NotificationSubjectKind, subjectId: string): Promise<NotificationOperationalSummary> {
    const targets = await this.deps.targetRepository.listTargetsForSubject(subjectKind, subjectId);
    const subscriptions = await this.deps.subscriptionRepository.listSubscriptionsForSubject(subjectKind, subjectId);

    const inboxRows = await this.listSubjectInboxAcrossTargets(targets.map((target) => target.targetId));
    const outboxRows = await this.listSubjectOutboxAcrossTargets(targets.map((target) => target.targetId));

    return {
      subjectTargetCount: targets.length,
      activeTargetCount: targets.filter((target) => target.status === 'active').length,
      subscriptionCount: subscriptions.length,
      enabledSubscriptionCount: subscriptions.filter((subscription) => subscription.enabled).length,
      inboxUnreadCount: inboxRows.filter((row) => row.readAt === null).length,
      inboxArchivedCount: inboxRows.filter((row) => row.archivedAt !== null).length,
      recentDeliveredCount: outboxRows.filter((row) => row.status === 'delivered').length,
      recentFailedCount: outboxRows.filter((row) => row.status === 'failed').length,
      recentDeadCount: outboxRows.filter((row) => row.status === 'dead').length
    };
  }

  async getNotificationDeliveryHealthSummary(asOfIso = new Date().toISOString(), lookbackHours?: number): Promise<NotificationDeliveryHealthSummary> {
    const recent = await this.deps.outboxRepository.listRecentOutboxItems(asOfIso, lookbackHours ?? null, 1000);
    return {
      asOfIso,
      lookbackHours: lookbackHours ?? null,
      delivered: recent.filter((row) => row.status === 'delivered').length,
      failed: recent.filter((row) => row.status === 'failed').length,
      dead: recent.filter((row) => row.status === 'dead').length,
      staged: recent.filter((row) => row.status === 'staged').length,
      dispatching: recent.filter((row) => row.status === 'dispatching').length
    };
  }

  async listTargetsForSubjectDetailed(subjectKind: NotificationSubjectKind, subjectId: string): Promise<NotificationTargetRecord[]> {
    return this.deps.targetRepository.listTargetsForSubject(subjectKind, subjectId);
  }

  async listSubscriptionsForSubjectDetailed(subjectKind: NotificationSubjectKind, subjectId: string) {
    return this.deps.subscriptionRepository.listSubscriptionsForSubject(subjectKind, subjectId);
  }

  async listRecentDeliveriesForSubject(subjectKind: NotificationSubjectKind, subjectId: string, limit = 20) {
    const targets = await this.deps.targetRepository.listTargetsForSubject(subjectKind, subjectId);
    const dedupe = new Map<string, Awaited<ReturnType<NotificationOutboxRepository['listOutboxForDecision']>>[number]>();
    const recent = await this.deps.outboxRepository.listRecentOutboxItems(new Date().toISOString(), null, 1000);
    const ids = new Set(targets.map((target) => target.targetId));
    for (const row of recent) {
      if (!ids.has(row.targetId)) continue;
      if (!dedupe.has(row.outboxId)) dedupe.set(row.outboxId, row);
    }
    return [...dedupe.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.outboxId.localeCompare(b.outboxId)).slice(0, limit);
  }

  async listRecentDecisionsForSubject(subjectKind: NotificationSubjectKind, subjectId: string, limit = 20): Promise<NotificationSubjectDecisionView[]> {
    const deliveries = await this.listRecentDeliveriesForSubject(subjectKind, subjectId, 300);
    const decisionIds = [...new Set(deliveries.map((row) => row.decisionId))];
    const views: NotificationSubjectDecisionView[] = [];
    for (const decisionId of decisionIds) {
      const decision = await this.deps.decisionRepository.getDecisionById(decisionId);
      if (!decision) continue;
      views.push({
        decisionId: decision.decisionId,
        decisionKey: decision.decisionKey,
        asset: decision.asset,
        timeframe: decision.timeframe,
        ruleKey: decision.ruleKey,
        shouldNotify: decision.shouldNotify,
        materialityScore: decision.materialityScore,
        createdAt: decision.createdAt
      });
    }
    return views.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.decisionId.localeCompare(b.decisionId)).slice(0, limit);
  }

  private async listSubjectInboxAcrossTargets(targetIds: string[]) {
    const dedupe = new Map<string, Awaited<ReturnType<NotificationInboxRepository['listInboxForTarget']>>[number]>();
    for (const targetId of targetIds) {
      const rows = await this.deps.inboxRepository.listInbox({ targetId, includeArchived: true, limit: 1000 });
      for (const row of rows) if (!dedupe.has(row.inboxId)) dedupe.set(row.inboxId, row);
    }
    return [...dedupe.values()];
  }

  private async listSubjectOutboxAcrossTargets(targetIds: string[]) {
    const rows = await this.deps.outboxRepository.listRecentOutboxItems(new Date().toISOString(), null, 1000);
    const idSet = new Set(targetIds);
    return rows.filter((row) => idSet.has(row.targetId));
  }
}
