import type { AdaptiveOwnershipStore, CanonicalArtifact, CanonicalArtifactRead, MaterializationLease, MaterializationRepository } from './contracts';

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
