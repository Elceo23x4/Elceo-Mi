import type { BillingLifecycleProviderKind, BillingReconciliationRun, CanonicalBillingCustomer, CanonicalBillingSubscription } from '@elceo/types';
import type { AccountEntitlementRepository, BillingCustomerRepository, BillingLifecycleSubscriptionRepository, BillingReconciliationRunRepository, ExternalBillingEventRepository, ExternalBillingSubscriptionRepository } from '../persistence';
import { BillingProviderPlanMapper } from './provider-mapping';
import { syncEntitlementsFromBilling } from './entitlement-sync';

export class BillingLifecycleReconciliationService {
  constructor(private readonly customers: BillingCustomerRepository, private readonly subs: BillingLifecycleSubscriptionRepository, private readonly runs: BillingReconciliationRunRepository, private readonly externalEvents: ExternalBillingEventRepository, private readonly externalSubs: ExternalBillingSubscriptionRepository, private readonly accountRepo: AccountEntitlementRepository, private readonly mapper: BillingProviderPlanMapper) {}
  async reconcileProviderEvent(providerKind: BillingLifecycleProviderKind, sourceEventId: string, subjectId?: string) {
    const now = new Date().toISOString();
    const ext = await this.externalEvents.getEvent(providerKind === 'stripe' ? 'stripe' : 'manual_test', sourceEventId);
    const resolvedSubjectId = subjectId ?? ext?.subjectId ?? null;
    if (!resolvedSubjectId) throw new Error('subject_unresolved');
    const extSub = ext?.externalSubscriptionId ? await this.externalSubs.getSubscription(providerKind === 'stripe' ? 'stripe' : 'manual_test', ext.externalSubscriptionId) : null;
    const mapped = await this.mapper.mapPlan({ providerKind, providerPriceId: extSub?.externalPriceId ?? null, providerProductId: extSub?.externalProductId ?? null, providerPlanCode: extSub?.providerStatus ?? null });
    const customer: CanonicalBillingCustomer = { customerId: `cust_${resolvedSubjectId}_${providerKind}`, subjectKind:'user', subjectId:resolvedSubjectId, providerKind, providerCustomerId: ext?.externalCustomerId ?? `missing_${resolvedSubjectId}`, state: ext?.externalCustomerId ? 'active':'missing', email:null, createdAt: now, updatedAt: now };
    const subscription: CanonicalBillingSubscription = { subscriptionId:`sub_${resolvedSubjectId}_${providerKind}`, subjectKind:'user', subjectId:resolvedSubjectId, providerKind, providerSubscriptionId: extSub?.externalSubscriptionId ?? `missing_${resolvedSubjectId}`, providerPriceId:extSub?.externalPriceId??null, providerProductId:extSub?.externalProductId??null, providerPlanCode:extSub?.providerStatus??null, canonicalPlanKind:mapped.canonicalPlanKind, planSource:mapped.source, state: extSub?.providerStatus==='trialing'?'trialing':extSub?.providerStatus==='active'?'active':'canceled', currentPeriodStart:extSub?.currentPeriodStart??null,currentPeriodEnd:extSub?.currentPeriodEnd??null, trialEndsAt:extSub?.trialEndsAt??null,canceledAt:null,willCancelAtPeriodEnd:extSub?.cancelAtPeriodEnd??false,latestProviderEventId:sourceEventId,updatedAt:now };
    await this.customers.saveCustomer(customer); await this.subs.saveSubscription(subscription);
    const ent = await syncEntitlementsFromBilling(this.accountRepo, resolvedSubjectId, subscription, now);
    const run: BillingReconciliationRun = { runId:`run_${sourceEventId}`, providerKind, sourceEventId, subjectKind:'user', subjectId:resolvedSubjectId, status:'success', summary:'reconciled', customerChanged:true, subscriptionChanged:true, entitlementChanged:ent.changed, previousPlanKind:ent.previousPlanKind, nextPlanKind:ent.nextPlanKind, startedAt:now, endedAt:now, createdAt:now };
    await this.runs.saveRun({ ...run, runJson: JSON.stringify(run) });
    return { run, customer, subscription, entitlement: ent };
  }
}
