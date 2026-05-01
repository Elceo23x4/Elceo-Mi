import assert from 'node:assert/strict';
import { MemoryAccountEntitlementRepository } from '../persistence/entitlements-repository';
import { MemoryBillingCustomerRepository, MemoryBillingLifecycleSubscriptionRepository, MemoryBillingReconciliationRunRepository } from '../persistence/billing-lifecycle-repository';
import { MemoryExternalBillingEventRepository, MemoryExternalBillingSubscriptionRepository, MemoryProviderPlanMappingRepository } from '../persistence/payment-provider-repository';
import { BillingLifecycleQueryService } from '../billing/query-service';
import { BillingLifecycleReplayService } from '../billing/replay';
import { BillingProviderPlanMapper } from '../billing/provider-mapping';
import { BillingLifecycleReconciliationService } from '../billing/reconciliation-service';
import { CanonicalBillingLifecycleBoundaryService } from '../runtime/canonical-billing-lifecycle-boundary';

export async function runBillingLifecycleCoreTests(): Promise<void> {
  const customers=new MemoryBillingCustomerRepository(); const subs=new MemoryBillingLifecycleSubscriptionRepository(); const runs=new MemoryBillingReconciliationRunRepository(); const events=new MemoryExternalBillingEventRepository(); const extSubs=new MemoryExternalBillingSubscriptionRepository(); const accounts=new MemoryAccountEntitlementRepository(); const mappings=new MemoryProviderPlanMappingRepository();
  await mappings.upsertPlanMapping({providerKind:'stripe',externalPriceId:'price_premium',mappedPlanKind:'premium',interval:'monthly',updatedAt:new Date().toISOString()});
  const mapper=new BillingProviderPlanMapper(mappings); const mapped=await mapper.mapPlan({providerKind:'stripe',providerPriceId:'price_premium',providerProductId:null,providerPlanCode:null}); assert.equal(mapped.canonicalPlanKind,'premium');
  const fallback=await mapper.mapPlan({providerKind:'stripe',providerPriceId:null,providerProductId:null,providerPlanCode:null}); assert.equal(fallback.canonicalPlanKind,'free');
  await accounts.saveAccountEntitlement({subjectKind:'user',subjectId:'u1',planKind:'admin_internal',accountState:'restricted',planStartedAt:null,planEndsAt:null,trialEndsAt:null,internalOverride:true,updatedAt:new Date().toISOString()});
  await events.saveEvent({externalEventId:'evt_1',providerKind:'stripe',kind:'subscription_updated',externalCustomerId:'cus_1',externalSubscriptionId:'sub_1',subjectKind:'user',subjectId:'u1',occurredAt:new Date().toISOString(),payloadJson:'{}',processed:false,processingResultCode:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
  await extSubs.saveSubscription({externalSubscriptionId:'sub_1',externalCustomerId:'cus_1',providerKind:'stripe',subjectKind:'user',subjectId:'u1',externalPriceId:'price_premium',externalProductId:null,mappedPlanKind:'premium',providerStatus:'active',cancelAtPeriodEnd:false,currentPeriodStart:null,currentPeriodEnd:null,trialStartsAt:null,trialEndsAt:null,metadataJson:'{}',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
  const recon=new BillingLifecycleReconciliationService(customers,subs,runs,events,extSubs,accounts,mapper); const query=new BillingLifecycleQueryService(customers,subs,runs,accounts); const replay=new BillingLifecycleReplayService(runs); const boundary=new CanonicalBillingLifecycleBoundaryService(recon,query,replay);
  const result=await boundary.reconcileProviderEvent('stripe','evt_1'); assert.equal(result.entitlement.nextPlanKind,'admin_internal');
  const snap=await boundary.getBillingLifecycleSnapshot('user','u1'); assert.equal(snap.subscription?.canonicalPlanKind,'premium');
  const latest=await boundary.getLatestBillingReconciliationRun('user','u1'); assert.ok(latest?.runId);
  const replayRun=await replay.getLatestBillingReconciliationReplay('user','u1'); assert.equal(replayRun?.runId,latest?.runId);
}
