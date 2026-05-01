import type { BillingLifecycleProviderKind } from '@elceo/types';
import { BillingLifecycleQueryService, BillingLifecycleReconciliationService, BillingLifecycleReplayService } from '../billing';

export class CanonicalBillingLifecycleBoundaryService {
  constructor(private readonly reconciliation: BillingLifecycleReconciliationService, private readonly query: BillingLifecycleQueryService, private readonly replay: BillingLifecycleReplayService) {}
  reconcileProviderEvent(providerKind: BillingLifecycleProviderKind, sourceEventId: string, subjectId?: string) { return this.reconciliation.reconcileProviderEvent(providerKind, sourceEventId, subjectId); }
  getBillingLifecycleSnapshot(subjectKind:'user',subjectId:string){ return this.query.getBillingLifecycleSnapshot(subjectKind,subjectId); }
  getBillingCustomer(subjectKind:'user',subjectId:string){ return this.query.getBillingCustomer(subjectKind,subjectId); }
  getBillingSubscription(subjectKind:'user',subjectId:string){ return this.query.getBillingSubscription(subjectKind,subjectId); }
  getLatestBillingReconciliationRun(subjectKind:'user',subjectId:string){ return this.query.getLatestBillingReconciliationRun(subjectKind,subjectId); }
  listRecentBillingReconciliationRuns(subjectKind:'user',subjectId:string,limit?:number){ return this.query.listRecentBillingReconciliationRuns(subjectKind,subjectId,limit); }
}
