import type { AdaptiveMaterializationPolicy } from './contracts';
import type { ProviderRuntimeRequest } from '../provider-sources/provider-api-gate';
import { AdaptiveMaterializationScheduler } from './scheduler';
import { CanonicalEvidenceMaterializationService } from './evidence';
import { CanonicalCognitionMaterializationService } from './service';
import { expectedReleaseAt } from './cadence';
export type AggregateEvidenceIdentityLoader=(asset:string,horizon:string)=>Promise<readonly string[]>;
export class AdaptiveMaterializationOrchestrator<T>{constructor(private readonly scheduler:AdaptiveMaterializationScheduler,private readonly evidence:CanonicalEvidenceMaterializationService,private readonly cognition:CanonicalCognitionMaterializationService<T>,private readonly loadAggregateEvidenceIdentities:AggregateEvidenceIdentityLoader){}
 async run(policy:AdaptiveMaterializationPolicy,request:ProviderRuntimeRequest,evaluatedAt:number,schedulerRunId:string){const execution=await this.scheduler.execute(policy,request);if(!execution)return null;try{const evidenceResult=await this.evidence.materializeResult(execution.lease,policy,request,execution.result,evaluatedAt,schedulerRunId),evidenceIdentities=await this.loadAggregateEvidenceIdentities(policy.asset,policy.horizon),cognition=await this.cognition.materialize(policy,{evidenceIdentities,asset:policy.asset,horizon:policy.horizon,evaluatedAt,schedulerRunId});await this.scheduler.finalize(execution,policy,{evaluatedAt,lastPublishedAt:Date.parse(evidenceResult.artifact.generatedAt),lastAttemptSucceeded:true,publishedNewEvidence:evidenceResult.publishedNewEvidence,resilienceRetryAt:null,expectedReleaseAt:expectedReleaseAt(policy,evaluatedAt)});return{evidence:evidenceResult.artifact,cognition}}catch(error){const retryAt=execution.result.resilienceSnapshot?.openUntil??null;await this.scheduler.defer(execution,policy,evaluatedAt,retryAt);throw error}finally{execution.stopHeartbeat()}}
}
