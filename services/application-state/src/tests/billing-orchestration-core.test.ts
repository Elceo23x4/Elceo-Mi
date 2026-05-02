import assert from 'node:assert/strict';
import { buildBillingRetryPlan, isDuplicateRetryPlan, BillingOrchestrationExecutionService, BillingOrchestrationQueryService, getLatestBillingOrchestrationReplay } from '../billing-orchestration/index';
import { MemoryBillingOrchestrationRunRepository } from '../persistence/billing-orchestration-repository';

export async function runBillingOrchestrationCoreTests(){
  const now=new Date().toISOString();
  const candidate={candidateId:'c1',subjectKind:'user',subjectId:'u1',providerKind:'stripe',reason:'latest_reconciliation_failed',latestReconciliationRunId:'r1',latestPolicyTransitionId:null,latestSubscriptionState:'past_due',currentPlanKind:'premium',currentAccountState:'restricted',createdAt:now} as const;
  const plan=buildBillingRetryPlan(candidate,{runId:'r1',providerKind:'stripe',sourceEventId:'evt1',subjectKind:'user',subjectId:'u1',status:'success',summary:'ok',customerChanged:false,subscriptionChanged:false,entitlementChanged:false,previousPlanKind:'premium',nextPlanKind:'premium',startedAt:now,endedAt:now,createdAt:now},null,now);
  assert.equal(plan.providerKind,'stripe'); assert.equal(plan.retryable,true);
  const noCtx=buildBillingRetryPlan({...candidate,latestReconciliationRunId:null,latestPolicyTransitionId:null},null,null,now); assert.equal(noCtx.retryable,false);
  const repo=new MemoryBillingOrchestrationRunRepository();
  await repo.saveRun({runId:'run1',subjectKind:'user',subjectId:'u1',providerKind:'stripe',retryPlanJson:JSON.stringify(plan),status:'success',changedLifecycle:false,changedPolicy:false,changedEntitlement:false,sourceReconciliationRunId:plan.sourceReconciliationRunId,sourcePolicyTransitionId:plan.sourcePolicyTransitionId,startedAt:now,endedAt:now,runJson:JSON.stringify({runId:'run1',subjectKind:'user',subjectId:'u1',providerKind:'stripe',retryPlan:plan,status:'success',changedLifecycle:false,changedPolicy:false,changedEntitlement:false,latestReconciliationRunId:null,latestPolicyTransitionId:null,startedAt:now,endedAt:now,steps:[],createdAt:now}),createdAt:now});
  assert.equal(await isDuplicateRetryPlan(repo,plan,new Date(Date.parse(now)+60_000).toISOString()),true);
  assert.equal(await isDuplicateRetryPlan(repo,{...plan,sourceReconciliationRunId:'other'},new Date(Date.parse(now)+60_000).toISOString()),false);
  const query=new BillingOrchestrationQueryService(repo); assert.equal((await query.getLatestBillingOrchestrationRun('user','u1'))?.runId,'run1');
  assert.equal((await getLatestBillingOrchestrationReplay(repo,'user','u1'))?.runId,'run1');
  const exec=new BillingOrchestrationExecutionService(repo,{listBillingRetryCandidates:async()=>[candidate]} as never,{getLatestBillingReconciliationRun:async()=>null,reconcileProviderEvent:async()=>{throw new Error('x');}} as never,{getLatestBillingPolicyTransition:async()=>null,evaluateBillingPolicyForSubject:async()=>{throw new Error('x');}} as never);
  const run=await exec.runBillingRetryOrchestration({subjectKind:'user',subjectId:'u1',explicitPlan:noCtx});
  assert.equal(run.status,'skipped');
}
