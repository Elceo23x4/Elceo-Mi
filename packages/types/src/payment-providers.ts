import type { BillingPlanInterval } from './billing';
import type { ElceoPlanKind } from './entitlements';

export type BillingExternalProviderKind = 'stripe' | 'manual_test' | 'internal_import';
export type BillingExternalEventKind = 'customer_created' | 'customer_updated' | 'subscription_created' | 'subscription_updated' | 'subscription_deleted' | 'invoice_paid' | 'invoice_payment_failed' | 'checkout_completed' | 'manual_event_ingested' | 'unknown';

export type BillingExternalCustomerRecord = { externalCustomerId:string; providerKind:BillingExternalProviderKind; subjectKind:'user'; subjectId:string; email:string|null; metadataJson:string; createdAt:string; updatedAt:string; };
export type BillingExternalSubscriptionRecord = { externalSubscriptionId:string; externalCustomerId:string; providerKind:BillingExternalProviderKind; subjectKind:'user'; subjectId:string; externalPriceId:string|null; externalProductId:string|null; mappedPlanKind:ElceoPlanKind|null; providerStatus:string; cancelAtPeriodEnd:boolean; currentPeriodStart:string|null; currentPeriodEnd:string|null; trialStartsAt:string|null; trialEndsAt:string|null; metadataJson:string; createdAt:string; updatedAt:string; };
export type BillingExternalEventRecord = { externalEventId:string; providerKind:BillingExternalProviderKind; kind:BillingExternalEventKind; externalCustomerId:string|null; externalSubscriptionId:string|null; subjectKind:'user'|null; subjectId:string|null; occurredAt:string; payloadJson:string; processed:boolean; processingResultCode:string|null; createdAt:string; updatedAt:string; };
export type BillingExternalEventIngestResult = { accepted:boolean; deduplicated:boolean; translated:boolean; externalEventId:string; providerKind:BillingExternalProviderKind; processingResultCode:string; linkedBillingSubscriptionId:string|null; linkedSubjectId:string|null; processedAt:string; };
export type BillingProviderPlanMapping = { providerKind:BillingExternalProviderKind; externalPriceId:string; mappedPlanKind:ElceoPlanKind; interval:BillingPlanInterval; };
export type StripeLikeWebhookEnvelope = { providerKind:BillingExternalProviderKind; externalEventId:string; eventType:string; createdAt:string; dataJson:string; };
