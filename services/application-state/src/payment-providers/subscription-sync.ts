import type { BillingExternalProviderKind } from '@elceo/types';
import type { ExternalBillingSubscriptionRepository } from '../persistence';
import type { NormalizedExternalEvent } from './stripe-like-normalizer';
import { ProviderPlanMapper } from './plan-mapper';

export class ExternalSubscriptionSyncService {
  constructor(private readonly subs: ExternalBillingSubscriptionRepository, private readonly mapper: ProviderPlanMapper) {}

  async sync(providerKind: BillingExternalProviderKind, normalized: NormalizedExternalEvent, nowIso: string) {
    const subscription = normalized.subscription;
    if (!subscription?.subject) return null;
    const mapped = subscription.externalPriceId ? await this.mapper.mapExternalPriceId(providerKind, subscription.externalPriceId) : null;
    await this.subs.saveSubscription({
      externalSubscriptionId: subscription.externalSubscriptionId,
      externalCustomerId: subscription.externalCustomerId,
      providerKind,
      subjectKind: subscription.subject.subjectKind,
      subjectId: subscription.subject.subjectId,
      externalPriceId: subscription.externalPriceId,
      externalProductId: subscription.externalProductId,
      mappedPlanKind: mapped?.mappedPlanKind ?? null,
      providerStatus: subscription.providerStatus,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialStartsAt: subscription.trialStartsAt,
      trialEndsAt: subscription.trialEndsAt,
      metadataJson: subscription.metadataJson,
      createdAt: nowIso,
      updatedAt: nowIso
    });
    return subscription.externalSubscriptionId;
  }
}
