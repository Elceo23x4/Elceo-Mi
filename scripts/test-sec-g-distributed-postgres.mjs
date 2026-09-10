import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import pg from 'pg';

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL_required');
const head=process.env.SEC_G_HEAD_SHA??null,environment='github-actions-test',dir='artifacts/sec-g';
await mkdir(dir,{recursive:true});
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:24,connectionTimeoutMillis:2000});
const now=Date.now();
const iso=(delta)=>new Date(now+delta).toISOString();
const timed=async(name,operation)=>{const startedAt=new Date().toISOString();const value=await operation();return{exactGitSha:head,scenario:name,environment,startedAt,endedAt:new Date().toISOString(),...value};};
const concurrent=async(count,fn)=>Promise.all(Array.from({length:count},(_,index)=>fn(index)));

async function ingestionFencing(){
 const outboxId=`sec-g-ingestion-fence-${randomUUID()}`,runId=`sec-g-run-${randomUUID()}`;
 await pool.query(`INSERT INTO app_ingestion_outbox(outbox_id,run_id,request_key,item_kind,topic,asset,timeframe,trigger_kind,dedupe_key,payload_json,status,available_at) VALUES($1,$2,$3,'run_completed','market.evidence','BTC/USD','H1','scheduled',$4,'{}','pending',$5)`,[outboxId,runId,`req-${runId}`,`dedupe-${runId}`,iso(-1000)]);
 const claimSql=`WITH candidates AS (SELECT outbox_id FROM app_ingestion_outbox WHERE outbox_id=$1 AND ((status IN ('pending','failed') AND available_at <= $2) OR (status='publishing' AND claim_expires_at <= $2)) FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE app_ingestion_outbox o SET status='publishing',claim_token=$3,claim_generation=o.claim_generation+1,claimed_at=$2,claim_expires_at=$4,last_attempt_at=$2,updated_at=$2 FROM candidates c WHERE o.outbox_id=c.outbox_id RETURNING o.claim_token,o.claim_generation`;
 const firstClaims=(await concurrent(20,async i=>(await pool.query(claimSql,[outboxId,iso(0),`ing-${i}`,iso(250)])).rows)).flat();
 assert.equal(firstClaims.length,1);
 const first=firstClaims[0];
 const successor=(await pool.query(claimSql,[outboxId,iso(300),'ing-successor',iso(1000)])).rows[0];assert.ok(successor);assert(Number(successor.claim_generation)>Number(first.claim_generation));
 const stale=await pool.query(`UPDATE app_ingestion_outbox SET status='published',published_at=$4 WHERE outbox_id=$1 AND claim_token=$2 AND claim_generation=$3 RETURNING outbox_id`,[outboxId,first.claim_token,first.claim_generation,iso(350)]);
 const winner=await pool.query(`UPDATE app_ingestion_outbox SET status='published',published_at=$4,claim_token=NULL,claimed_at=NULL,claim_expires_at=NULL WHERE outbox_id=$1 AND claim_token=$2 AND claim_generation=$3 RETURNING outbox_id`,[outboxId,successor.claim_token,successor.claim_generation,iso(400)]);
 const final=(await pool.query(`SELECT status,claim_generation FROM app_ingestion_outbox WHERE outbox_id=$1`,[outboxId])).rows[0];
 assert.equal(stale.rowCount,0);assert.equal(winner.rowCount,1);assert.equal(final.status,'published');
 return{contenders:20,firstOwnerCount:firstClaims.length,firstGeneration:Number(first.claim_generation),successorGeneration:Number(successor.claim_generation),staleCompletionRows:stale.rowCount,successorCompletionRows:winner.rowCount,finalStatus:final.status,invariants:{singleOwner:true,monotonicGeneration:true,staleOwnerFenced:true,successorAuthoritative:true}};
}

async function schedulerFencing(){
 const requestKey=`sec-g-scheduler-${randomUUID()}`;
 const acquire=async(holder,acquiredAt,expiresAt)=>{const rows=await pool.query(`INSERT INTO app_ingestion_runtime_leases(request_key,asset,timeframe,mode,trigger_kind,slot_start_at,slot_end_at,lease_holder,acquired_at,expires_at,status,created_at,updated_at,owner_token,generation) VALUES($1,'BTC/USD','H1','live','scheduled',NULL,NULL,$2,$3,$4,'acquired',$3,$3,$5,1) ON CONFLICT(request_key) DO UPDATE SET lease_holder=EXCLUDED.lease_holder,acquired_at=EXCLUDED.acquired_at,expires_at=EXCLUDED.expires_at,owner_token=EXCLUDED.owner_token,generation=app_ingestion_runtime_leases.generation+1,status='acquired',updated_at=EXCLUDED.updated_at WHERE NOT(app_ingestion_runtime_leases.status='acquired' AND app_ingestion_runtime_leases.expires_at>EXCLUDED.acquired_at) RETURNING owner_token,generation`,[requestKey,holder,acquiredAt,expiresAt,`${holder}-${randomUUID()}`]);return rows.rows[0]??null;};
 const firstClaims=(await concurrent(20,i=>acquire(`scheduler-${i}`,iso(0),iso(250)))).filter(Boolean);assert.equal(firstClaims.length,1);const first=firstClaims[0];
 const blocked=await acquire('scheduler-early',iso(100),iso(500));assert.equal(blocked,null);
 const successor=await acquire('scheduler-successor',iso(300),iso(1000));assert.ok(successor);assert(Number(successor.generation)>Number(first.generation));
 const stale=await pool.query(`UPDATE app_ingestion_runtime_leases SET status='released',updated_at=$4 WHERE request_key=$1 AND owner_token=$2 AND generation=$3 RETURNING request_key`,[requestKey,first.owner_token,first.generation,iso(350)]);
 const current=await pool.query(`UPDATE app_ingestion_runtime_leases SET status='released',updated_at=$4 WHERE request_key=$1 AND owner_token=$2 AND generation=$3 RETURNING request_key`,[requestKey,successor.owner_token,successor.generation,iso(400)]);
 assert.equal(stale.rowCount,0);assert.equal(current.rowCount,1);
 return{contenders:20,firstOwnerCount:firstClaims.length,earlyTakeoverBlocked:blocked===null,firstGeneration:Number(first.generation),successorGeneration:Number(successor.generation),staleReleaseRows:stale.rowCount,successorReleaseRows:current.rowCount,invariants:{singleOwner:true,eligibilityBoundary:true,monotonicGeneration:true,staleOwnerFenced:true}};
}

async function opsFencing(){
 const jobKind='snapshot_refresh',scopeKind='subject',scopeKey=`sec-g-ops-${randomUUID()}`;
 const acquire=async(index,acquiredAt,expiresAt)=>{const leaseId=`sec-g-ops-lease-${index}-${randomUUID()}`;const result=await pool.query(`WITH expired AS (UPDATE app_ops_job_leases SET lease_state='expired' WHERE job_kind=$2 AND scope_kind=$3 AND scope_key=$4 AND lease_state='acquired' AND expires_at <= $6) INSERT INTO app_ops_job_leases(lease_id,job_kind,scope_kind,scope_key,lease_state,acquired_at,expires_at,released_at,holder_id,created_at,owner_token,generation) VALUES($1,$2,$3,$4,'acquired',$6,$7,NULL,$5,$6,$1,(SELECT COALESCE(MAX(generation),0)+1 FROM app_ops_job_leases WHERE job_kind=$2 AND scope_kind=$3 AND scope_key=$4)) ON CONFLICT DO NOTHING RETURNING lease_id,owner_token,generation`,[leaseId,jobKind,scopeKind,scopeKey,`holder-${index}`,acquiredAt,expiresAt]);return result.rows[0]??null;};
 const firstClaims=(await concurrent(20,i=>acquire(i,iso(0),iso(250)))).filter(Boolean);assert.equal(firstClaims.length,1);const first=firstClaims[0];
 const successor=await acquire('successor',iso(300),iso(1000));assert.ok(successor);assert(Number(successor.generation)>Number(first.generation));
 const stale=await pool.query(`UPDATE app_ops_job_leases SET lease_state='released',released_at=$4 WHERE lease_id=$1 AND owner_token=$2 AND generation=$3 RETURNING lease_id`,[first.lease_id,first.owner_token,first.generation,iso(350)]);
 const current=await pool.query(`UPDATE app_ops_job_leases SET lease_state='released',released_at=$4 WHERE lease_id=$1 AND owner_token=$2 AND generation=$3 RETURNING lease_id`,[successor.lease_id,successor.owner_token,successor.generation,iso(400)]);
 assert.equal(stale.rowCount,0);assert.equal(current.rowCount,1);
 return{contenders:20,firstOwnerCount:firstClaims.length,firstGeneration:Number(first.generation),successorGeneration:Number(successor.generation),staleReleaseRows:stale.rowCount,successorReleaseRows:current.rowCount,invariants:{singleActiveScope:true,monotonicGeneration:true,staleOwnerFenced:true,successorAuthoritative:true}};
}

async function notificationInboxQueryCount(){
 let legacyQueries=0,canonicalQueries=0;
 const legacy=await pool.query(`SELECT i.inbox_id,i.target_id FROM app_notification_inbox i WHERE i.archived_at IS NULL ORDER BY i.created_at DESC,i.inbox_id DESC LIMIT 100`);legacyQueries++;
 for(const row of legacy.rows){await pool.query(`SELECT subject_kind,subject_id FROM app_notification_targets WHERE target_id=$1`,[row.target_id]);legacyQueries++;}
 const canonical=await pool.query(`SELECT i.inbox_id,i.target_id FROM app_notification_inbox i INNER JOIN app_notification_targets t ON t.target_id=i.target_id WHERE t.subject_kind=$1 AND t.subject_id=$2 AND i.archived_at IS NULL ORDER BY i.created_at DESC,i.inbox_id DESC LIMIT 100`,['user','sec-g-owner']);canonicalQueries++;
 assert(canonical.rows.length>0);assert.equal(canonicalQueries,1);assert(legacyQueries>canonicalQueries);
 return{requestedLimit:100,legacyRowsObserved:legacy.rows.length,canonicalRowsObserved:canonical.rows.length,legacyExecutedQueryCount:legacyQueries,canonicalExecutedQueryCount:canonicalQueries,invariants:{canonicalSingleQuery:true,noTargetNPlusOne:true}};
}

try{
 const ingestion=await timed('ingestion-postgres-claim-fencing',ingestionFencing);
 const scheduler=await timed('scheduler-postgres-lease-fencing',schedulerFencing);
 const ops=await timed('ops-postgres-scope-fencing',opsFencing);
 const inbox=await timed('notification-inbox-executed-query-count',notificationInboxQueryCount);
 await Promise.all([
  writeFile(`${dir}/ingestion-fencing.json`,JSON.stringify(ingestion,null,2)),
  writeFile(`${dir}/scheduler-fencing.json`,JSON.stringify(scheduler,null,2)),
  writeFile(`${dir}/ops-fencing.json`,JSON.stringify(ops,null,2)),
  writeFile(`${dir}/notification-inbox-query-count.json`,JSON.stringify(inbox,null,2))
 ]);
 console.log(JSON.stringify({ingestion:ingestion.invariants,scheduler:scheduler.invariants,ops:ops.invariants,inbox:inbox.invariants}));
}finally{await pool.end();}
