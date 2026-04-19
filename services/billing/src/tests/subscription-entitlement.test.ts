import type { BillingWebhookEvent } from '@elceo/types';
import { BillingService } from '../billing-service';
import { mapStatusToPlanTier } from '../subscription-lifecycle';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export async function runSubscriptionEntitlementTests(): Promise<void> {
  const billing = new BillingService();

  const activated: BillingWebhookEvent = {
    eventId: 'evt-activate',
    provider: 'mock',
    eventType: 'subscription.updated',
    occurredAtUtc: '2026-04-16T00:00:00.000Z',
    payload: {
      userId: 'user-1',
      status: 'active',
      targetPlanTier: 'premium',
      externalCustomerId: 'cus_1',
      externalSubscriptionId: 'sub_1',
      currentPeriodStartUtc: '2026-04-16T00:00:00.000Z',
      currentPeriodEndUtc: '2026-05-16T00:00:00.000Z'
    }
  };

  const activeSync = billing.toSubscriptionSyncInput(activated);
  assert(activeSync.subscription.planTier === 'premium', 'active premium event should map to premium');

  const canceled: BillingWebhookEvent = {
    ...activated,
    eventId: 'evt-cancel',
    eventType: 'subscription.canceled',
    payload: { ...activated.payload, status: 'canceled' }
  };

  const cancelSync = billing.toSubscriptionSyncInput(canceled);
  assert(cancelSync.subscription.planTier === 'free', 'canceled event should map to free');
  assert(mapStatusToPlanTier('past_due', 'premium') === 'free', 'past_due should map to free plan tier');
}
