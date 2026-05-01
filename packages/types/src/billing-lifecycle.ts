import type { ElceoAccountEntitlementState, ElceoPlanKind } from './entitlements';

export type BillingCustomerState = 'active' | 'missing' | 'restricted';
export type BillingLifecycleSubscriptionState = 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled' | 'incomplete' | 'incomplete_expired';
export type BillingPlanSource = 'provider_mapping' | 'manual_override' | 'internal_default';
export type BillingReconciliationStatus = 'success' | 'partial_success' | 'failed' | 'skipped';
export type BillingLifecycleProviderKind = 'stripe' | 'manual_test' | 'internal_import';

export type CanonicalBillingCustomer = { customerId:string; subjectKind:'user'; subjectId:string; providerKind:BillingLifecycleProviderKind; providerCustomerId:string; state:BillingCustomerState; email:string|null; createdAt:string; updatedAt:string; };
export type CanonicalBillingSubscription = { subscriptionId:string; subjectKind:'user'; subjectId:string; providerKind:BillingLifecycleProviderKind; providerSubscriptionId:string; providerPriceId:string|null; providerProductId:string|null; providerPlanCode:string|null; canonicalPlanKind:ElceoPlanKind; planSource:BillingPlanSource; state:BillingLifecycleSubscriptionState; currentPeriodStart:string|null; currentPeriodEnd:string|null; trialEndsAt:string|null; canceledAt:string|null; willCancelAtPeriodEnd:boolean; latestProviderEventId:string|null; updatedAt:string; };
export type BillingReconciliationRun = { runId:string; providerKind:BillingLifecycleProviderKind; sourceEventId:string|null; subjectKind:'user'; subjectId:string; status:BillingReconciliationStatus; summary:string; customerChanged:boolean; subscriptionChanged:boolean; entitlementChanged:boolean; previousPlanKind:ElceoPlanKind|null; nextPlanKind:ElceoPlanKind|null; startedAt:string; endedAt:string; createdAt:string; };
export type BillingLifecycleSnapshot = { generatedAt:string; subjectKind:'user'; subjectId:string; customer:CanonicalBillingCustomer|null; subscription:CanonicalBillingSubscription|null; entitlementState:ElceoAccountEntitlementState; latestReconciliationRunId:string|null; };
