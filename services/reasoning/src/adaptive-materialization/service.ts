import { randomUUID } from 'node:crypto';
import type { AdaptiveMaterializationMetrics, AdaptiveMaterializationPolicy, CanonicalArtifact, CanonicalArtifactRead, MaterializationLease, MaterializationRepository } from './contracts';
import { evaluationEpoch } from './cadence';
import { buildArtifactIntegrityHash, buildCanonicalCognitionIdentity, buildMaterializationScopeHash } from './identity';

export type CognitionMaterializationInput = { evidenceIdentity:string; asset:string; horizon:string; weightingPolicyVersion:string; ruleVersions:readonly string[]; evaluatedAt:number; freshnessMs:number; schedulerRunId:string };
const emptyMetrics=():AdaptiveMaterializationMetrics=>({scheduleEvaluations:0,jobsDue:0,leaseAcquired:0,leaseDenied:0,providerRefreshAttempted:0,providerCacheSatisfied:0,canonicalEvidencePublished:0,cognitionComputed:0,cognitionReused:0,previousMaterializationServed:0,failures:{},nextDueAt:null});
export class CanonicalCognitionMaterializationService<T> {
  private readonly inFlight=new Map<string,Promise<CanonicalArtifact<T>>>(); readonly metrics=emptyMetrics();
  constructor(private readonly repository:MaterializationRepository,private readonly compute:(input:CognitionMaterializationInput)=>Promise<T>){}
  async materialize(lease:MaterializationLease,policy:AdaptiveMaterializationPolicy,input:Omit<CognitionMaterializationInput,'evaluatedAt'> & {evaluatedAt:number}):Promise<CanonicalArtifact<T>>{
    const epoch=evaluationEpoch(input.evaluatedAt,policy.evaluationEpochMs),identity=buildCanonicalCognitionIdentity({...input,evaluationEpoch:epoch});
    const existing=await this.repository.getByIdentity<T>(identity);if(existing){this.metrics.cognitionReused++;return existing}
    const active=this.inFlight.get(identity);if(active){this.metrics.cognitionReused++;return active}
    const work=(async()=>{const second=await this.repository.getByIdentity<T>(identity);if(second){this.metrics.cognitionReused++;return second}const payload=await this.compute(input);this.metrics.cognitionComputed++;const generatedAt=new Date(input.evaluatedAt).toISOString(),body={schemaVersion:'canonical_materialization_v1'as const,kind:'cognition'as const,identity,scopeHash:buildMaterializationScopeHash({asset:input.asset,horizon:input.horizon,kind:'cognition'}),payload,evidenceIdentity:input.evidenceIdentity,policyVersion:policy.policyVersion,ruleVersions:[...input.ruleVersions].sort(),schedulerRunId:input.schedulerRunId||randomUUID(),generatedAt,evaluatedAt:new Date(epoch).toISOString(),freshUntil:new Date(input.evaluatedAt+input.freshnessMs).toISOString()};const artifact:CanonicalArtifact<T>={...body,integrityHash:buildArtifactIntegrityHash(body)};if(!await this.repository.publish(lease,artifact))throw new Error('adaptive_stale_owner_publish_denied');return artifact})();this.inFlight.set(identity,work);try{return await work}finally{this.inFlight.delete(identity)}}
  async read(asset:string,horizon:string):Promise<CanonicalArtifactRead<T>>{const result=await this.repository.readCurrent<T>(buildMaterializationScopeHash({asset,horizon,kind:'cognition'}));if(result.state==='stale')this.metrics.previousMaterializationServed++;return result}
}
