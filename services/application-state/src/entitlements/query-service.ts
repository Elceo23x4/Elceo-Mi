import type { AccountEntitlementRepository, FeatureAccessDecisionRepository, UsageCounterRepository } from '../persistence';
import { AccountEntitlementService } from './account-service';
export class EntitlementQueryService { constructor(private readonly accountRepo:AccountEntitlementRepository, private readonly usageRepo:UsageCounterRepository, private readonly decisionRepo:FeatureAccessDecisionRepository){}
 async getAccountEntitlementState(subjectKind:'user',subjectId:string){ return new AccountEntitlementService(this.accountRepo).getOrCreateDefaultAccountEntitlement(subjectKind,subjectId); }
 async getCurrentEntitlementProfile(subjectKind:'user',subjectId:string,asOfIso=new Date().toISOString()){ const s=await this.getAccountEntitlementState(subjectKind,subjectId); return new AccountEntitlementService(this.accountRepo).getPlanEntitlementProfile(s.planKind,s.accountState,asOfIso); }
 listUsageCounters(subjectKind:'user',subjectId:string){ return this.usageRepo.listUsageCountersForSubject(subjectKind,subjectId); }
 listRecentAccessDecisions(subjectKind:'user',subjectId:string,limit?:number){ return this.decisionRepo.listRecentDecisions(subjectKind,subjectId,limit); }
 getLatestDecisionForFeature(subjectKind:'user',subjectId:string,feature:Parameters<FeatureAccessDecisionRepository['getLatestDecisionForFeature']>[2]){ return this.decisionRepo.getLatestDecisionForFeature(subjectKind,subjectId,feature); }
}
