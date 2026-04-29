import { randomUUID } from 'crypto';
import type { OpsJobKind, OpsJobRunReport, OpsJobScope, OpsJobTriggerKind } from '@elceo/types';
import { buildLeaseExpiry } from './lease-policy';
import { buildBlockedOpsRunReport, buildFailedOpsRunReport, buildOpsMetricsJson, buildSuccessfulOpsRunReport, mapMetricsForJobKind } from './report-helpers';
import { createDefaultIngestionTickAdapter, createDefaultNotificationDispatchAdapter, createDefaultNotificationFeedbackAdapter, createDefaultNotificationVerificationExpiryAdapter, createDefaultSnapshotRefreshAdapter, createDefaultWorkspaceMaintenanceAdapter } from './default-adapters';
import { getOpsJobLeaseRepository, getOpsJobRunRepository } from '../persistence/ops-runtime-repository';

export async function runOpsJob(params:{jobKind:OpsJobKind;triggerKind:OpsJobTriggerKind;scopeKind:OpsJobScope;scopeKey:string;holderId:string;payload?:Record<string,unknown>;startedAt?:string;}):Promise<OpsJobRunReport>{
 const now=params.startedAt??new Date().toISOString(); const leaseRepo=getOpsJobLeaseRepository(); const runRepo=getOpsJobRunRepository(); await leaseRepo.cleanupExpiredLeases(now);
 const lease={leaseId:randomUUID(),jobKind:params.jobKind,scopeKind:params.scopeKind,scopeKey:params.scopeKey,leaseState:'acquired' as const,acquiredAt:now,expiresAt:buildLeaseExpiry(now,params.jobKind),releasedAt:null,holderId:params.holderId,createdAt:now};
 const acquire=await leaseRepo.acquireLease(lease); const runId=randomUUID();
 if(!acquire.acquired){const end=new Date().toISOString(); const report=buildBlockedOpsRunReport({runId,jobKind:params.jobKind,triggerKind:params.triggerKind,scopeKind:params.scopeKind,scopeKey:params.scopeKey,startedAt:now,endedAt:end,metricsJson:buildOpsMetricsJson({blocked:true})}); await runRepo.saveRun({...map(report),reportJson:JSON.stringify(report)}); return report;}
 try{let result:unknown={completed:true};
 if(params.jobKind==='snapshot_refresh') result=await createDefaultSnapshotRefreshAdapter().run('user',params.scopeKey,'scheduled',now);
 if(params.jobKind==='workspace_maintenance') result=await createDefaultWorkspaceMaintenanceAdapter().run('user',params.scopeKey,now);
 if(params.jobKind==='notification_dispatch') result=await createDefaultNotificationDispatchAdapter().run();
 if(params.jobKind==='notification_verification_expiry') result=await createDefaultNotificationVerificationExpiryAdapter().run();
 if(params.jobKind==='notification_feedback_ingest') result=await createDefaultNotificationFeedbackAdapter().run('unknown','in_app',{});
 if(params.jobKind==='ingestion_tick') result=await createDefaultIngestionTickAdapter().run(params.triggerKind,now);
 const end=new Date().toISOString(); const report=buildSuccessfulOpsRunReport({runId,jobKind:params.jobKind,triggerKind:params.triggerKind,scopeKind:params.scopeKind,scopeKey:params.scopeKey,startedAt:now,endedAt:end,metricsJson:buildOpsMetricsJson(mapMetricsForJobKind(params.jobKind,result))}); await runRepo.saveRun({...map(report),reportJson:JSON.stringify(report)}); await leaseRepo.releaseLease(lease.leaseId,end); return report;
 }catch(err){const end=new Date().toISOString(); const report=buildFailedOpsRunReport({runId,jobKind:params.jobKind,triggerKind:params.triggerKind,scopeKind:params.scopeKind,scopeKey:params.scopeKey,startedAt:now,endedAt:end,failureReason:err instanceof Error?err.message:'unknown_error',metricsJson:buildOpsMetricsJson({completed:false})}); await runRepo.saveRun({...map(report),reportJson:JSON.stringify(report)}); await leaseRepo.releaseLease(lease.leaseId,end); return report;}
}
function map(r:OpsJobRunReport){return {runId:r.runId,jobKind:r.jobKind,triggerKind:r.triggerKind,scopeKind:r.scopeKind,scopeKey:r.scopeKey,startedAt:r.startedAt,endedAt:r.endedAt,durationMs:r.durationMs,status:r.status,warningsJson:JSON.stringify(r.warnings),failureReason:r.failureReason,childReportIdsJson:JSON.stringify(r.childReportIds),metricsJson:r.metricsJson,createdAt:r.createdAt};}
