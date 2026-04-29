import type { OpsJobKind, OpsJobScope } from '@elceo/types';
import type { OpsJobRunListQuery } from '../persistence/contracts';
import { getOpsJobLeaseRepository, getOpsJobRunRepository } from '../persistence/ops-runtime-repository';
import { deserializeOpsJobRunReport } from './serialization';
export async function getOpsJobRunReplayById(runId:string){const r=await getOpsJobRunRepository().getRunById(runId); if(!r) return null; return {record:r,report:deserializeOpsJobRunReport(r.reportJson)};}
export async function getLatestOpsJobRunReplay(jobKind:OpsJobKind,scopeKind:OpsJobScope,scopeKey:string){const r=await getOpsJobRunRepository().getLatestRun(jobKind,scopeKind,scopeKey); if(!r) return null; return {record:r,report:deserializeOpsJobRunReport(r.reportJson)};}
export async function listRecentOpsJobRunReplays(query:OpsJobRunListQuery={}){const rows=await getOpsJobRunRepository().listRecentRuns(query); return rows.map((r)=>({record:r,report:deserializeOpsJobRunReport(r.reportJson)}));}
export async function listStaleLeaseReplays(asOfIso:string){return getOpsJobLeaseRepository().listStaleLeases(asOfIso)}
