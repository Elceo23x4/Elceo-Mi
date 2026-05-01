import assert from 'node:assert/strict';
import { buildOperationalSummary } from '../billing-admin/operational-summary';
import { classifyFailure } from '../billing-admin/failure-classifier';
import { buildRetryCandidates } from '../billing-admin/retry-candidates';
import { buildSubjectSnapshot } from '../billing-admin/subject-snapshot';
import { CanonicalBillingAdminBoundaryService } from '../runtime/canonical-billing-admin-boundary';

export async function runBillingAdminCoreTests(){
  const healthy=buildOperationalSummary({generatedAt:new Date().toISOString(),totalSubjectsWithBillingState:1,activePremiumCount:1,trialingPremiumCount:0,restrictedPremiumCount:0,freeFallbackCount:0,failedRecentReconciliations:0,degradedRecentReconciliations:0,providerMappingFallbackCount:0,recentPolicyRestrictionCount:0,recentRecoveredCount:0,latestReconciliationStatus:null,latestPolicyDecisionCode:null});
  assert.equal(healthy.healthState,'healthy');
  const critical=buildOperationalSummary({...healthy,failedRecentReconciliations:2,freeFallbackCount:1}); assert.equal(critical.healthState,'critical');
  const degraded=buildOperationalSummary({...healthy,restrictedPremiumCount:1}); assert.equal(degraded.healthState,'degraded');
  const run={runId:'r1',providerKind:'stripe',sourceEventId:'e1',subjectKind:'user',subjectId:'u1',status:'failed',summary:'subject missing',customerChanged:false,subscriptionChanged:false,entitlementChanged:false,previousPlanKind:null,nextPlanKind:null,startedAt:new Date().toISOString(),endedAt:new Date().toISOString(),createdAt:new Date().toISOString() } as const;
  assert.equal(classifyFailure(run,null).failureKind,'subject_resolution_failed');
  const cands=buildRetryCandidates([run],new Map(),new Map()); assert.equal(cands[0]?.reason,'latest_reconciliation_failed');
  const ss=buildSubjectSnapshot('u1',{generatedAt:new Date().toISOString(),subjectKind:'user',subjectId:'u1',customer:null,subscription:null,entitlementState:{subjectKind:'user',subjectId:'u1',planKind:'free',accountState:'active',internalOverride:false,planStartedAt:null,planEndsAt:null,trialEndsAt:null,updatedAt:new Date().toISOString()},latestReconciliationRunId:null},{generatedAt:new Date().toISOString(),subjectKind:'user',subjectId:'u1',customer:null,subscription:null,entitlementState:{subjectKind:'user',subjectId:'u1',planKind:'free',accountState:'active',internalOverride:false,planStartedAt:null,planEndsAt:null,trialEndsAt:null,updatedAt:new Date().toISOString()},latestPolicyTransition:null},null,null);
  assert.equal(ss.subjectId,'u1');
  const boundary=new CanonicalBillingAdminBoundaryService(); assert.ok(boundary.getBillingAdminOperationalSummary);
}
