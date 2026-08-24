import type { AdaptiveOwnershipStore, CanonicalArtifact, CanonicalArtifactRead, MaterializationLease, MaterializationRepository } from './contracts';

export class MemoryMaterializationRepository implements MaterializationRepository {
  private readonly immutable = new Map<string, CanonicalArtifact<unknown>>();
  private readonly current = new Map<string, string>();
  constructor(private readonly ownership: Pick<AdaptiveOwnershipStore, 'isCurrent'>, private readonly now: () => number = Date.now) {}
  async publish<T>(lease: MaterializationLease, artifact: CanonicalArtifact<T>): Promise<boolean> {
    if (!(await this.ownership.isCurrent(lease))) return false;
    if (this.immutable.has(artifact.identity)) { this.current.set(artifact.scopeHash, artifact.identity); return true; }
    this.immutable.set(artifact.identity, artifact);
    this.current.set(artifact.scopeHash, artifact.identity);
    return true;
  }
  async readCurrent<T>(scopeHash: string): Promise<CanonicalArtifactRead<T>> { const id=this.current.get(scopeHash),artifact=id?this.immutable.get(id) as CanonicalArtifact<T>|undefined:undefined;if(!artifact)return{state:'unavailable',artifact:null};return{state:Date.parse(artifact.freshUntil)>=this.now()?'available':'stale',artifact}; }
  async getByIdentity<T>(identity: string): Promise<CanonicalArtifact<T> | null> { return this.immutable.get(identity) as CanonicalArtifact<T>|undefined??null; }
}

/** Durable implementations must commit immutable insert and current-pointer swap in one transaction. */
export type DurableMaterializationTransaction = { insertImmutable<T>(artifact: CanonicalArtifact<T>): Promise<void>; swapCurrent(scopeHash:string,identity:string):Promise<void>; commit():Promise<void>; rollback():Promise<void> };
export type DurableMaterializationPersistence = { begin():Promise<DurableMaterializationTransaction> };
export class DurableMaterializationRepository implements MaterializationRepository {
  constructor(private readonly ownership:Pick<AdaptiveOwnershipStore,'isCurrent'>,private readonly durable:DurableMaterializationPersistence,private readonly reader:Pick<MaterializationRepository,'readCurrent'|'getByIdentity'>){}
  async publish<T>(lease:MaterializationLease,artifact:CanonicalArtifact<T>){if(!await this.ownership.isCurrent(lease))return false;const tx=await this.durable.begin();try{await tx.insertImmutable(artifact);if(!await this.ownership.isCurrent(lease)){await tx.rollback();return false}await tx.swapCurrent(artifact.scopeHash,artifact.identity);await tx.commit();return true}catch(error){await tx.rollback();throw error}}
  readCurrent<T>(scopeHash:string){return this.reader.readCurrent<T>(scopeHash)} getByIdentity<T>(identity:string){return this.reader.getByIdentity<T>(identity)}
}
