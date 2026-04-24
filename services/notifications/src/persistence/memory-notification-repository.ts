import type {
  CanonicalAssetSymbol,
  NotificationChannel,
  NotificationInboxRecord,
  NotificationSubscriptionRecord,
  NotificationTargetChannelStatus,
  NotificationTargetRecord,
  NotificationVerificationKind,
  NotificationVerificationRecord,
  Timeframe
} from '@elceo/types';
import type {
  NotificationDecisionRepository,
  NotificationInboxRepository,
  NotificationOutboxAttemptRepository,
  NotificationOutboxRepository,
  NotificationSubscriptionRepository,
  NotificationTargetRepository,
  NotificationVerificationRepository,
  NotificationOrchestrationRunRepository,
  NotificationProviderEventRepository,
  NotificationDeliveryReceiptRepository,
  NotificationTargetHealthRepository,
  PersistedNotificationDeliveryReceiptRecord,
  PersistedNotificationProviderEventRecord,
  PersistedNotificationTargetHealthRecord,
  PersistedNotificationOrchestrationRunRecord,
  PersistedNotificationDecisionRecord
} from './contracts';
import type { NotificationOrchestrationStage } from '../orchestration/contracts';
import type { NotificationOutboxAttemptRecord, NotificationOutboxRecord } from '../delivery/outbox-contracts';
import type { InboxListQuery } from '../management/contracts';

export class MemoryNotificationDecisionRepository implements NotificationDecisionRepository {
  private readonly byId = new Map<string, PersistedNotificationDecisionRecord>();
  private readonly byKey = new Map<string, PersistedNotificationDecisionRecord>();
  async saveDecision(record: PersistedNotificationDecisionRecord): Promise<void> { const existing = this.byKey.get(record.decisionKey); if (existing) this.byId.delete(existing.decisionId); this.byId.set(record.decisionId, record); this.byKey.set(record.decisionKey, record); }
  async getDecisionById(decisionId: string): Promise<PersistedNotificationDecisionRecord | null> { return this.byId.get(decisionId) ?? null; }
  async getDecisionByKey(decisionKey: string): Promise<PersistedNotificationDecisionRecord | null> { return this.byKey.get(decisionKey) ?? null; }
  async getLatestDecisionForRule(asset: CanonicalAssetSymbol, timeframe: Timeframe, ruleKey: string): Promise<PersistedNotificationDecisionRecord | null> { return (await this.listRecentDecisions({ limit: 1, asset, timeframe, ruleKey }))[0] ?? null; }
  async listRecentDecisions(params: { limit: number; asset?: CanonicalAssetSymbol; timeframe?: Timeframe; shouldNotify?: boolean; ruleKey?: string }): Promise<PersistedNotificationDecisionRecord[]> {
    let values = [...this.byId.values()];
    if (params.asset) values = values.filter((row) => row.asset === params.asset);
    if (params.timeframe) values = values.filter((row) => row.timeframe === params.timeframe);
    if (params.ruleKey) values = values.filter((row) => row.ruleKey === params.ruleKey);
    if (params.shouldNotify !== undefined) values = values.filter((row) => row.shouldNotify === params.shouldNotify);
    values.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.decisionId.localeCompare(right.decisionId));
    return values.slice(0, params.limit);
  }
  async listDecisionsForReasoningRun(reasoningRunId: string): Promise<PersistedNotificationDecisionRecord[]> {
    return [...this.byId.values()].filter((row) => row.reasoningRunId === reasoningRunId).sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.decisionId.localeCompare(right.decisionId));
  }
}

export class MemoryNotificationTargetRepository implements NotificationTargetRepository {
  private readonly byId = new Map<string, NotificationTargetRecord>();
  private readonly idByKey = new Map<string, string>();

  async saveTarget(record: NotificationTargetRecord): Promise<void> { this.byId.set(record.targetId, record); if (record.targetKey) this.idByKey.set(record.targetKey, record.targetId); }
  async getTargetById(targetId: string): Promise<NotificationTargetRecord | null> { return this.byId.get(targetId) ?? null; }
  async getTargetByKey(targetKey: string): Promise<NotificationTargetRecord | null> { const id = this.idByKey.get(targetKey); return id ? this.byId.get(id) ?? null : null; }
  async upsertTargetByKey(record: NotificationTargetRecord): Promise<void> {
    const byKey = record.targetKey ? await this.getTargetByKey(record.targetKey) : null;
    if (byKey) {
      this.byId.set(byKey.targetId, { ...record, targetId: byKey.targetId, createdAt: byKey.createdAt });
      if (record.targetKey) this.idByKey.set(record.targetKey, byKey.targetId);
      return;
    }
    this.byId.set(record.targetId, record);
    if (record.targetKey) this.idByKey.set(record.targetKey, record.targetId);
  }
  async updateTargetStatus(targetId: string, status: NotificationTargetChannelStatus, updatedAt: string, verifiedAt?: string): Promise<void> {
    const current = this.byId.get(targetId);
    if (!current) return;
    this.byId.set(targetId, { ...current, status, updatedAt, verifiedAt: verifiedAt ?? current.verifiedAt });
  }
  async listTargetsForSubject(subjectKind: NotificationTargetRecord['subjectKind'], subjectId: string): Promise<NotificationTargetRecord[]> {
    return [...this.byId.values()].filter((row) => row.subjectKind === subjectKind && row.subjectId === subjectId).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.targetId.localeCompare(b.targetId));
  }
  async listActiveTargetsForChannel(channel: NotificationChannel): Promise<NotificationTargetRecord[]> {
    return [...this.byId.values()].filter((row) => row.channel === channel && row.status === 'active').sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.targetId.localeCompare(b.targetId));
  }
  async listTargetsByIds(targetIds: string[]): Promise<NotificationTargetRecord[]> {
    const idSet = new Set(targetIds);
    return [...this.byId.values()].filter((row) => idSet.has(row.targetId)).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.targetId.localeCompare(b.targetId));
  }
}

export class MemoryNotificationSubscriptionRepository implements NotificationSubscriptionRepository {
  private readonly byId = new Map<string, NotificationSubscriptionRecord>();
  private readonly idByKey = new Map<string, string>();

  async saveSubscription(record: NotificationSubscriptionRecord): Promise<void> { this.byId.set(record.subscriptionId, record); if (record.subscriptionKey) this.idByKey.set(record.subscriptionKey, record.subscriptionId); }
  async getSubscriptionById(subscriptionId: string): Promise<NotificationSubscriptionRecord | null> { return this.byId.get(subscriptionId) ?? null; }
  async getSubscriptionByKey(subscriptionKey: string): Promise<NotificationSubscriptionRecord | null> { const id = this.idByKey.get(subscriptionKey); return id ? this.byId.get(id) ?? null : null; }
  async upsertSubscriptionByKey(record: NotificationSubscriptionRecord): Promise<void> {
    const existing = record.subscriptionKey ? await this.getSubscriptionByKey(record.subscriptionKey) : null;
    if (existing) {
      this.byId.set(existing.subscriptionId, { ...record, subscriptionId: existing.subscriptionId, createdAt: existing.createdAt });
      if (record.subscriptionKey) this.idByKey.set(record.subscriptionKey, existing.subscriptionId);
      return;
    }
    this.byId.set(record.subscriptionId, record);
    if (record.subscriptionKey) this.idByKey.set(record.subscriptionKey, record.subscriptionId);
  }
  async updateSubscriptionEnabled(subscriptionId: string, enabled: boolean, updatedAt: string): Promise<void> {
    const current = this.byId.get(subscriptionId);
    if (!current) return;
    this.byId.set(subscriptionId, { ...current, enabled, updatedAt });
  }
  async updateSubscriptionThreshold(subscriptionId: string, minMaterialityScore: number | null, updatedAt: string): Promise<void> {
    const current = this.byId.get(subscriptionId);
    if (!current) return;
    this.byId.set(subscriptionId, { ...current, minMaterialityScore, updatedAt });
  }
  async listSubscriptionsForSubject(subjectKind: NotificationSubscriptionRecord['subjectKind'], subjectId: string): Promise<NotificationSubscriptionRecord[]> {
    return [...this.byId.values()].filter((row) => row.subjectKind === subjectKind && row.subjectId === subjectId).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.subscriptionId.localeCompare(b.subscriptionId));
  }
  async listEnabledSubscriptionsForChannel(channel: NotificationChannel): Promise<NotificationSubscriptionRecord[]> {
    return [...this.byId.values()].filter((row) => row.channel === channel && row.enabled).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.subscriptionId.localeCompare(b.subscriptionId));
  }
}

export class MemoryNotificationInboxRepository implements NotificationInboxRepository {
  private readonly byId = new Map<string, NotificationInboxRecord>();
  async saveInboxRecord(record: NotificationInboxRecord): Promise<void> { if (!this.byId.has(record.inboxId)) this.byId.set(record.inboxId, record); }
  async getInboxById(inboxId: string): Promise<NotificationInboxRecord | null> { return this.byId.get(inboxId) ?? null; }
  async listInboxForTarget(targetId: string, limit = 100): Promise<NotificationInboxRecord[]> { return this.listInbox({ targetId, includeArchived: true, limit }); }
  async listInbox(query: InboxListQuery): Promise<NotificationInboxRecord[]> {
    let rows = [...this.byId.values()];
    if (query.targetId) rows = rows.filter((row) => row.targetId === query.targetId);
    if (query.unreadOnly) rows = rows.filter((row) => row.readAt === null);
    if (!(query.includeArchived ?? false)) rows = rows.filter((row) => row.archivedAt === null);
    rows.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.inboxId.localeCompare(b.inboxId));
    return rows.slice(0, query.limit ?? 100);
  }
  async markRead(inboxId: string, readAt: string): Promise<void> { const current = this.byId.get(inboxId); if (current) this.byId.set(inboxId, { ...current, readAt }); }
  async markUnread(inboxId: string): Promise<void> { const current = this.byId.get(inboxId); if (current) this.byId.set(inboxId, { ...current, readAt: null }); }
  async markArchived(inboxId: string, archivedAt: string): Promise<void> { const current = this.byId.get(inboxId); if (current) this.byId.set(inboxId, { ...current, archivedAt }); }
  async markUnarchived(inboxId: string): Promise<void> { const current = this.byId.get(inboxId); if (current) this.byId.set(inboxId, { ...current, archivedAt: null }); }
  async listInboxForDecision(decisionId: string): Promise<NotificationInboxRecord[]> {
    return [...this.byId.values()].filter((row) => row.decisionId === decisionId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.inboxId.localeCompare(b.inboxId));
  }
}

export class MemoryNotificationOutboxRepository implements NotificationOutboxRepository {
  private readonly byId = new Map<string, NotificationOutboxRecord>();
  private readonly byKey = new Map<string, NotificationOutboxRecord>();
  async stageOutbox(record: NotificationOutboxRecord): Promise<void> { if (this.byKey.has(record.outboxKey)) return; this.byId.set(record.outboxId, record); this.byKey.set(record.outboxKey, record); }
  async getOutboxById(outboxId: string): Promise<NotificationOutboxRecord | null> { return this.byId.get(outboxId) ?? null; }
  async getOutboxByKey(outboxKey: string): Promise<NotificationOutboxRecord | null> { return this.byKey.get(outboxKey) ?? null; }
  async listDueOutboxItems(asOfIso: string, limit: number): Promise<NotificationOutboxRecord[]> {
    const asOf = Date.parse(asOfIso);
    return [...this.byId.values()].filter((item) => (item.status === 'staged' || item.status === 'failed') && Date.parse(item.availableAt) <= asOf).sort((a, b) => Date.parse(a.availableAt) - Date.parse(b.availableAt) || Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.outboxId.localeCompare(b.outboxId)).slice(0, limit);
  }
  async listRecentOutboxItems(asOfIso: string, lookbackHours: number | null, limit: number): Promise<NotificationOutboxRecord[]> {
    const asOfMs = Date.parse(asOfIso);
    const minMs = lookbackHours === null ? Number.NEGATIVE_INFINITY : asOfMs - lookbackHours * 60 * 60 * 1000;
    return [...this.byId.values()]
      .filter((row) => {
        const createdMs = Date.parse(row.createdAt);
        return createdMs <= asOfMs && createdMs >= minMs;
      })
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.outboxId.localeCompare(b.outboxId))
      .slice(0, limit);
  }
  async markDispatching(outboxId: string, attemptedAt: string): Promise<void> { const c = this.byId.get(outboxId); if (!c) return; const n = { ...c, status: 'dispatching', lastAttemptAt: attemptedAt, updatedAt: attemptedAt } as NotificationOutboxRecord; this.byId.set(outboxId, n); this.byKey.set(n.outboxKey, n); }
  async markDelivered(outboxId: string, deliveredAt: string): Promise<void> { const c = this.byId.get(outboxId); if (!c) return; const n = { ...c, status: 'delivered', attemptCount: c.attemptCount + 1, deliveredAt, lastAttemptAt: deliveredAt, updatedAt: deliveredAt, lastErrorCode: null, lastErrorMessage: null } as NotificationOutboxRecord; this.byId.set(outboxId, n); this.byKey.set(n.outboxKey, n); }
  async markFailed(outboxId: string, failedAt: string, nextAvailableAt: string, errorCode: string | null, errorMessage: string | null): Promise<void> { const c = this.byId.get(outboxId); if (!c) return; const n = { ...c, status: 'failed', attemptCount: c.attemptCount + 1, lastAttemptAt: failedAt, availableAt: nextAvailableAt, lastErrorCode: errorCode, lastErrorMessage: errorMessage, updatedAt: failedAt } as NotificationOutboxRecord; this.byId.set(outboxId, n); this.byKey.set(n.outboxKey, n); }
  async markDead(outboxId: string, deadAt: string, errorCode: string | null, errorMessage: string | null): Promise<void> { const c = this.byId.get(outboxId); if (!c) return; const n = { ...c, status: 'dead', attemptCount: c.attemptCount + 1, deadAt, lastAttemptAt: deadAt, lastErrorCode: errorCode, lastErrorMessage: errorMessage, updatedAt: deadAt } as NotificationOutboxRecord; this.byId.set(outboxId, n); this.byKey.set(n.outboxKey, n); }
  async listOutboxForDecision(decisionId: string): Promise<NotificationOutboxRecord[]> { return [...this.byId.values()].filter((item) => item.decisionId === decisionId).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.outboxId.localeCompare(b.outboxId)); }
}

export class MemoryNotificationOutboxAttemptRepository implements NotificationOutboxAttemptRepository {
  private readonly byId = new Map<string, NotificationOutboxAttemptRecord>();
  async saveAttempt(record: NotificationOutboxAttemptRecord): Promise<void> { this.byId.set(record.attemptId, record); }
  async listAttemptsForOutbox(outboxId: string): Promise<NotificationOutboxAttemptRecord[]> { return [...this.byId.values()].filter((item) => item.outboxId === outboxId).sort((a, b) => Date.parse(b.attemptedAt) - Date.parse(a.attemptedAt) || a.attemptId.localeCompare(b.attemptId)); }
  async getLatestAttemptByProviderMessageId(providerMessageId: string): Promise<NotificationOutboxAttemptRecord | null> {
    const rows = [...this.byId.values()]
      .filter((item) => item.providerMessageId === providerMessageId)
      .sort((a, b) => Date.parse(b.attemptedAt) - Date.parse(a.attemptedAt) || a.attemptId.localeCompare(b.attemptId));
    return rows[0] ?? null;
  }
}


export class MemoryNotificationVerificationRepository implements NotificationVerificationRepository {
  private readonly byId = new Map<string, NotificationVerificationRecord>();
  private readonly idByKey = new Map<string, string>();

  async saveVerification(record: NotificationVerificationRecord): Promise<void> {
    this.byId.set(record.verificationId, record);
    this.idByKey.set(record.verificationKey, record.verificationId);
  }

  async getVerificationById(verificationId: string): Promise<NotificationVerificationRecord | null> { return this.byId.get(verificationId) ?? null; }
  async getVerificationByKey(verificationKey: string): Promise<NotificationVerificationRecord | null> { const id = this.idByKey.get(verificationKey); return id ? this.byId.get(id) ?? null : null; }

  async getLatestActiveVerificationForTarget(targetId: string, verificationKind: NotificationVerificationKind): Promise<NotificationVerificationRecord | null> {
    return [...this.byId.values()]
      .filter((row) => row.targetId === targetId && row.verificationKind === verificationKind && row.status === 'pending')
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.verificationId.localeCompare(b.verificationId))[0] ?? null;
  }

  async listVerificationsForTarget(targetId: string): Promise<NotificationVerificationRecord[]> {
    return [...this.byId.values()].filter((row) => row.targetId === targetId).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)||a.verificationId.localeCompare(b.verificationId));
  }
  async listPendingVerificationsExpiringBefore(asOfIso: string): Promise<NotificationVerificationRecord[]> {
    const cutoff = Date.parse(asOfIso);
    return [...this.byId.values()].filter((row) => row.status === 'pending' && Date.parse(row.expiresAt) < cutoff).sort((a,b)=>Date.parse(a.expiresAt)-Date.parse(b.expiresAt)||a.verificationId.localeCompare(b.verificationId));
  }

  async markVerificationConsumed(verificationId: string, consumedAt: string): Promise<void> {
    const current = this.byId.get(verificationId); if (!current) return;
    this.byId.set(verificationId, { ...current, status: 'consumed', consumedAt, updatedAt: consumedAt });
  }
  async markVerificationExpired(verificationId: string, updatedAt: string): Promise<void> {
    const current = this.byId.get(verificationId); if (!current) return;
    this.byId.set(verificationId, { ...current, status: 'expired', updatedAt });
  }
  async markVerificationCanceled(verificationId: string, updatedAt: string): Promise<void> {
    const current = this.byId.get(verificationId); if (!current) return;
    this.byId.set(verificationId, { ...current, status: 'canceled', updatedAt });
  }
  async incrementVerificationAttempt(verificationId: string, attemptedAt: string): Promise<void> {
    const current = this.byId.get(verificationId); if (!current) return;
    this.byId.set(verificationId, { ...current, attemptCount: current.attemptCount + 1, lastAttemptAt: attemptedAt, updatedAt: attemptedAt });
  }
}

export class MemoryNotificationOrchestrationRunRepository implements NotificationOrchestrationRunRepository {
  private readonly byId = new Map<string, PersistedNotificationOrchestrationRunRecord>();

  async saveRun(record: PersistedNotificationOrchestrationRunRecord): Promise<void> {
    this.byId.set(record.orchestrationRunId, record);
  }

  async getRunById(orchestrationRunId: string): Promise<PersistedNotificationOrchestrationRunRecord | null> {
    return this.byId.get(orchestrationRunId) ?? null;
  }

  async listRecentRuns(stage?: NotificationOrchestrationStage, limit = 20): Promise<PersistedNotificationOrchestrationRunRecord[]> {
    const rows = [...this.byId.values()];
    const filtered = stage ? rows.filter((row) => row.stage === stage) : rows;
    return filtered
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.orchestrationRunId.localeCompare(right.orchestrationRunId))
      .slice(0, limit);
  }

  async getLatestRunForReasoningRun(reasoningRunId: string): Promise<PersistedNotificationOrchestrationRunRecord | null> {
    const rows = [...this.byId.values()]
      .filter((row) => row.reasoningRunId === reasoningRunId)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.orchestrationRunId.localeCompare(right.orchestrationRunId));
    return rows[0] ?? null;
  }
}

export class MemoryNotificationProviderEventRepository implements NotificationProviderEventRepository {
  private readonly byId = new Map<string, PersistedNotificationProviderEventRecord>();
  async saveProviderEvent(record: PersistedNotificationProviderEventRecord): Promise<void> { this.byId.set(record.providerEventId, record); }
  async getProviderEventById(providerEventId: string): Promise<PersistedNotificationProviderEventRecord | null> { return this.byId.get(providerEventId) ?? null; }
  async listProviderEventsForTarget(targetId: string, limit = 100): Promise<PersistedNotificationProviderEventRecord[]> {
    return [...this.byId.values()].filter((row) => row.targetId === targetId).sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || a.providerEventId.localeCompare(b.providerEventId)).slice(0, limit);
  }
  async listRecentProviderEvents(providerKind?: string, limit = 100): Promise<PersistedNotificationProviderEventRecord[]> {
    return [...this.byId.values()].filter((row) => (providerKind ? row.providerKind === providerKind : true)).sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || a.providerEventId.localeCompare(b.providerEventId)).slice(0, limit);
  }
}

export class MemoryNotificationDeliveryReceiptRepository implements NotificationDeliveryReceiptRepository {
  private readonly byId = new Map<string, PersistedNotificationDeliveryReceiptRecord>();
  async saveReceipt(record: PersistedNotificationDeliveryReceiptRecord): Promise<void> { this.byId.set(record.receiptId, record); }
  async getReceiptById(receiptId: string): Promise<PersistedNotificationDeliveryReceiptRecord | null> { return this.byId.get(receiptId) ?? null; }
  async listReceiptsForTarget(targetId: string, limit = 100): Promise<PersistedNotificationDeliveryReceiptRecord[]> { return this.filter({ targetId }, limit); }
  async listReceiptsForDecision(decisionId: string, limit = 100): Promise<PersistedNotificationDeliveryReceiptRecord[]> { return this.filter({ decisionId }, limit); }
  async listReceiptsForOutbox(outboxId: string, limit = 100): Promise<PersistedNotificationDeliveryReceiptRecord[]> { return this.filter({ outboxId }, limit); }
  async listRecentReceipts(eventKind?: import('@elceo/types').NotificationProviderEventKind, limit = 100): Promise<PersistedNotificationDeliveryReceiptRecord[]> { return this.filter(eventKind ? { eventKind } : {}, limit); }
  private async filter(params: { targetId?: string; decisionId?: string; outboxId?: string; eventKind?: import('@elceo/types').NotificationProviderEventKind }, limit: number): Promise<PersistedNotificationDeliveryReceiptRecord[]> {
    return [...this.byId.values()]
      .filter((row) => (params.targetId ? row.targetId === params.targetId : true))
      .filter((row) => (params.decisionId ? row.decisionId === params.decisionId : true))
      .filter((row) => (params.outboxId ? row.outboxId === params.outboxId : true))
      .filter((row) => (params.eventKind ? row.eventKind === params.eventKind : true))
      .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || a.receiptId.localeCompare(b.receiptId))
      .slice(0, limit);
  }
}

export class MemoryNotificationTargetHealthRepository implements NotificationTargetHealthRepository {
  private readonly byTargetId = new Map<string, PersistedNotificationTargetHealthRecord>();
  private readonly targetRepository: NotificationTargetRepository;
  constructor(targetRepository: NotificationTargetRepository) { this.targetRepository = targetRepository; }
  async saveTargetHealth(record: PersistedNotificationTargetHealthRecord): Promise<void> { this.byTargetId.set(record.targetId, record); }
  async getTargetHealth(targetId: string): Promise<PersistedNotificationTargetHealthRecord | null> { return this.byTargetId.get(targetId) ?? null; }
  async listTargetHealthForSubject(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<PersistedNotificationTargetHealthRecord[]> {
    const targets = await this.targetRepository.listTargetsForSubject(subjectKind, subjectId);
    const ids = new Set(targets.map((row) => row.targetId));
    return [...this.byTargetId.values()].filter((row) => ids.has(row.targetId)).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.targetId.localeCompare(b.targetId));
  }
}
