import type { AdaptiveMaterializationPolicy } from './contracts';
import type { ProviderRuntimeRequest } from '../provider-sources/provider-api-gate';
import { AdaptiveMaterializationScheduler } from './scheduler';
import { CanonicalEvidenceMaterializationService } from './evidence';
import { CanonicalCognitionMaterializationService } from './service';
export class AdaptiveMaterializationOrchestrator<T>{constructor(private readonly scheduler:AdaptiveMaterializationScheduler,private readonly evidence:CanonicalEvidenceMaterializationService,private readonly cognition:CanonicalCognitionMaterializationService<T>){}
 async run(policy:AdaptiveMaterializationPolicy,request:ProviderRuntimeRequest,evaluatedAt:number,schedulerRunId:string){const execution=await this.scheduler.execute(policy,request);if(!execution)return null;try{const evidence=await this.evidence.materializeResult(execution.lease,policy,request,execution.result,evaluatedAt,schedulerRunId),cognition=await this.cognition.materialize(execution.lease,policy,{evidenceIdentity:evidence.identity,asset:policy.asset,horizon:policy.horizon,evaluatedAt,schedulerRunId});await this.scheduler.finalize(execution,policy,{evaluatedAt,lastPublishedAt:Date.parse(evidence.generatedAt),lastAttemptSucceeded:true,publishedNewEvidence:true,resilienceRetryAt:null,expectedReleaseAt:null});return{evidence,cognition}}catch(error){const retryAt=execution.result.resilienceSnapshot?.openUntil??null;await this.scheduler.defer(execution,policy,evaluatedAt,retryAt);throw error}finally{execution.stopHeartbeat()}}
}
