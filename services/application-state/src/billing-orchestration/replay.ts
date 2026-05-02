import { deserializeBillingOrchestrationRun } from './serialization';
import type { BillingOrchestrationRun } from '@elceo/types';
import type { BillingOrchestrationRunRepository } from '../persistence';
export const getLatestBillingOrchestrationReplay=async(repo:BillingOrchestrationRunRepository,subjectKind:'user',subjectId:string):Promise<BillingOrchestrationRun|null>=>{const row=await repo.getLatestRunForSubject(subjectKind,subjectId); return row?deserializeBillingOrchestrationRun(row.runJson):null;};
