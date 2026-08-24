import { randomUUID } from 'node:crypto';
import type { AdaptiveMaterializationMetrics, AdaptiveMaterializationPolicy, AdaptiveOwnershipStore, ScheduledProviderExecutor } from './contracts';
import { validateAdaptiveMaterializationPolicy } from './policy';
import type { ProviderRuntimeRequest } from '../provider-sources/provider-api-gate';

export class AdaptiveMaterializationScheduler {
  constructor(private readonly ownership:AdaptiveOwnershipStore,private readonly executeThroughProviderGate:ScheduledProviderExecutor,readonly metrics:AdaptiveMaterializationMetrics){}
  async execute(policy:AdaptiveMaterializationPolicy,jobHash:string,request:ProviderRuntimeRequest){this.metrics.scheduleEvaluations++;validateAdaptiveMaterializationPolicy(policy);if(request.activationMode==='production_live_allowed')throw new Error('adaptive_production_live_disabled');this.metrics.jobsDue++;const acquired=await this.ownership.acquire(jobHash,randomUUID(),policy.leaseDurationMs);if('reason' in acquired){this.metrics.leaseDenied++;this.metrics.failures[acquired.reason]=(this.metrics.failures[acquired.reason]??0)+1;return null}this.metrics.leaseAcquired++;try{if(!await this.ownership.isCurrent(acquired.lease))throw new Error('adaptive_scheduler_ownership_lost');this.metrics.providerRefreshAttempted++;const result=await this.executeThroughProviderGate(request);if(result.cacheSnapshot?.freshness==='fresh')this.metrics.providerCacheSatisfied++;return{lease:acquired.lease,result}}catch(error){await this.ownership.release(acquired.lease);throw error}}
}
