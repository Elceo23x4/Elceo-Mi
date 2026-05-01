import { validateBillingReconciliationRun } from '@elceo/schemas';
import type { BillingReconciliationRun } from '@elceo/types';
import type { BillingEventRepository, BillingReconciliationRunRepository, BillingSubscriptionRepository } from '../persistence';

export class BillingReplayService {
  constructor(private readonly subs: BillingSubscriptionRepository, private readonly events: BillingEventRepository) {}
  getLatestBillingSubscriptionReplay(subjectKind:'user',subjectId:string){ return this.subs.getLatestSubscriptionForSubject(subjectKind,subjectId); }
  listRecentBillingEventReplays(subjectKind:'user',subjectId:string,limit?:number){ return this.events.listEventsForSubject(subjectKind,subjectId,limit); }
}

export class BillingLifecycleReplayService { constructor(private readonly runs: BillingReconciliationRunRepository) {}
  async getLatestBillingReconciliationReplay(subjectKind:'user',subjectId:string): Promise<BillingReconciliationRun | null> { const row = await this.runs.getLatestRunForSubject(subjectKind, subjectId); if (!row) return null; const parsed: unknown = JSON.parse(row.runJson); const validated = validateBillingReconciliationRun(parsed); if (!validated.ok) throw new Error('invalid_reconciliation_run_json'); return validated.value; }
  async listRecentBillingReconciliationReplays(subjectKind:'user',subjectId:string,limit?:number): Promise<BillingReconciliationRun[]> { const rows = await this.runs.listRecentRunsForSubject(subjectKind, subjectId, limit); return rows.map((row) => { const parsed: unknown = JSON.parse(row.runJson); const validated = validateBillingReconciliationRun(parsed); if (!validated.ok) throw new Error('invalid_reconciliation_run_json'); return validated.value; }); }
}
