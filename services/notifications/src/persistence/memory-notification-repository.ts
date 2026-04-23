import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import type {
  NotificationDecisionRepository,
  NotificationOutboxAttemptRepository,
  NotificationOutboxRepository,
  PersistedNotificationDecisionRecord
} from './contracts';
import type { NotificationOutboxAttemptRecord, NotificationOutboxRecord } from '../delivery/outbox-contracts';

export class MemoryNotificationDecisionRepository implements NotificationDecisionRepository {
  private readonly byId = new Map<string, PersistedNotificationDecisionRecord>();
  private readonly byKey = new Map<string, PersistedNotificationDecisionRecord>();

  async saveDecision(record: PersistedNotificationDecisionRecord): Promise<void> {
    const existing = this.byKey.get(record.decisionKey);
    if (existing) this.byId.delete(existing.decisionId);
    this.byId.set(record.decisionId, record);
    this.byKey.set(record.decisionKey, record);
  }

  async getDecisionById(decisionId: string): Promise<PersistedNotificationDecisionRecord | null> {
    return this.byId.get(decisionId) ?? null;
  }

  async getDecisionByKey(decisionKey: string): Promise<PersistedNotificationDecisionRecord | null> {
    return this.byKey.get(decisionKey) ?? null;
  }

  async getLatestDecisionForRule(asset: CanonicalAssetSymbol, timeframe: Timeframe, ruleKey: string): Promise<PersistedNotificationDecisionRecord | null> {
    return (await this.listRecentDecisions({ limit: 1, asset, timeframe, ruleKey }))[0] ?? null;
  }

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
    return [...this.byId.values()]
      .filter((row) => row.reasoningRunId === reasoningRunId)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.decisionId.localeCompare(right.decisionId));
  }
}

export class MemoryNotificationOutboxRepository implements NotificationOutboxRepository {
  private readonly byId = new Map<string, NotificationOutboxRecord>();
  private readonly byKey = new Map<string, NotificationOutboxRecord>();

  async stageOutbox(record: NotificationOutboxRecord): Promise<void> {
    const existing = this.byKey.get(record.outboxKey);
    if (existing) return;
    this.byId.set(record.outboxId, record);
    this.byKey.set(record.outboxKey, record);
  }

  async getOutboxById(outboxId: string): Promise<NotificationOutboxRecord | null> {
    return this.byId.get(outboxId) ?? null;
  }

  async getOutboxByKey(outboxKey: string): Promise<NotificationOutboxRecord | null> {
    return this.byKey.get(outboxKey) ?? null;
  }

  async listDueOutboxItems(asOfIso: string, limit: number): Promise<NotificationOutboxRecord[]> {
    const asOf = Date.parse(asOfIso);
    return [...this.byId.values()]
      .filter((item) => (item.status === 'staged' || item.status === 'failed') && Date.parse(item.availableAt) <= asOf)
      .sort((a, b) => Date.parse(a.availableAt) - Date.parse(b.availableAt) || Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.outboxId.localeCompare(b.outboxId))
      .slice(0, limit);
  }

  async markDispatching(outboxId: string, attemptedAt: string): Promise<void> {
    const current = this.byId.get(outboxId);
    if (!current) return;
    const next: NotificationOutboxRecord = { ...current, status: 'dispatching', lastAttemptAt: attemptedAt, updatedAt: attemptedAt };
    this.byId.set(outboxId, next);
    this.byKey.set(next.outboxKey, next);
  }

  async markDelivered(outboxId: string, deliveredAt: string): Promise<void> {
    const current = this.byId.get(outboxId);
    if (!current) return;
    const next: NotificationOutboxRecord = {
      ...current,
      status: 'delivered',
      attemptCount: current.attemptCount + 1,
      deliveredAt,
      lastAttemptAt: deliveredAt,
      updatedAt: deliveredAt,
      lastErrorCode: null,
      lastErrorMessage: null
    };
    this.byId.set(outboxId, next);
    this.byKey.set(next.outboxKey, next);
  }

  async markFailed(outboxId: string, failedAt: string, nextAvailableAt: string, errorCode: string | null, errorMessage: string | null): Promise<void> {
    const current = this.byId.get(outboxId);
    if (!current) return;
    const next: NotificationOutboxRecord = {
      ...current,
      status: 'failed',
      attemptCount: current.attemptCount + 1,
      lastAttemptAt: failedAt,
      availableAt: nextAvailableAt,
      lastErrorCode: errorCode,
      lastErrorMessage: errorMessage,
      updatedAt: failedAt
    };
    this.byId.set(outboxId, next);
    this.byKey.set(next.outboxKey, next);
  }

  async markDead(outboxId: string, deadAt: string, errorCode: string | null, errorMessage: string | null): Promise<void> {
    const current = this.byId.get(outboxId);
    if (!current) return;
    const next: NotificationOutboxRecord = {
      ...current,
      status: 'dead',
      attemptCount: current.attemptCount + 1,
      deadAt,
      lastAttemptAt: deadAt,
      lastErrorCode: errorCode,
      lastErrorMessage: errorMessage,
      updatedAt: deadAt
    };
    this.byId.set(outboxId, next);
    this.byKey.set(next.outboxKey, next);
  }

  async listOutboxForDecision(decisionId: string): Promise<NotificationOutboxRecord[]> {
    return [...this.byId.values()]
      .filter((item) => item.decisionId === decisionId)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.outboxId.localeCompare(b.outboxId));
  }
}

export class MemoryNotificationOutboxAttemptRepository implements NotificationOutboxAttemptRepository {
  private readonly byId = new Map<string, NotificationOutboxAttemptRecord>();

  async saveAttempt(record: NotificationOutboxAttemptRecord): Promise<void> {
    this.byId.set(record.attemptId, record);
  }

  async listAttemptsForOutbox(outboxId: string): Promise<NotificationOutboxAttemptRecord[]> {
    return [...this.byId.values()]
      .filter((item) => item.outboxId === outboxId)
      .sort((a, b) => Date.parse(b.attemptedAt) - Date.parse(a.attemptedAt) || a.attemptId.localeCompare(b.attemptId));
  }
}
