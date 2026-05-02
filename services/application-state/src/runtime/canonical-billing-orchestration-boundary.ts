import { BillingOrchestrationExecutionService, BillingOrchestrationQueryService, getBillingOrchestrationSubjectSnapshot } from '../billing-orchestration';
import type { BillingAdminQueryService } from '../billing-admin/query-service';
import type { BillingLifecycleQueryService } from '../billing/query-service';
import type { BillingPolicyQueryService } from '../billing-policy/query-service';
export class CanonicalBillingOrchestrationBoundaryService { constructor(private execution:BillingOrchestrationExecutionService, private query:BillingOrchestrationQueryService, private admin:BillingAdminQueryService, private lifecycle:BillingLifecycleQueryService, private policy:BillingPolicyQueryService){}
 runRetryForSubject(subjectKind:'user',subjectId:string){return this.execution.runBillingRetryOrchestration({subjectKind,subjectId});}
 getLatestBillingOrchestrationRun(subjectKind:'user',subjectId:string){return this.query.getLatestBillingOrchestrationRun(subjectKind,subjectId);} 
 listRecentBillingOrchestrationRuns(subjectKind:'user',subjectId:string,limit?:number){return this.query.listRecentBillingOrchestrationRuns(subjectKind,subjectId,limit);} 
 getBillingOrchestrationSubjectSnapshot(subjectKind:'user',subjectId:string){return getBillingOrchestrationSubjectSnapshot(subjectKind,subjectId,this.query,this.admin,this.lifecycle,this.policy);} }
