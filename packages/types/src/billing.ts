import type { PlanTier } from '@elceo/config';

export type BillingProvider = 'stripe' | 'mock';

export type SubscriptionLifecycleStatus = 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused' | 'expired';

export type BillingSubscriptionState = {
  userId: string;
  provider: BillingProvider;
  status: SubscriptionLifecycleStatus;
  planTier: PlanTier;
  externalCustomerId: string | null;
  externalSubscriptionId: string | null;
  currentPeriodStartUtc: string | null;
  currentPeriodEndUtc: string | null;
  cancelAtPeriodEnd: boolean;
  lastWebhookEventId: string | null;
  updatedAtUtc: string;
};

export type BillingCheckoutSession = {
  sessionId: string;
  checkoutUrl: string;
  provider: BillingProvider;
};

export type BillingPortalSession = {
  portalUrl: string;
  provider: BillingProvider;
};

export type BillingWebhookEvent = {
  eventId: string;
  provider: BillingProvider;
  eventType: 'subscription.updated' | 'subscription.canceled' | 'subscription.reactivated' | 'invoice.payment_failed';
  occurredAtUtc: string;
  payload: {
    userId: string;
    externalCustomerId?: string;
    externalSubscriptionId?: string;
    status: SubscriptionLifecycleStatus;
    targetPlanTier?: PlanTier;
    currentPeriodStartUtc?: string;
    currentPeriodEndUtc?: string;
    cancelAtPeriodEnd?: boolean;
  };
};
