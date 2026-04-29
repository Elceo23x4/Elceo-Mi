import type { FeatureAccessDecisionRepository } from '../persistence';
import { deserializeFeatureDecision } from './serialization';
export class EntitlementReplayService { constructor(private readonly decisionRepo: FeatureAccessDecisionRepository) {}
  async getLatestFeatureAccessDecisionReplay(subjectKind:'user',subjectId:string,feature:Parameters<FeatureAccessDecisionRepository['getLatestDecisionForFeature']>[2]){ const row=await this.decisionRepo.getLatestDecisionForFeature(subjectKind,subjectId,feature); if(!row) return null; return {record: row, decision: deserializeFeatureDecision(row.decisionJson)}; }
  async listRecentFeatureAccessDecisionReplays(subjectKind:'user',subjectId:string,limit?:number){ const rows=await this.decisionRepo.listRecentDecisions(subjectKind,subjectId,limit); return rows.map((r)=>({record:r, decision: deserializeFeatureDecision(r.decisionJson)})); }
}
