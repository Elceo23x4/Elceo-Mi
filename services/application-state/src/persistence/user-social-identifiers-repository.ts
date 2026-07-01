import type { CommercialPaymentReadinessCheck, CommercialProfileSocialIdentifier } from '@elceo/types';
import { queryDb } from '../db/client';
import { checkCommercialPaymentReadiness } from '../commercial-entitlements/index';
import { CommercialPersistenceError, type CommercialPersistenceStatus } from './commercial-persistence-error';

const epoch = new Date(0).toISOString();
const runtimeEnv = () => (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

type Row = { user_id:string; linkedin_address:string|null; telegram_id:string|null; x_username:string|null; updated_at:string };
export type UserSocialIdentifiersSnapshot = { userId:string; socialIdentifiers:CommercialProfileSocialIdentifier[]; paymentReadiness:CommercialPaymentReadinessCheck; updatedAt:string; persistenceStatus:CommercialPersistenceStatus };
export interface UserSocialIdentifiersRepository { get(userId:string):Promise<UserSocialIdentifiersSnapshot>; upsert(userId:string, identifiers:CommercialProfileSocialIdentifier[]):Promise<UserSocialIdentifiersSnapshot>; getPersistenceReadiness():Promise<{selectedRepositoryMode:'sql'|'memory'|'unavailable'; databaseConfigured:boolean; requiredRelationsAvailable:boolean; persistenceStatus:CommercialPersistenceStatus}>; clear?():void; }

function fromRow(row: Row | undefined): CommercialProfileSocialIdentifier[] {
  if (!row) return [];
  return [row.linkedin_address && {kind:'linkedin_address' as const,value:row.linkedin_address}, row.telegram_id && {kind:'telegram_id' as const,value:row.telegram_id}, row.x_username && {kind:'x_username' as const,value:row.x_username}].filter(Boolean) as CommercialProfileSocialIdentifier[];
}
function snap(userId:string, identifiers:CommercialProfileSocialIdentifier[], updatedAt:string, status:CommercialPersistenceStatus): UserSocialIdentifiersSnapshot { const paymentReadiness = checkCommercialPaymentReadiness({ identifiers }); return { userId, socialIdentifiers: paymentReadiness.normalizedIdentifiers, paymentReadiness, updatedAt, persistenceStatus: status }; }

export class MemoryUserSocialIdentifiersRepository implements UserSocialIdentifiersRepository {
  private rows = new Map<string, Row>();
  async get(userId:string) { const row=this.rows.get(userId); return snap(userId, fromRow(row), row?.updated_at ?? epoch, 'memory_fallback'); }
  async upsert(userId:string, identifiers:CommercialProfileSocialIdentifier[]) { const now=new Date().toISOString(); const row={user_id:userId, linkedin_address:identifiers.find(v=>v.kind==='linkedin_address')?.value ?? null, telegram_id:identifiers.find(v=>v.kind==='telegram_id')?.value ?? null, x_username:identifiers.find(v=>v.kind==='x_username')?.value ?? null, updated_at:now}; this.rows.set(userId,row); return this.get(userId); }
  async getPersistenceReadiness(){ return {selectedRepositoryMode:'memory' as const,databaseConfigured:false,requiredRelationsAvailable:true,persistenceStatus:'memory_fallback' as const}; }
  clear(){ this.rows.clear(); }
}

export class SQLUserSocialIdentifiersRepository implements UserSocialIdentifiersRepository {
  private unavailable(_error: unknown): never { throw new CommercialPersistenceError(); }
  async get(userId:string) { try { const row=(await queryDb<Row>('SELECT user_id, linkedin_address, telegram_id, x_username, updated_at FROM app_user_social_identifiers WHERE user_id=$1 LIMIT 1',[userId]))[0]; return snap(userId, fromRow(row), row?.updated_at ?? epoch, 'durable'); } catch(e) { this.unavailable(e); } }
  async upsert(userId:string, identifiers:CommercialProfileSocialIdentifier[]) { try { const now=new Date().toISOString(); const linkedIn=identifiers.find(v=>v.kind==='linkedin_address')?.value ?? null; const telegram=identifiers.find(v=>v.kind==='telegram_id')?.value ?? null; const x=identifiers.find(v=>v.kind==='x_username')?.value ?? null; await queryDb('INSERT INTO app_user_social_identifiers (user_id, linkedin_address, telegram_id, x_username, readiness_status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (user_id) DO UPDATE SET linkedin_address=EXCLUDED.linkedin_address, telegram_id=EXCLUDED.telegram_id, x_username=EXCLUDED.x_username, readiness_status=EXCLUDED.readiness_status, updated_at=EXCLUDED.updated_at',[userId,linkedIn,telegram,x,identifiers.length>0?'eligible':'blocked',now,now]); return this.get(userId); } catch(e) { this.unavailable(e); } }
  async getPersistenceReadiness(){ try { await queryDb('SELECT 1 FROM app_user_social_identifiers LIMIT 1'); return {selectedRepositoryMode:'sql' as const,databaseConfigured:true,requiredRelationsAvailable:true,persistenceStatus:'durable' as const}; } catch { return {selectedRepositoryMode:'sql' as const,databaseConfigured:Boolean(runtimeEnv().DATABASE_URL),requiredRelationsAvailable:false,persistenceStatus:'unavailable' as const}; } }
}

let defaultRepo: UserSocialIdentifiersRepository | null = null;
export function buildDefaultUserSocialIdentifiersRepository(): UserSocialIdentifiersRepository { const env=runtimeEnv(); if(env.NODE_ENV==='production' && (env.APP_STATE_REPOSITORY!=='sql'||!env.DATABASE_URL)) throw new CommercialPersistenceError(); if(env.APP_STATE_REPOSITORY==='sql') { if(!env.DATABASE_URL) throw new CommercialPersistenceError(); return new SQLUserSocialIdentifiersRepository(); } if(env.NODE_ENV==='production') throw new CommercialPersistenceError(); return new MemoryUserSocialIdentifiersRepository(); }
export const getDefaultUserSocialIdentifiersRepository = () => (defaultRepo ??= buildDefaultUserSocialIdentifiersRepository());
export const resetUserSocialIdentifiersRepositoryForTests = () => { defaultRepo = null; };
