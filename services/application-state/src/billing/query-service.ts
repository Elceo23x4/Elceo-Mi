import type { BillingCommercialState } from '@elceo/types';
import type { AccountEntitlementRepository, BillingCustomerRepository, BillingEventRepository, BillingLifecycleSubscriptionRepository, BillingReconciliationRunRepository, BillingSubscriptionRepository } from '../persistence';
import type { BillingLifecycleSnapshot } from '@elceo/types';

export class BillingQueryService {
  constructor(private readonly subs: BillingSubscriptionRepository, private readonly events: BillingEventRepository) {}
  async getLatestBillingSubscription(subjectKind:'user',subjectId:string){ return this.subs.getLatestSubscriptionForSubject(subjectKind,subjectId); }
  listBillingEventsForSubject(subjectKind:'user',subjectId:string,limit?:number){ return this.events.listEventsForSubject(subjectKind,subjectId,limit); }
  async getBillingCommercialState(subjectKind:'user',subjectId:string,_asOfIso?:string): Promise<BillingCommercialState> { const sub=await this.getLatestBillingSubscription(subjectKind,subjectId); const fallbackFree = sub?.subscriptionState === 'expired' || sub?.subscriptionState === 'canceled' || sub?.subscriptionState === 'past_due';
    const currentPlanKind = fallbackFree ? 'free' : (sub?.planKind ?? 'free');
    return {subjectKind,subjectId,currentPlanKind,subscriptionState:sub?.subscriptionState??null,accountState:'active',trialActive:sub?.subscriptionState==='trialing',trialEndsAt:sub?.trialEndsAt??null,cancelAtPeriodEnd:sub?.cancelAtPeriodEnd??false,currentPeriodEnd:sub?.currentPeriodEnd??null,providerKind:sub?.providerKind??null,generatedAt:new Date().toISOString()}; }
}

export class BillingLifecycleQueryService {
  constructor(private readonly customers: BillingCustomerRepository, private readonly subs: BillingLifecycleSubscriptionRepository, private readonly runs: BillingReconciliationRunRepository, private readonly accounts: AccountEntitlementRepository) {}
  getBillingCustomer(subjectKind:'user',subjectId:string){ return this.customers.getCustomerBySubject(subjectKind,subjectId); }
  getBillingSubscription(subjectKind:'user',subjectId:string){ return this.subs.getSubscriptionBySubject(subjectKind,subjectId); }
  getLatestBillingReconciliationRun(subjectKind:'user',subjectId:string){ return this.runs.getLatestRunForSubject(subjectKind,subjectId); }
  listRecentBillingReconciliationRuns(subjectKind:'user',subjectId:string,limit?:number){ return this.runs.listRecentRunsForSubject(subjectKind,subjectId,limit); }
  async getBillingLifecycleSnapshot(subjectKind:'user',subjectId:string): Promise<BillingLifecycleSnapshot> { const [customer,subscription,latestRun,entitlement]=await Promise.all([this.getBillingCustomer(subjectKind,subjectId),this.getBillingSubscription(subjectKind,subjectId),this.getLatestBillingReconciliationRun(subjectKind,subjectId),this.accounts.getAccountEntitlement(subjectKind,subjectId)]); return {generatedAt:new Date().toISOString(),subjectKind,subjectId,customer,subscription,entitlementState: entitlement ?? {subjectKind:'user',subjectId,planKind:'free',accountState:'active',planStartedAt:null,planEndsAt:null,trialEndsAt:null,internalOverride:false,updatedAt:new Date().toISOString()},latestReconciliationRunId:latestRun?.runId??null}; }
}
