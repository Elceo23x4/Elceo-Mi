import type { AdaptiveOwnershipStore, CanonicalArtifact, CanonicalArtifactRead, MaterializationLease, MaterializationRepository } from './contracts';
import { buildArtifactIntegrityHash } from './identity';

export type ImmutableMaterializationStore = { saveImmutable<T>(artifact:CanonicalArtifact<T>):Promise<void>; getImmutable<T>(identity:string):Promise<CanonicalArtifact<T>|null> };

export class MemoryMaterializationRepository implements MaterializationRepository {
  private readonly immutable=new Map<string,CanonicalArtifact<unknown>>();private readonly current=new Map<string,string>();
  constructor(private readonly ownership:Pick<AdaptiveOwnershipStore,'isCurrent'>,private readonly now:()=>number=Date.now){}
  async publish<T>(lease:MaterializationLease,artifact:CanonicalArtifact<T>){if(!await this.ownership.isCurrent(lease))return false;this.immutable.set(artifact.identity,artifact);if(!await this.ownership.isCurrent(lease))return false;this.current.set(`${lease.jobHash}:${artifact.scopeHash}`,artifact.identity);return true}
  async readCurrent<T>(coordinationHash:string,scopeHash:string):Promise<CanonicalArtifactRead<T>>{const id=this.current.get(`${coordinationHash}:${scopeHash}`),artifact=id?this.immutable.get(id)as CanonicalArtifact<T>|undefined:undefined;if(!artifact)return{state:'unavailable',artifact:null};return{state:Date.parse(artifact.freshUntil)>=this.now()?'available':'stale',artifact}}
  async getByIdentity<T>(identity:string){return this.immutable.get(identity)as CanonicalArtifact<T>|undefined??null}
}

/** Redis owns the fenced pointer; PostgreSQL owns immutable replay/audit provenance. */
export class FencedMaterializationRepository implements MaterializationRepository {
  constructor(private readonly ownership:Pick<AdaptiveOwnershipStore,'publishCurrent'|'readCurrentIdentity'>,private readonly immutable:ImmutableMaterializationStore,private readonly now:()=>number=Date.now){}
  async publish<T>(lease:MaterializationLease,artifact:CanonicalArtifact<T>){await this.immutable.saveImmutable(artifact);return this.ownership.publishCurrent(lease,artifact.scopeHash,artifact.identity)}
  async readCurrent<T>(coordinationHash:string,scopeHash:string):Promise<CanonicalArtifactRead<T>>{const identity=await this.ownership.readCurrentIdentity(coordinationHash,scopeHash);if(!identity)return{state:'unavailable',artifact:null};const artifact=await this.immutable.getImmutable<T>(identity);if(!artifact)return{state:'unavailable',artifact:null};return{state:Date.parse(artifact.freshUntil)>=this.now()?'available':'stale',artifact}}
  getByIdentity<T>(identity:string){return this.immutable.getImmutable<T>(identity)}
}

type Row={artifact_json:string};type PoolLike={query:(sql:string,params?:unknown[])=>Promise<{rows:Row[]}>};
export class SqlImmutableMaterializationStore implements ImmutableMaterializationStore {
  constructor(private readonly pool:PoolLike){}
  async saveImmutable<T>(a:CanonicalArtifact<T>){await this.pool.query('INSERT INTO app_canonical_materializations (identity,scope_hash,kind,artifact_json,integrity_hash,created_at) VALUES ($1,$2,$3,$4::jsonb,$5,$6) ON CONFLICT (identity) DO NOTHING',[a.identity,a.scopeHash,a.kind,JSON.stringify(a),a.integrityHash,a.generatedAt])}
  async getImmutable<T>(identity:string){const rows=(await this.pool.query('SELECT artifact_json::text AS artifact_json FROM app_canonical_materializations WHERE identity=$1',[identity])).rows;return rows[0]?JSON.parse(rows[0].artifact_json)as CanonicalArtifact<T>:null}
}

export type ImmutableReadMetrics={l1Hits:number;l1Misses:number;inFlightFollowers:number;postgresReads:number;postgresReadFailures:number;cacheEntries:number;cacheBytes:number;evictions:number};
export const createImmutableReadMetrics=():ImmutableReadMetrics=>({l1Hits:0,l1Misses:0,inFlightFollowers:0,postgresReads:0,postgresReadFailures:0,cacheEntries:0,cacheBytes:0,evictions:0});
type CacheEntry={artifact:CanonicalArtifact<unknown>;bytes:number};
const deepFreeze=<T>(value:T):T=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value as Record<string,unknown>))deepFreeze(child)}return value};

/** Bounded process-local optimization for exact immutable identities. */
export class ReadOptimizedImmutableMaterializationStore implements ImmutableMaterializationStore {
  private readonly cache=new Map<string,CacheEntry>();private readonly inFlight=new Map<string,Promise<CanonicalArtifact<unknown>|null>>();private bytes=0;
  constructor(private readonly durable:ImmutableMaterializationStore,private readonly limits:{maxEntries:number;maxSerializedBytes:number},readonly metrics:ImmutableReadMetrics=createImmutableReadMetrics()){if(!Number.isInteger(limits.maxEntries)||limits.maxEntries<1||!Number.isInteger(limits.maxSerializedBytes)||limits.maxSerializedBytes<1)throw new Error('invalid_immutable_cache_limits')}
  saveImmutable<T>(artifact:CanonicalArtifact<T>){return this.durable.saveImmutable(artifact)}
  private valid<T>(identity:string,artifact:CanonicalArtifact<T>|null):artifact is CanonicalArtifact<T>{if(!artifact||artifact.identity!==identity||artifact.schemaVersion!=='canonical_materialization_v1'||(artifact.kind!=='evidence'&&artifact.kind!=='cognition'))return false;const{integrityHash,...body}=artifact;return integrityHash===buildArtifactIntegrityHash(body)}
  private touch<T>(identity:string,entry:CacheEntry){this.cache.delete(identity);this.cache.set(identity,entry);return entry.artifact as CanonicalArtifact<T>}
  private put(artifact:CanonicalArtifact<unknown>){const serialized=JSON.stringify(artifact),bytes=Buffer.byteLength(serialized);if(bytes>this.limits.maxSerializedBytes)return;while(this.cache.size>=this.limits.maxEntries||this.bytes+bytes>this.limits.maxSerializedBytes){const oldest=this.cache.keys().next().value as string|undefined;if(!oldest)break;this.bytes-=this.cache.get(oldest)!.bytes;this.cache.delete(oldest);this.metrics.evictions++}this.cache.set(artifact.identity,{artifact:deepFreeze(artifact),bytes});this.bytes+=bytes;this.metrics.cacheEntries=this.cache.size;this.metrics.cacheBytes=this.bytes}
  async getImmutable<T>(identity:string):Promise<CanonicalArtifact<T>|null>{const hit=this.cache.get(identity);if(hit){this.metrics.l1Hits++;return this.touch<T>(identity,hit)}this.metrics.l1Misses++;const follower=this.inFlight.get(identity);if(follower){this.metrics.inFlightFollowers++;return follower as Promise<CanonicalArtifact<T>|null>}const load=(async()=>{try{this.metrics.postgresReads++;const artifact=await this.durable.getImmutable<unknown>(identity);if(!this.valid(identity,artifact))return null;this.put(artifact);return artifact}catch{this.metrics.postgresReadFailures++;return null}finally{this.inFlight.delete(identity)}})();this.inFlight.set(identity,load);return load as Promise<CanonicalArtifact<T>|null>}
  snapshot(){return{entries:this.cache.size,bytes:this.bytes,evictions:this.metrics.evictions}}
}
