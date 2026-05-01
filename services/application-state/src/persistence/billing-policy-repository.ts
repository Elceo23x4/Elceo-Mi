import { queryDb } from '../db/client';
import type { BillingPolicyTransitionRepository, PersistedBillingPolicyTransitionRecord } from './contracts';

const cap=(n?:number)=>Math.max(1,Math.min(200,n??20));
const sorter=(a:PersistedBillingPolicyTransitionRecord,b:PersistedBillingPolicyTransitionRecord)=>Date.parse(b.decidedAt)-Date.parse(a.decidedAt)||a.transitionId.localeCompare(b.transitionId);

export class MemoryBillingPolicyTransitionRepository implements BillingPolicyTransitionRepository {
  private rows=new Map<string,PersistedBillingPolicyTransitionRecord>();
  async saveTransition(r:PersistedBillingPolicyTransitionRecord){this.rows.set(r.transitionId,{...r});}
  async getTransitionById(id:string){return this.rows.get(id)??null;}
  async getLatestTransitionForSubject(subjectKind:'user',subjectId:string){return (await this.listRecentTransitionsForSubject(subjectKind,subjectId,1))[0]??null;}
  async listRecentTransitionsForSubject(subjectKind:'user',subjectId:string,limit?:number){return [...this.rows.values()].filter((r)=>r.subjectKind===subjectKind&&r.subjectId===subjectId).sort(sorter).slice(0,cap(limit));}
  async getLatestTransitionForReconciliationRun(id:string){return [...this.rows.values()].filter((r)=>r.sourceReconciliationRunId===id).sort(sorter)[0]??null;}
}

type Row = { transition_id:string; transition_json:string };
const map=(r:Row):PersistedBillingPolicyTransitionRecord=>JSON.parse(r.transition_json) as PersistedBillingPolicyTransitionRecord;

export class SQLBillingPolicyTransitionRepository implements BillingPolicyTransitionRepository {
  async saveTransition(r:PersistedBillingPolicyTransitionRecord){await queryDb('INSERT INTO app_billing_policy_transitions (transition_id,subject_kind,subject_id,provider_kind,billing_subscription_id,previous_plan_kind,next_plan_kind,previous_account_state,next_account_state,decision_code,severity,restricted_access,recovered_access,source_reconciliation_run_id,rationale,decided_at,transition_json,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18) ON CONFLICT (transition_id) DO UPDATE SET transition_json=EXCLUDED.transition_json,decided_at=EXCLUDED.decided_at,severity=EXCLUDED.severity,decision_code=EXCLUDED.decision_code',[r.transitionId,r.subjectKind,r.subjectId,r.providerKind,r.billingSubscriptionId,r.previousPlanKind,r.nextPlanKind,r.previousAccountState,r.nextAccountState,r.decisionCode,r.severity,r.restrictedAccess,r.recoveredAccess,r.sourceReconciliationRunId,r.rationale,r.decidedAt,JSON.stringify(r),r.createdAt]);}
  async getTransitionById(id:string){const rows=await queryDb<Row>('SELECT transition_id, transition_json::text AS transition_json FROM app_billing_policy_transitions WHERE transition_id=$1',[id]); return rows[0]?map(rows[0]):null;}
  async getLatestTransitionForSubject(subjectKind:'user',subjectId:string){const rows=await this.listRecentTransitionsForSubject(subjectKind,subjectId,1); return rows[0]??null;}
  async listRecentTransitionsForSubject(subjectKind:'user',subjectId:string,limit?:number){const rows=await queryDb<Row>('SELECT transition_id, transition_json::text AS transition_json FROM app_billing_policy_transitions WHERE subject_kind=$1 AND subject_id=$2 ORDER BY decided_at DESC, transition_id ASC LIMIT $3',[subjectKind,subjectId,cap(limit)]); return rows.map(map);}
  async getLatestTransitionForReconciliationRun(id:string){const rows=await queryDb<Row>('SELECT transition_id, transition_json::text AS transition_json FROM app_billing_policy_transitions WHERE source_reconciliation_run_id=$1 ORDER BY decided_at DESC, transition_id ASC LIMIT 1',[id]); return rows[0]?map(rows[0]):null;}
}
