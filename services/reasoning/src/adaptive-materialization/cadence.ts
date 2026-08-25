import type { AdaptiveCadenceSignals, AdaptiveMaterializationPolicy } from './contracts';
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function calculateNextDueAt(policy: AdaptiveMaterializationPolicy, signals: AdaptiveCadenceSignals): number {
  const minDue=signals.evaluatedAt+policy.minimumRefreshIntervalMs, maxDue=signals.evaluatedAt+policy.maximumRefreshIntervalMs;
  if (signals.lastPublishedAt === null) return minDue;
  let interval=policy.baseRefreshIntervalMs;
  if (signals.lastAttemptSucceeded === false) interval=policy.retryMinimumMs;
  else if (!signals.publishedNewEvidence) interval=policy.maximumRefreshIntervalMs;
  let due=signals.evaluatedAt+interval;
  if (signals.expectedReleaseAt !== null && signals.expectedReleaseAt >= minDue) due=Math.min(due,signals.expectedReleaseAt);
  if (signals.resilienceRetryAt !== null) due=Math.max(due,signals.resilienceRetryAt);
  return clamp(due,minDue,maxDue);
}
export const evaluationEpoch = (evaluatedAt:number, epochMs:number): number => Math.floor(evaluatedAt/epochMs)*epochMs;
export function expectedReleaseAt(policy:AdaptiveMaterializationPolicy,evaluatedAt:number):number|null{if(policy.expectedReleaseMinuteUtc===null)return null;const day=86_400_000,start=Math.floor(evaluatedAt/day)*day,candidate=start+policy.expectedReleaseMinuteUtc*60_000;return candidate>=evaluatedAt?candidate:candidate+day}
