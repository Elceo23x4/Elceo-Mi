import type { ScheduledIngestionCadence, ScheduledIngestionJobPolicy, ScheduledIngestionRunMode, ScheduledIngestionRunRecord, ScheduledIngestionRunReport } from '@elceo/types';
import type { ScheduledIngestionRunRepository } from '../persistence/scheduled-ingestion-repository';
import { getDefaultScheduledIngestionPolicies } from './schedule-policies';
import { ScheduledIngestionService } from './scheduled-ingestion-service';

const MINUTE_MS=60_000;
const CADENCE_MINUTES:Readonly<Partial<Record<ScheduledIngestionCadence,number>>>={every_15_minutes:15,every_30_minutes:30,hourly:60,daily:1440,weekly:10080};

export function scheduledIngestionCadenceMinutes(cadence:ScheduledIngestionCadence):number|null{return CADENCE_MINUTES[cadence]??null;}

export function scheduledIngestionSlotStartIso(cadence:ScheduledIngestionCadence,nowIso:string):string|null{
 const nowMs=Date.parse(nowIso);if(!Number.isFinite(nowMs))throw new Error('scheduled_ingestion_now_invalid');
 if(cadence==='manual')return null;
 const date=new Date(nowMs);
 if(cadence==='weekly'){
  const day=date.getUTCDay(),daysSinceMonday=(day+6)%7;
  return new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()-daysSinceMonday)).toISOString();
 }
 if(cadence==='daily')return new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())).toISOString();
 const minutes=scheduledIngestionCadenceMinutes(cadence);if(!minutes)throw new Error(`scheduled_ingestion_cadence_unsupported:${cadence}`);
 return new Date(Math.floor(nowMs/(minutes*MINUTE_MS))*minutes*MINUTE_MS).toISOString();
}

export function isScheduledIngestionPolicyDue(policy:ScheduledIngestionJobPolicy,latest:ScheduledIngestionRunRecord|null,nowIso:string):boolean{
 if(!policy.enabled||policy.cadence==='manual')return false;
 const slotStart=scheduledIngestionSlotStartIso(policy.cadence,nowIso);if(!slotStart)return false;
 if(!latest)return true;
 const latestMs=Date.parse(latest.startedAt),slotMs=Date.parse(slotStart);
 return !Number.isFinite(latestMs)||latestMs<slotMs;
}

export type ScheduledIngestionSourceTickDispatch={jobId:string;providerId:string;cadence:ScheduledIngestionCadence;slotStartAt:string|null;due:boolean;report:ScheduledIngestionRunReport|null};
export type ScheduledIngestionSourceTickReport={evaluatedAt:string;evaluatedCount:number;dueCount:number;dispatchedCount:number;dispatches:ScheduledIngestionSourceTickDispatch[]};

/**
 * Deterministic source-level scheduler. Sub-hour jobs are aligned to UTC cadence slots so multiple
 * processes generate the same request identity for the same source/slot; Provider API Gate single-flight
 * remains the external-call dedupe authority. Manual fallback jobs are never polled automatically.
 */
export class ScheduledIngestionSourceTickService{
 constructor(private readonly service:ScheduledIngestionService,private readonly runs:ScheduledIngestionRunRepository,private readonly policies:readonly ScheduledIngestionJobPolicy[]=getDefaultScheduledIngestionPolicies()){}
 async runTick(evaluatedAt:string,modeOverride?:ScheduledIngestionRunMode):Promise<ScheduledIngestionSourceTickReport>{
  const dispatches:ScheduledIngestionSourceTickDispatch[]=[];let dueCount=0,dispatchedCount=0;
  for(const policy of this.policies){
   const slotStart=scheduledIngestionSlotStartIso(policy.cadence,evaluatedAt);
   if(!policy.enabled||!slotStart){dispatches.push({jobId:policy.jobId,providerId:policy.providerId,cadence:policy.cadence,slotStartAt:slotStart,due:false,report:null});continue;}
   const latest=(await this.runs.listRunsByJob(policy.jobId,1))[0]??null,due=isScheduledIngestionPolicyDue(policy,latest,evaluatedAt);
   if(!due){dispatches.push({jobId:policy.jobId,providerId:policy.providerId,cadence:policy.cadence,slotStartAt:slotStart,due:false,report:null});continue;}
   dueCount+=1;const report=await this.service.runScheduledIngestionJob(policy.jobId,modeOverride??policy.runMode,slotStart);dispatchedCount+=1;
   dispatches.push({jobId:policy.jobId,providerId:policy.providerId,cadence:policy.cadence,slotStartAt:slotStart,due:true,report});
  }
  return{evaluatedAt,evaluatedCount:this.policies.length,dueCount,dispatchedCount,dispatches};
 }
}
