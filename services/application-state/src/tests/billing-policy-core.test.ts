import assert from 'node:assert/strict';
import { evaluateBillingPolicy } from '../billing-policy/policy-engine';
import { syncAccountState } from '../billing-policy/account-sync';
import { BillingPolicyTransitionService } from '../billing-policy/transition-service';
import { BillingPolicyQueryService } from '../billing-policy/query-service';
import { BillingPolicyReplayService } from '../billing-policy/replay';
import { CanonicalBillingPolicyBoundaryService } from '../runtime/canonical-billing-policy-boundary';
import { MemoryBillingCustomerRepository, MemoryBillingLifecycleSubscriptionRepository } from '../persistence/billing-lifecycle-repository';
import { MemoryBillingPolicyTransitionRepository } from '../persistence/billing-policy-repository';
import { MemoryAccountEntitlementRepository } from '../persistence/entitlements-repository';

export async function runBillingPolicyCoreTests(): Promise<void> {
  const ent={subjectKind:'user' as const,subjectId:'u1',planKind:'free' as const,accountState:'active' as const,planStartedAt:null,planEndsAt:null,trialEndsAt:null,internalOverride:false,updatedAt:new Date().toISOString()};
  const activeSub={subscriptionId:'s1',subjectKind:'user' as const,subjectId:'u1',providerKind:'stripe' as const,providerSubscriptionId:'p1',providerPriceId:null,providerProductId:null,providerPlanCode:null,canonicalPlanKind:'premium' as const,planSource:'provider_mapping' as const,state:'active' as const,currentPeriodStart:null,currentPeriodEnd:null,trialEndsAt:null,canceledAt:null,willCancelAtPeriodEnd:false,latestProviderEventId:null,updatedAt:new Date().toISOString()};
  assert.equal(evaluateBillingPolicy(activeSub,ent,new Date().toISOString(),false).decisionCode,'premium_active_ok');
  assert.equal(evaluateBillingPolicy({...activeSub,state:'trialing'},ent,new Date().toISOString(),false).decisionCode,'premium_trial_ok');
  assert.equal(evaluateBillingPolicy({...activeSub,state:'paused'},ent,new Date().toISOString(),false).restrictedAccess,true);
  assert.equal(evaluateBillingPolicy({...activeSub,state:'past_due'},ent,new Date().toISOString(),false).decisionCode,'premium_past_due_restricted');
  assert.equal(evaluateBillingPolicy({...activeSub,state:'incomplete'},ent,new Date().toISOString(),false).decisionCode,'premium_incomplete_restricted');
  assert.equal(evaluateBillingPolicy({...activeSub,state:'incomplete_expired'},ent,new Date().toISOString(),false).nextPlanKind,'free');
  assert.equal(evaluateBillingPolicy({...activeSub,state:'canceled'},ent,new Date().toISOString(),false).decisionCode,'premium_canceled_free_fallback');
  assert.equal(evaluateBillingPolicy(null,{...ent,planKind:'admin_internal',internalOverride:true},new Date().toISOString(),true).decisionCode,'admin_internal_override_preserved');
  assert.equal(evaluateBillingPolicy(activeSub,{...ent,accountState:'restricted'},new Date().toISOString(),false).decisionCode,'premium_recovered_to_active');
  assert.equal(syncAccountState({...ent,accountState:'suspended'},evaluateBillingPolicy({...activeSub,state:'paused'},ent,new Date().toISOString(),false),false).nextAccountState,'suspended');

  const customers=new MemoryBillingCustomerRepository(); const subs=new MemoryBillingLifecycleSubscriptionRepository(); const transitions=new MemoryBillingPolicyTransitionRepository(); const accounts=new MemoryAccountEntitlementRepository();
  await accounts.saveAccountEntitlement(ent); await subs.saveSubscription(activeSub);
  const ts=new BillingPolicyTransitionService(customers,subs,transitions,accounts); const q=new BillingPolicyQueryService(customers,subs,transitions,accounts); const r=new BillingPolicyReplayService(transitions); const b=new CanonicalBillingPolicyBoundaryService(ts,q);
  const first=await ts.evaluateAndPersistBillingPolicy({subjectKind:'user',subjectId:'u1'}); assert.ok(first.transition.transitionId);
  assert.equal((await q.getLatestBillingPolicyTransition('user','u1'))?.transitionId,first.transition.transitionId);
  assert.equal((await r.getLatestBillingPolicyTransitionReplay('user','u1'))?.transitionId,first.transition.transitionId);
  assert.equal((await b.getBillingPolicySnapshot('user','u1')).latestPolicyTransition?.transitionId,first.transition.transitionId);
}
