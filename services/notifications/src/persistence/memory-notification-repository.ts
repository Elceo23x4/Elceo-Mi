import type { CanonicalAssetSymbol, NotificationChannel, NotificationInboxRecord, NotificationSubscriptionRecord, NotificationTargetRecord, Timeframe } from '@elceo/types';
import type {
  NotificationDecisionRepository,
  NotificationInboxRepository,
  NotificationOutboxAttemptRepository,
  NotificationOutboxRepository,
  NotificationSubscriptionRepository,
  NotificationTargetRepository,
  PersistedNotificationDecisionRecord
} from './contracts';
import type { NotificationOutboxAttemptRecord, NotificationOutboxRecord } from '../delivery/outbox-contracts';

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
  async saveTarget(record: NotificationTargetRecord): Promise<void> { this.byId.set(record.targetId, record); }
  async getTargetById(targetId: string): Promise<NotificationTargetRecord | null> { return this.byId.get(targetId) ?? null; }
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
  async saveSubscription(record: NotificationSubscriptionRecord): Promise<void> { this.byId.set(record.subscriptionId, record); }
  async getSubscriptionById(subscriptionId: string): Promise<NotificationSubscriptionRecord | null> { return this.byId.get(subscriptionId) ?? null; }
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
  async listInboxForTarget(targetId: string, limit = 100): Promise<NotificationInboxRecord[]> {
    return [...this.byId.values()].filter((row) => row.targetId === targetId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.inboxId.localeCompare(b.inboxId)).slice(0, limit);
  }
  async markRead(inboxId: string, readAt: string): Promise<void> { const current = this.byId.get(inboxId); if (current) this.byId.set(inboxId, { ...current, readAt }); }
  async markArchived(inboxId: string, archivedAt: string): Promise<void> { const current = this.byId.get(inboxId); if (current) this.byId.set(inboxId, { ...current, archivedAt }); }
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
}
