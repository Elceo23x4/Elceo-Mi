import { MemoryAccountEntitlementRepository, MemoryBillingEventRepository, MemoryBillingSubscriptionRepository } from '../persistence/index';
import { CanonicalBillingBoundaryService } from '../runtime/canonical-billing-boundary';
function assert(c:boolean,m:string){if(!c) throw new Error(m);}
export async function runBillingRuntimeCoreTests(): Promise<void> {
  const boundary=new CanonicalBillingBoundaryService(new MemoryBillingSubscriptionRepository(),new MemoryBillingEventRepository(),new MemoryAccountEntitlementRepository());
  await boundary.startTrial('user','u1','premium','2026-12-01T00:00:00.000Z');
  await boundary.activatePaidPlan('user','u1','premium','monthly','2026-12-01T00:00:00.000Z','2027-01-01T00:00:00.000Z');
  await boundary.renewPaidPlan('user','u1','2027-01-01T00:00:00.000Z','2027-02-01T00:00:00.000Z');
  await boundary.changePlan('user','u1','admin_internal','yearly','2027-02-01T00:00:00.000Z','upgrade');
  await boundary.markPastDue('user','u1','2027-02-05T00:00:00.000Z');
  await boundary.cancelAtPeriodEnd('user','u1','2027-02-10T00:00:00.000Z');
  await boundary.pauseSubscription('user','u1','2027-02-11T00:00:00.000Z');
  await boundary.resumeSubscription('user','u1','2027-02-12T00:00:00.000Z');
  await boundary.expireSubscription('user','u1','2027-03-01T00:00:00.000Z');
  const state=await boundary.getBillingCommercialState('user','u1');
  assert(state.currentPlanKind==='free','expired fallback free');
  const events=await boundary.listBillingEventsForSubject('user','u1',20);
  assert(events.length>=9,'events persisted');
  const replay=await boundary.listRecentBillingEventReplays('user','u1',2);
  assert(replay.length===2,'replay list');
}
