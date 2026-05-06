import type { ScheduledIngestionRunRecord } from '@elceo/types';
export const serializeScheduledIngestionRunRecord=(r:ScheduledIngestionRunRecord)=>JSON.stringify(r); export const deserializeScheduledIngestionRunRecord=(raw:string):ScheduledIngestionRunRecord=>JSON.parse(raw) as ScheduledIngestionRunRecord;
