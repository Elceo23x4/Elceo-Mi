import type { PlanTier } from '@elceo/config';
import type { BillingWebhookEvent, SubscriptionLifecycleStatus } from '@elceo/types';

const premiumStatuses = new Set<SubscriptionLifecycleStatus>(['trialing', 'active']);

export function mapStatusToPlanTier(status: SubscriptionLifecycleStatus, target: PlanTier | undefined): PlanTier {
  if (target === 'premium' && premiumStatuses.has(status)) {
    return 'premium';
  }
  return 'free';
}

export function normalizeWebhookEventPlan(event: BillingWebhookEvent): PlanTier {
  return mapStatusToPlanTier(event.payload.status, event.payload.targetPlanTier);
}
