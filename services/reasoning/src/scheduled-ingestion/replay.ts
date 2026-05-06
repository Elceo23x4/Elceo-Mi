import type { ScheduledIngestionRunRepository } from '../persistence/scheduled-ingestion-repository';
export const getScheduledIngestionRunReplay=async(repo:ScheduledIngestionRunRepository,runId:string)=>repo.getRunById(runId);
