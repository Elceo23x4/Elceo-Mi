import { BillingPolicyQueryService, BillingPolicyTransitionService } from '../billing-policy';

export class CanonicalBillingPolicyBoundaryService {
  constructor(private transitions: BillingPolicyTransitionService, private query: BillingPolicyQueryService) {}
  evaluateBillingPolicyForSubject(subjectKind:'user', subjectId:string, sourceReconciliationRunId?:string){ return this.transitions.evaluateAndPersistBillingPolicy({subjectKind,subjectId,sourceReconciliationRunId:sourceReconciliationRunId??null}); }
  getLatestBillingPolicyTransition(subjectKind:'user',subjectId:string){ return this.query.getLatestBillingPolicyTransition(subjectKind,subjectId); }
  listRecentBillingPolicyTransitions(subjectKind:'user',subjectId:string,limit?:number){ return this.query.listRecentBillingPolicyTransitions(subjectKind,subjectId,limit); }
  getBillingPolicySnapshot(subjectKind:'user',subjectId:string){ return this.query.getBillingPolicySnapshot(subjectKind,subjectId); }
}
