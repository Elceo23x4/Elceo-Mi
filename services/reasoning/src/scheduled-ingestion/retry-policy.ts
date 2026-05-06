import type { ScheduledIngestionJobStatus, ScheduledIngestionRetryStatus } from '@elceo/types';
export const computeNextRetryAt=(startedAt:string,retryCount:number,retryBackoffSeconds:number)=>new Date(Date.parse(startedAt)+((retryCount+1)*retryBackoffSeconds*1000)).toISOString();
export const deriveRetryStatus=(status:ScheduledIngestionJobStatus,retryCount:number,maxRetries:number):ScheduledIngestionRetryStatus=>status==='succeeded'||status==='skipped'||status==='blocked'?'not_needed':retryCount<maxRetries?'retry_scheduled':'exhausted';
