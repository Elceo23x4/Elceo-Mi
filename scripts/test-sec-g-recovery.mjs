import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import pg from 'pg';
import { createClient } from 'redis';

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL_required');
const redisUrl=process.env.REDIS_URL??'redis://127.0.0.1:6379';
const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
const artifacts='artifacts/sec-g';await mkdir(artifacts,{recursive:true});

async function processDeathRecovery(){
 const db=new pg.Client({connectionString:process.env.DATABASE_URL});await db.connect();
 const outboxId=`sec-g-process-death-${randomUUID()}`,firstToken=`first-${randomUUID()}`,successorToken=`successor-${randomUUID()}`;
 await db.query(`INSERT INTO app_notification_outbox(outbox_id,outbox_key,decision_id,decision_key,asset,timeframe,rule_key,channel,status,available_at,attempt_count,payload_json) VALUES($1,$1,$2,$2,'BTC/USD','H1','sec-g-process-death','email','staged',now(),0,'{}')`,[outboxId,`decision-${randomUUID()}`]);
 const child=spawn(process.execPath,['scripts/sec-g-claim-worker.mjs'],{cwd:process.cwd(),env:{...process.env,SEC_G_OUTBOX_ID:outboxId,SEC_G_CLAIM_TOKEN:firstToken,SEC_G_HOLD_MS:'10000'},stdio:['ignore','pipe','pipe']});
 const firstClaim=await new Promise((resolve,reject)=>{let buffer='';const timeout=setTimeout(()=>reject(new Error('sec_g_claim_worker_timeout')),5000);child.stdout.on('data',chunk=>{buffer+=chunk.toString();const nl=buffer.indexOf('\n');if(nl<0)return;clearTimeout(timeout);try{resolve(JSON.parse(buffer.slice(0,nl)));}catch(error){reject(error);}});child.once('error',reject);child.stderr.on('data',chunk=>{if(process.env.SEC_G_DEBUG==='1')process.stderr.write(chunk);});});
 assert.equal(firstClaim.event,'claimed');child.kill('SIGKILL');const killed=await new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));assert.equal(killed.signal,'SIGKILL');
 await sleep(400);
 const successor=(await db.query(`WITH candidate AS (SELECT outbox_id FROM app_notification_outbox WHERE outbox_id=$1 AND status='dispatching' AND claim_expires_at<=now() FOR UPDATE SKIP LOCKED) UPDATE app_notification_outbox o SET claim_token=$2,claim_generation=claim_generation+1,claimed_at=now(),claim_expires_at=now()+interval '5 seconds' FROM candidate c WHERE o.outbox_id=c.outbox_id RETURNING o.claim_token,o.claim_generation`,[outboxId,successorToken])).rows[0];
 assert.ok(successor,'expired killed-worker claim must be recoverable');assert(Number(successor.claim_generation)>Number(firstClaim.generation));
 const staleCompletion=await db.query(`UPDATE app_notification_outbox SET status='delivered',claim_token=NULL,claimed_at=NULL,claim_expires_at=NULL WHERE outbox_id=$1 AND claim_token=$2 AND claim_generation=$3 RETURNING outbox_id`,[outboxId,firstClaim.token,firstClaim.generation]);assert.equal(staleCompletion.rowCount,0,'killed worker must stay fenced after takeover');
 const successorCompletion=await db.query(`UPDATE app_notification_outbox SET status='delivered',delivered_at=now(),claim_token=NULL,claimed_at=NULL,claim_expires_at=NULL WHERE outbox_id=$1 AND claim_token=$2 AND claim_generation=$3 RETURNING outbox_id`,[outboxId,successor.claim_token,successor.claim_generation]);assert.equal(successorCompletion.rowCount,1);
 const final=(await db.query(`SELECT status,claim_generation FROM app_notification_outbox WHERE outbox_id=$1`,[outboxId])).rows[0];assert.equal(final.status,'delivered');
 await db.end();
 return {outboxId,killedSignal:killed.signal,firstGeneration:Number(firstClaim.generation),successorGeneration:Number(successor.claim_generation),staleCompletionRows:staleCompletion.rowCount,successorCompletionRows:successorCompletion.rowCount,finalStatus:final.status};
}

function redisServiceContainer(){
 const ps=spawnSync('docker',['ps','--format','{{.ID}} {{.Image}}'],{encoding:'utf8'});if(ps.status!==0)throw new Error(`docker_ps_failed:${ps.stderr}`);const line=ps.stdout.split(/\r?\n/).find(value=>/\sredis:8-alpine(?:\s|$)/.test(`${value} `));if(!line)throw new Error('sec_g_redis_service_container_not_found');return line.trim().split(/\s+/)[0];
}
async function redisFailureRecovery(){
 if(process.env.GITHUB_ACTIONS!=='true')return {executed:false,reason:'github_actions_service_control_required'};
 const containerId=redisServiceContainer(),key=`elceo:sec-g:redis-recovery:${randomUUID()}`;
 const client=createClient({url:redisUrl,socket:{connectTimeout:1000,reconnectStrategy:false}});client.on('error',()=>undefined);await client.connect();await client.set(key,'before-stop');
 const stopped=spawnSync('docker',['stop','--time','0',containerId],{encoding:'utf8'});assert.equal(stopped.status,0,`redis stop failed: ${stopped.stderr}`);await sleep(150);
 let failureDetected=false;try{await Promise.race([client.get(key),new Promise((_,reject)=>setTimeout(()=>reject(new Error('redis_failure_timeout')),1200))]);}catch{failureDetected=true;}assert.equal(failureDetected,true,'Redis outage must fail closed instead of returning a successful operation');try{client.destroy();}catch{}
 const started=spawnSync('docker',['start',containerId],{encoding:'utf8'});assert.equal(started.status,0,`redis start failed: ${started.stderr}`);
 let ready=false;for(let attempt=0;attempt<40;attempt++){const ping=spawnSync('docker',['exec',containerId,'redis-cli','ping'],{encoding:'utf8'});if(ping.status===0&&ping.stdout.trim()==='PONG'){ready=true;break;}await sleep(100);}assert.equal(ready,true,'Redis service did not recover');
 const successor=createClient({url:redisUrl,socket:{connectTimeout:1000,reconnectStrategy:false}});successor.on('error',()=>undefined);await successor.connect();await successor.set(key,'after-restart');assert.equal(await successor.get(key),'after-restart');await successor.del(key);await successor.quit();
 return {executed:true,containerRestarted:true,outageFailureDetected:failureDetected,successorConnected:true,postRestartRoundTrip:true};
}

const processDeath=await processDeathRecovery();const redisRecovery=await redisFailureRecovery();await writeFile(`${artifacts}/process-death-recovery.json`,JSON.stringify(processDeath,null,2));await writeFile(`${artifacts}/redis-recovery.json`,JSON.stringify(redisRecovery,null,2));console.log(JSON.stringify({processDeath,redisRecovery},null,2));
