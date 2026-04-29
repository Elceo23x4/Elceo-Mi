import type { OpsJobKind, OpsJobScope, OpsJobTriggerKind } from '@elceo/types';
import type { OpsJobRunListQuery } from '../persistence/contracts';
import { runOpsJob } from '../ops/job-service';
import { OpsQueryService } from '../ops/query-service';
import { runScheduledOpsCycle, runSubjectMaintenanceCycle } from '../ops/scheduler-service';

export class CanonicalOpsBoundaryService {
  private readonly query=new OpsQueryService();
  runOpsJob(params:{jobKind:OpsJobKind;triggerKind:OpsJobTriggerKind;scopeKind:OpsJobScope;scopeKey:string;holderId:string;payload?:Record<string,unknown>;startedAt?:string;}){return runOpsJob(params)}
  runScheduledOpsCycle(asOfIso?:string){return runScheduledOpsCycle(asOfIso)}
  runSubjectMaintenanceCycle(subjectKind:'user'|'workspace'|'ops',subjectId:string,asOfIso?:string){return runSubjectMaintenanceCycle(subjectKind,subjectId,asOfIso)}
  getOpsJobRun(runId:string){return this.query.getOpsJobRun(runId)}
  getLatestOpsJobRun(jobKind:OpsJobKind,scopeKind:OpsJobScope,scopeKey:string){return this.query.getLatestOpsJobRun(jobKind,scopeKind,scopeKey)}
  listRecentOpsJobRuns(query?:OpsJobRunListQuery){return this.query.listRecentOpsJobRuns(query)}
  listRecentFailedOpsJobRuns(limit?:number){return this.query.listRecentFailedOpsJobRuns(limit)}
  listStaleOpsLeases(asOfIso?:string){return this.query.listStaleOpsLeases(asOfIso)}
  getOpsJobHealthSummary(asOfIso?:string,lookbackHours?:number){return this.query.getOpsJobHealthSummary(asOfIso,lookbackHours)}
}
