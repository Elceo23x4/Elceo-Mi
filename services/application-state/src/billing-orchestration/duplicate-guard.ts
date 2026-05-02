import type { BillingRetryPlan } from '@elceo/types';
import type { BillingOrchestrationRunRepository } from '../persistence';
import { BILLING_ORCHESTRATION_DUPLICATE_WINDOW_MS } from './constants';
export const isDuplicateRetryPlan=async(repo:BillingOrchestrationRunRepository,plan:BillingRetryPlan,nowIso:string)=>{const prev=await repo.getLatestRunForRetrySource(plan.sourceReconciliationRunId,plan.sourcePolicyTransitionId); if(!prev||prev.subjectId!==plan.subjectId||prev.subjectKind!==plan.subjectKind) return false; return Date.parse(nowIso)-Date.parse(prev.createdAt)<=BILLING_ORCHESTRATION_DUPLICATE_WINDOW_MS;};
