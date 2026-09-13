/** Process-scoped, server-only PostgreSQL authority and connection-budget registry. */
export type DatabaseAuthority = 'system' | 'tenant';
export type RuntimePoolSnapshot = { role: DatabaseAuthority; identity: string; applicationName: string; configuredMax: number; totalCount: number; idleCount: number; waitingCount: number };
type PoolLike = { query(sql:string, params?:unknown[]):Promise<{rows:Record<string,unknown>[]}>; connect():Promise<{query(sql:string,params?:unknown[]):Promise<unknown>;release():void}>; end():Promise<void>; totalCount:number; idleCount:number; waitingCount:number };
type RegistryEntry = { pool: PoolLike; role: DatabaseAuthority; identity: string; applicationName: string; max: number };
const registryKey = Symbol.for('elceo.postgres.runtime.v1');
const globalRegistry = globalThis as typeof globalThis & { [registryKey]?: Map<string, Promise<RegistryEntry>> };
const registry = globalRegistry[registryKey] ??= new Map();

const integer = (name:string, fallback:number, minimum:number) => { const raw=process.env[name]; const value=raw === undefined ? fallback : Number(raw); if(!Number.isInteger(value)||value<minimum) throw new Error(`invalid_${name.toLowerCase()}`); return value; };
function canonical(url:string): { key:string; local:boolean } { const parsed=new URL(url); const local=['localhost','127.0.0.1','::1'].includes(parsed.hostname); parsed.password=''; parsed.username=''; ['ssl','sslmode','sslcert','sslkey','sslrootcert'].forEach((key)=>parsed.searchParams.delete(key)); parsed.searchParams.sort(); return {key:`${parsed.protocol}//${parsed.host}${parsed.pathname}?${parsed.searchParams}`,local}; }
function sslPolicy(url:string, local:boolean): false | { rejectUnauthorized:true } { const parsed=new URL(url); const urlSsl=[...parsed.searchParams.keys()].some((key)=>key.toLowerCase().startsWith('ssl')); if(urlSsl) throw new Error('database_url_ssl_options_forbidden'); const policy=process.env.ELCEO_DB_SSL_POLICY ?? (local && ['development','test'].includes(process.env.APP_ENV ?? 'development') ? 'local-plaintext' : undefined); if(policy==='verify-full') return {rejectUnauthorized:true}; if(policy==='local-plaintext'&&local) return false; throw new Error('database_ssl_policy_required'); }

export async function getRuntimePool(role:DatabaseAuthority):Promise<PoolLike>{
 const variable=role==='system'?'DATABASE_URL':'TENANT_DATABASE_URL', url=process.env[variable]; if(!url) throw new Error(`${variable.toLowerCase()}_required`);
 const id=canonical(url), applicationName=`elceo-${process.env.APP_ENV ?? 'development'}-${role}`, key=`${role}:${id.key}`;
 let pending=registry.get(key); if(!pending){ pending=(async()=>{ const {Pool}=await import('pg'); const max=integer(role==='system'?'ELCEO_DB_SYSTEM_POOL_MAX':'ELCEO_DB_TENANT_POOL_MAX',10,1); const pool=new Pool({connectionString:url,max,connectionTimeoutMillis:integer('ELCEO_DB_CONNECTION_TIMEOUT_MS',3000,1),idleTimeoutMillis:integer('ELCEO_DB_IDLE_TIMEOUT_MS',30000,1),query_timeout:integer('ELCEO_DB_QUERY_TIMEOUT_MS',15000,1),statement_timeout:integer('ELCEO_DB_STATEMENT_TIMEOUT_MS',12000,1),lock_timeout:integer('ELCEO_DB_LOCK_TIMEOUT_MS',2000,1),idle_in_transaction_session_timeout:integer('ELCEO_DB_IDLE_TRANSACTION_TIMEOUT_MS',15000,1),application_name:applicationName,keepAlive:true,keepAliveInitialDelayMillis:integer('ELCEO_DB_KEEPALIVE_DELAY_MS',10000,0),ssl:sslPolicy(url,id.local)}) as unknown as PoolLike; return {pool,role,identity:id.key,applicationName,max}; })().catch((error)=>{registry.delete(key);throw error}); registry.set(key,pending); }
 return (await pending).pool;
}
export async function getPoolSnapshots():Promise<RuntimePoolSnapshot[]>{ return Promise.all([...registry.values()].map(async p=>{const e=await p;return{role:e.role,identity:e.identity,applicationName:e.applicationName,configuredMax:e.max,totalCount:e.pool.totalCount,idleCount:e.pool.idleCount,waitingCount:e.pool.waitingCount}})); }
export async function closeRuntimePools():Promise<void>{ const entries=[...registry.values()];registry.clear();await Promise.allSettled(entries.map(async p=>(await p).pool.end())); }
export function installDatabaseShutdown(register:(drain:()=>Promise<void>)=>void):void { register(closeRuntimePools); }
export { drainRuntime, installRuntimeSignalHandlers, registerRuntimeDrain } from './lifecycle.js';
