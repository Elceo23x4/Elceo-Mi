import { deserializeBillingOrchestrationRun } from './serialization';
import type { BillingOrchestrationRun } from '@elceo/types';
import type { BillingOrchestrationRunRepository } from '../persistence';
export class BillingOrchestrationQueryService { constructor(private repo:BillingOrchestrationRunRepository){}
 async getLatestBillingOrchestrationRun(subjectKind:'user',subjectId:string):Promise<BillingOrchestrationRun|null>{const r=await this.repo.getLatestRunForSubject(subjectKind,subjectId); return r?deserializeBillingOrchestrationRun(r.runJson):null;}
 async listRecentBillingOrchestrationRuns(subjectKind:'user',subjectId:string,limit?:number):Promise<BillingOrchestrationRun[]>{const rs=await this.repo.listRecentRunsForSubject(subjectKind,subjectId,limit); return rs.map((r)=>deserializeBillingOrchestrationRun(r.runJson));}}
