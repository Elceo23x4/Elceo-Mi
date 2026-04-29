import type { OpsJobHealthSummary, OpsJobKind, OpsJobScope } from '@elceo/types';
import type { OpsJobRunListQuery } from '../persistence/contracts';
import { getOpsJobLeaseRepository, getOpsJobRunRepository } from '../persistence/ops-runtime-repository';
import { deserializeOpsJobRunReport } from './serialization';
import { OPS_HEALTH_LOOKBACK_HOURS_DEFAULT } from './constants';

export class OpsQueryService {
 async getOpsJobRun(runId:string){const r=await getOpsJobRunRepository().getRunById(runId); return r?deserializeOpsJobRunReport(r.reportJson):null}
 async getLatestOpsJobRun(jobKind:OpsJobKind, scopeKind:OpsJobScope, scopeKey:string){const r=await getOpsJobRunRepository().getLatestRun(jobKind,scopeKind,scopeKey); return r?deserializeOpsJobRunReport(r.reportJson):null}
 async listRecentOpsJobRuns(query:OpsJobRunListQuery={}){return (await getOpsJobRunRepository().listRecentRuns(query)).map((r)=>deserializeOpsJobRunReport(r.reportJson))}
 async listRecentFailedOpsJobRuns(limit?:number){return (await getOpsJobRunRepository().listRecentFailedRuns(limit)).map((r)=>deserializeOpsJobRunReport(r.reportJson))}
 async listStaleOpsLeases(asOfIso=new Date().toISOString()){return getOpsJobLeaseRepository().listStaleLeases(asOfIso)}
 async getOpsJobHealthSummary(asOfIso=new Date().toISOString(), lookbackHours=OPS_HEALTH_LOOKBACK_HOURS_DEFAULT):Promise<OpsJobHealthSummary>{const since=new Date(Date.parse(asOfIso)-lookbackHours*3600_000).toISOString(); const rows=await getOpsJobRunRepository().listRecentRuns({limit:500}); const recent=rows.filter((r)=>Date.parse(r.createdAt)>=Date.parse(since)); const failed=recent.filter((r)=>r.status==='failed'); return {generatedAt:asOfIso,totalRecentRuns:recent.length,failedRecentRuns:failed.length,partialRecentRuns:recent.filter((r)=>r.status==='partial_success').length,blockedRecentRuns:recent.filter((r)=>r.status==='skipped').length,mostRecentFailureJobKind:failed[0]?.jobKind??null,staleLeaseCount:(await this.listStaleOpsLeases(asOfIso)).length}; }
}
