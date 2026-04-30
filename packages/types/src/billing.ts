import type { PlanTier } from '@elceo/config';
import type { ElceoAccountState, ElceoPlanKind } from './entitlements';

export type BillingProvider = 'stripe' | 'mock';
export type SubscriptionLifecycleStatus = 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused' | 'expired';
export type BillingSubscriptionState = {
  userId: string; provider: BillingProvider; status: SubscriptionLifecycleStatus; planTier: PlanTier; externalCustomerId: string | null; externalSubscriptionId: string | null; currentPeriodStartUtc: string | null; currentPeriodEndUtc: string | null; cancelAtPeriodEnd: boolean; lastWebhookEventId: string | null; updatedAtUtc: string;
};
export type BillingCheckoutSession = { sessionId: string; checkoutUrl: string; provider: BillingProvider; };
export type BillingPortalSession = { portalUrl: string; provider: BillingProvider; };
export type BillingWebhookEvent = { eventId: string; provider: BillingProvider; eventType: 'subscription.updated' | 'subscription.canceled' | 'subscription.reactivated' | 'invoice.payment_failed'; occurredAtUtc: string; payload: { userId: string; externalCustomerId?: string; externalSubscriptionId?: string; status: SubscriptionLifecycleStatus; targetPlanTier?: PlanTier; currentPeriodStartUtc?: string; currentPeriodEndUtc?: string; cancelAtPeriodEnd?: boolean; }; };

export type BillingProviderKind = 'internal_manual' | 'stripe_placeholder';
export type BillingSubscriptionRuntimeState = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'paused';
export type BillingEventKind = 'subscription_created'|'trial_started'|'trial_extended'|'subscription_activated'|'subscription_renewed'|'subscription_plan_changed'|'subscription_paused'|'subscription_resumed'|'subscription_canceled'|'subscription_expired'|'payment_marked_past_due'|'manual_override_applied';
export type BillingPlanInterval = 'monthly'|'quarterly'|'yearly'|'custom';
export type BillingSubscriptionRecord = { subscriptionId:string;subjectKind:'user';subjectId:string;providerKind:BillingProviderKind;externalSubscriptionId:string|null;planKind:ElceoPlanKind;subscriptionState:BillingSubscriptionRuntimeState;interval:BillingPlanInterval;startedAt:string|null;currentPeriodStart:string|null;currentPeriodEnd:string|null;cancelAtPeriodEnd:boolean;canceledAt:string|null;trialStartedAt:string|null;trialEndsAt:string|null;updatedAt:string;};
export type BillingEventRecord = { eventId:string;subscriptionId:string;subjectKind:'user';subjectId:string;kind:BillingEventKind;providerKind:BillingProviderKind;externalEventId:string|null;occurredAt:string;eventJson:string;};
export type BillingCommercialState = { subjectKind:'user';subjectId:string;currentPlanKind:ElceoPlanKind;subscriptionState:BillingSubscriptionRuntimeState|null;accountState:ElceoAccountState;trialActive:boolean;trialEndsAt:string|null;cancelAtPeriodEnd:boolean;currentPeriodEnd:string|null;providerKind:BillingProviderKind|null;generatedAt:string;};
export type PlanTransitionRequest = { subjectKind:'user';subjectId:string;nextPlanKind:ElceoPlanKind;effectiveAt:string;interval:BillingPlanInterval;reason:string;};
