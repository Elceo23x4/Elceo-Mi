import { BillingLifecycleQueryService } from '../billing/query-service';
import { BillingPolicyQueryService } from '../billing-policy/query-service';
import type { BillingAdminOperationalSummary, BillingAdminSubjectSnapshot, BillingReconciliationFailureRecord, BillingRetryCandidate } from '@elceo/types';
import { buildOperationalSummary } from './operational-summary';
import { classifyFailure } from './failure-classifier';
import { buildRetryCandidates } from './retry-candidates';
import { buildSubjectSnapshot } from './subject-snapshot';
export class BillingAdminQueryService { constructor(private lifecycle:BillingLifecycleQueryService, private policy:BillingPolicyQueryService){}
  async getBillingAdminOperationalSummary():Promise<BillingAdminOperationalSummary>{ return buildOperationalSummary({generatedAt:new Date().toISOString(),totalSubjectsWithBillingState:0,activePremiumCount:0,trialingPremiumCount:0,restrictedPremiumCount:0,freeFallbackCount:0,failedRecentReconciliations:0,degradedRecentReconciliations:0,providerMappingFallbackCount:0,recentPolicyRestrictionCount:0,recentRecoveredCount:0,latestReconciliationStatus:null,latestPolicyDecisionCode:null}); }
  async listRecentBillingReconciliationFailures():Promise<BillingReconciliationFailureRecord[]>{return [];}
  async listBillingRetryCandidates():Promise<BillingRetryCandidate[]>{return buildRetryCandidates([],new Map(),new Map());}
  async getBillingAdminSubjectSnapshot(subjectKind:'user',subjectId:string):Promise<BillingAdminSubjectSnapshot>{ const lifecycleSnapshot=await this.lifecycle.getBillingLifecycleSnapshot(subjectKind,subjectId); const policySnapshot=await this.policy.getBillingPolicySnapshot(subjectKind,subjectId); const latestRun=await this.lifecycle.getLatestBillingReconciliationRun(subjectKind,subjectId); const latestTransition=await this.policy.getLatestBillingPolicyTransition(subjectKind,subjectId); return buildSubjectSnapshot(subjectId,lifecycleSnapshot,policySnapshot,latestRun,latestTransition); }
}
export { classifyFailure };
