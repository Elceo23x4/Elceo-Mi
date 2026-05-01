import { BillingLifecycleQueryService } from '../billing/query-service';
import { BillingPolicyQueryService } from '../billing-policy/query-service';
import { MemoryBillingCustomerRepository, MemoryBillingLifecycleSubscriptionRepository, MemoryBillingReconciliationRunRepository, SQLBillingCustomerRepository, SQLBillingLifecycleSubscriptionRepository, SQLBillingReconciliationRunRepository } from '../persistence/billing-lifecycle-repository';
import { MemoryBillingPolicyTransitionRepository, SQLBillingPolicyTransitionRepository } from '../persistence/billing-policy-repository';
import { MemoryAccountEntitlementRepository, SQLAccountEntitlementRepository } from '../persistence/entitlements-repository';
import { BillingAdminQueryService } from '../billing-admin/query-service';

const isSql=process.env.APP_STATE_REPOSITORY==='sql';
const customers=isSql?new SQLBillingCustomerRepository():new MemoryBillingCustomerRepository();
const subs=isSql?new SQLBillingLifecycleSubscriptionRepository():new MemoryBillingLifecycleSubscriptionRepository();
const runs=isSql?new SQLBillingReconciliationRunRepository():new MemoryBillingReconciliationRunRepository();
const transitions=isSql?new SQLBillingPolicyTransitionRepository():new MemoryBillingPolicyTransitionRepository();
const entitlements=isSql?new SQLAccountEntitlementRepository():new MemoryAccountEntitlementRepository();

export class CanonicalBillingAdminBoundaryService {
  private readonly query=new BillingAdminQueryService(new BillingLifecycleQueryService(customers,subs,runs,entitlements),new BillingPolicyQueryService(customers,subs,transitions,entitlements));
  getBillingAdminOperationalSummary(){return this.query.getBillingAdminOperationalSummary();}
  listRecentBillingReconciliationFailures(limit?:number){void limit; return this.query.listRecentBillingReconciliationFailures();}
  listBillingRetryCandidates(limit?:number){void limit; return this.query.listBillingRetryCandidates();}
  getBillingAdminSubjectSnapshot(subjectKind:'user',subjectId:string){return this.query.getBillingAdminSubjectSnapshot(subjectKind,subjectId);}
}
