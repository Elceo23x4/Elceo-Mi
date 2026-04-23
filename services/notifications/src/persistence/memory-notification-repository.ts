import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import type { NotificationDecisionRepository, PersistedNotificationDecisionRecord } from './contracts';

export class MemoryNotificationDecisionRepository implements NotificationDecisionRepository {
  private readonly byId = new Map<string, PersistedNotificationDecisionRecord>();
  private readonly byKey = new Map<string, PersistedNotificationDecisionRecord>();

  async saveDecision(record: PersistedNotificationDecisionRecord): Promise<void> {
    const existing = this.byKey.get(record.decisionKey);
    if (existing) {
      this.byId.delete(existing.decisionId);
    }
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
