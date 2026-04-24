import type { NotificationSubscriptionRecord } from '@elceo/types';
import type { NotificationSubscriptionRepository } from '../persistence/contracts';
import type { UpsertNotificationSubscriptionInput } from './contracts';
import { buildDeterministicId } from './ids';
import { buildNotificationSubscriptionKey } from './keys';
import { validateSubscriptionInput } from './normalization';

export class NotificationSubscriptionManagementService {
  constructor(private readonly repository: NotificationSubscriptionRepository) {}

  async registerOrUpdateSubscription(input: UpsertNotificationSubscriptionInput, nowIso = new Date().toISOString()): Promise<NotificationSubscriptionRecord> {
    validateSubscriptionInput(input);
    const subscriptionKey = buildNotificationSubscriptionKey({
      subjectKind: input.subjectKind,
      subjectId: input.subjectId,
      channel: input.channel,
      assetScope: input.assetScope,
      timeframeScope: input.timeframeScope,
      ruleKeyScope: input.ruleKeyScope
    });
    const existing = await this.repository.getSubscriptionByKey(subscriptionKey);

    const record: NotificationSubscriptionRecord = {
      subscriptionId: existing?.subscriptionId ?? buildDeterministicId('subscription', subscriptionKey),
      subscriptionKey,
      subjectKind: input.subjectKind,
      subjectId: input.subjectId.trim(),
      channel: input.channel,
      asset: input.assetScope,
      timeframe: input.timeframeScope,
      ruleKey: input.ruleKeyScope,
      enabled: input.enabled,
      minMaterialityScore: input.minMaterialityScore ?? null,
      createdAt: existing?.createdAt ?? input.createdAt ?? nowIso,
      updatedAt: input.updatedAt ?? nowIso
    };

    await this.repository.upsertSubscriptionByKey(record);
    const persisted = await this.repository.getSubscriptionByKey(subscriptionKey);
    if (!persisted) throw new Error('Subscription upsert failed to persist');
    return persisted;
  }

  async enableSubscription(subscriptionId: string, updatedAt = new Date().toISOString()): Promise<void> {
    await this.repository.updateSubscriptionEnabled(subscriptionId, true, updatedAt);
  }

  async disableSubscription(subscriptionId: string, updatedAt = new Date().toISOString()): Promise<void> {
    await this.repository.updateSubscriptionEnabled(subscriptionId, false, updatedAt);
  }

  async updateSubscriptionThreshold(subscriptionId: string, minMaterialityScore: number | null, updatedAt = new Date().toISOString()): Promise<void> {
    if (minMaterialityScore !== null && (!Number.isFinite(minMaterialityScore) || minMaterialityScore < 0 || minMaterialityScore > 100)) {
      throw new Error('minMaterialityScore must be within [0, 100] or null');
    }
    await this.repository.updateSubscriptionThreshold(subscriptionId, minMaterialityScore, updatedAt);
  }
}
