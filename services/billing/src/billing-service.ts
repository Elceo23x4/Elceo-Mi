import type { BillingCheckoutSession, BillingPortalSession, BillingWebhookEvent, BillingSubscriptionState } from '@elceo/types';
import type { PlanTier } from '@elceo/config';
import { getBillingProviderAdapter, type BillingProviderAdapter } from './provider';
import { normalizeWebhookEventPlan } from './subscription-lifecycle';
import { logEvent } from '@elceo/config';

export type BillingSubscriptionSyncInput = {
  userId: string;
  subscription: Omit<BillingSubscriptionState, 'userId' | 'updatedAtUtc'>;
};

export class BillingService {
  constructor(private readonly provider: BillingProviderAdapter = getBillingProviderAdapter()) {}

  async createUpgradeCheckout(input: { userId: string; email: string; targetPlan: PlanTier; successUrl: string; cancelUrl: string }): Promise<BillingCheckoutSession> {
    if (input.targetPlan !== 'premium') {
      throw new Error('Checkout session can only be created for premium upgrade in this slice');
    }

    const session = await this.provider.createCheckoutSession(input);
    logEvent('billing.checkout', 'info', 'checkout session created', { userId: input.userId, targetPlan: input.targetPlan });
    return session;
  }

  async createPortalSession(input: { userId: string; email: string; returnUrl: string }): Promise<BillingPortalSession> {
    const portal = await this.provider.createPortalSession(input);
    logEvent('billing.portal', 'info', 'billing portal session created', { userId: input.userId });
    return portal;
  }

  async handleWebhook(requestBody: string, signature: string | null): Promise<BillingSubscriptionSyncInput> {
    const event = await this.provider.parseWebhook(requestBody, signature);
    return this.toSubscriptionSyncInput(event);
  }

  toSubscriptionSyncInput(event: BillingWebhookEvent): BillingSubscriptionSyncInput {
    const mappedPlan = normalizeWebhookEventPlan(event);
    logEvent('billing.webhook', 'info', 'webhook event mapped', { eventId: event.eventId, eventType: event.eventType, userId: event.payload.userId, mappedPlan });

    return {
      userId: event.payload.userId,
      subscription: {
        provider: event.provider,
        status: event.payload.status,
        planTier: mappedPlan,
        externalCustomerId: event.payload.externalCustomerId ?? null,
        externalSubscriptionId: event.payload.externalSubscriptionId ?? null,
        currentPeriodStartUtc: event.payload.currentPeriodStartUtc ?? null,
        currentPeriodEndUtc: event.payload.currentPeriodEndUtc ?? null,
        cancelAtPeriodEnd: event.payload.cancelAtPeriodEnd ?? false,
        lastWebhookEventId: event.eventId
      }
    };
  }
}

/** @deprecated Compatibility-only event translation. This service does not persist subscriptions or grant entitlement; callers must use InternalPaymentRuntime. */
export const LEGACY_BILLING_AUTHORITY_DISABLED = true as const;
