import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import pg from 'pg';

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL_required');
const dir='artifacts/sec-g';await mkdir(dir,{recursive:true});const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const db=new pg.Pool({connectionString:process.env.DATABASE_URL,max:6,connectionTimeoutMillis:2000});
function runWorker(domain,prefix,mode,index){
 const child=spawn(process.execPath,['scripts/sec-g-backlog-worker.mjs'],{cwd:process.cwd(),env:{...process.env,SEC_G_BACKLOG_DOMAIN:domain,SEC_G_BACKLOG_PREFIX:prefix,SEC_G_BACKLOG_MODE:mode,SEC_G_BACKLOG_TOKEN:`${mode}-${index}-${randomUUID()}`,SEC_G_BACKLOG_LIMIT:'10',SEC_G_BACKLOG_CLAIM_TTL_MS:'1000',SEC_G_HOLD_MS:'10000'},stdio:['ignore','pipe','pipe']});
 let buffer='',stderr='';const event=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(`sec_g_${domain}_${mode}_worker_timeout:${stderr.slice(-1000)}`)),15000);child.stdout.on('data',chunk=>{buffer+=chunk.toString();const nl=buffer.indexOf('\n');if(nl<0)return;clearTimeout(timer);try{resolve(JSON.parse(buffer.slice(0,nl)));}catch(error){reject(error);}});child.once('error',error=>{clearTimeout(timer);reject(error);});child.stderr.on('data',chunk=>{stderr+=chunk.toString();if(process.env.SEC_G_DEBUG==='1')process.stderr.write(chunk);});child.once('exit',(code,signal)=>{if(code!==0&&code!==null){clearTimeout(timer);reject(new Error(`sec_g_${domain}_${mode}_worker_exit:${code}:${signal}:${stderr.slice(-1000)}`));}});});
 return{child,event};
}
function waitExit(child){if(child.exitCode!==null||child.signalCode!==null)return Promise.resolve({code:child.exitCode,signal:child.signalCode});return new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));}

async function seed(domain,prefix,count){
 if(domain==='notification'){
  for(let i=0;i<count;i++){const outboxId=`${prefix}${String(i).padStart(3,'0')}`,decision=`decision-${randomUUID()}`;await db.query(`INSERT INTO app_notification_outbox(outbox_id,outbox_key,decision_id,decision_key,asset,timeframe,rule_key,channel,status,available_at,attempt_count,payload_json) VALUES($1,$1,$2,$2,'BTC/USD','H1','sec-g-backlog','email','staged',now(),0,'{}')`,[outboxId,decision]);}
 }else{
  for(let i=0;i<count;i++){const outboxId=`${prefix}${String(i).padStart(3,'0')}`,run=`run-${randomUUID()}`;await db.query(`INSERT INTO app_ingestion_outbox(outbox_id,run_id,request_key,item_kind,topic,asset,timeframe,trigger_kind,dedupe_key,payload_json,status,available_at) VALUES($1,$2,$3,'run_completed','market.evidence','BTC/USD','H1','scheduled',$4,'{}','pending',now())`,[outboxId,run,`req-${run}`,`dedupe-${run}`]);}
 }
}
async function counts(domain,prefix){
 if(domain==='notification')return (await db.query(`SELECT status,count(*)::int AS count FROM app_notification_outbox WHERE outbox_id LIKE $1 GROUP BY status ORDER BY status`,[`${prefix}%`])).rows;
 return (await db.query(`SELECT status,count(*)::int AS count FROM app_ingestion_outbox WHERE outbox_id LIKE $1 GROUP BY status ORDER BY status`,[`${prefix}%`])).rows;
}
async function waitForClaimExpiry(domain,rows){
 const table=domain==='notification'?'app_notification_outbox':'app_ingestion_outbox',ids=rows.map(row=>row.outboxId);
 for(let attempt=0;attempt<80;attempt++){
  const result=await db.query(`SELECT count(*) FILTER (WHERE claim_expires_at IS NOT NULL AND claim_expires_at > clock_timestamp())::int AS unexpired FROM ${table} WHERE outbox_id = ANY($1::text[])`,[ids]);
  if(Number(result.rows[0]?.unexpired??0)===0)return;
  await sleep(50);
 }
 throw new Error(`sec_g_${domain}_claim_expiry_timeout`);
}
async function maxSuccessAttempts(domain,prefix){
 const sql=domain==='notification'?`SELECT COALESCE(max(c),0)::int AS max_attempts FROM (SELECT count(*) AS c FROM app_notification_outbox_attempts a JOIN app_notification_outbox o ON o.outbox_id=a.outbox_id WHERE o.outbox_id LIKE $1 AND a.status='success' GROUP BY a.outbox_id) s`:`SELECT COALESCE(max(c),0)::int AS max_attempts FROM (SELECT count(*) AS c FROM app_ingestion_outbox_attempts a JOIN app_ingestion_outbox o ON o.outbox_id=a.outbox_id WHERE o.outbox_id LIKE $1 AND a.success=true GROUP BY a.outbox_id) s`;
 return Number((await db.query(sql,[`${prefix}%`])).rows[0]?.max_attempts??0);
}
async function staleTransitions(domain,rows){
 const result={};for(const row of rows){
  if(domain==='notification'){
   for(const status of ['delivered','failed','dead','ambiguous']){const changed=await db.query(`UPDATE app_notification_outbox SET status=$4 WHERE outbox_id=$1 AND claim_token=$2 AND claim_generation=$3 RETURNING outbox_id`,[row.outboxId,row.token,row.generation,status]);result[status]=(result[status]??0)+changed.rowCount;}
  }else{
   for(const status of ['published','failed','dead']){const changed=await db.query(`UPDATE app_ingestion_outbox SET status=$4 WHERE outbox_id=$1 AND claim_token=$2 AND claim_generation=$3 RETURNING outbox_id`,[row.outboxId,row.token,row.generation,status]);result[status]=(result[status]??0)+changed.rowCount;}
  }
 }return result;
}
async function execute(domain){
 const started=Date.now(),startedAt=new Date().toISOString(),count=40,prefix=`sec-g-${domain}-backlog-${randomUUID()}-`;
 await seed(domain,prefix,count);const initial=await counts(domain,prefix);assert.equal(initial.reduce((sum,row)=>sum+Number(row.count),0),count);
 const holder=runWorker(domain,prefix,'hold','owner-a');const claimed=await holder.event;assert.equal(claimed.event,'claimed');assert(claimed.rows.length>0);const killPoint=new Date().toISOString();holder.child.kill('SIGKILL');const killed=await waitExit(holder.child);assert.equal(killed.signal,'SIGKILL');
 await waitForClaimExpiry(domain,claimed.rows);const takeoverStarted=Date.now();const replacements=Array.from({length:3},(_,i)=>runWorker(domain,prefix,'drain',`replacement-${i}`));const drained=await Promise.all(replacements.map(item=>item.event));const exits=await Promise.all(replacements.map(item=>waitExit(item.child)));assert(exits.every(item=>item.code===0));
 const stale=await staleTransitions(domain,claimed.rows);assert(Object.values(stale).every(value=>value===0));const final=await counts(domain,prefix);const terminal=domain==='notification'?'delivered':'published',terminalCount=Number(final.find(row=>row.status===terminal)?.count??0);assert.equal(terminalCount,count);assert.equal(final.reduce((sum,row)=>sum+Number(row.count),0),count);const maxAttempts=await maxSuccessAttempts(domain,prefix);assert.equal(maxAttempts,1);
 const generations=drained.flatMap(item=>item.generations??[]),successorAdvanced=generations.some(generation=>generation>Math.max(...claimed.rows.map(row=>row.generation)));
 assert.equal(successorAdvanced,true);
 return{exactGitSha:process.env.SEC_G_HEAD_SHA??null,scenario:`${domain}-meaningful-backlog-process-death-recovery`,environment:'github-actions-test',startedAt,endedAt:new Date().toISOString(),initialRowCount:count,initialStateCounts:initial,ownerClaimedCount:claimed.rows.length,killedOwnerPid:holder.child.pid,killedSignal:killed.signal,killPoint,holderClaimExpiry:claimed.rows.map(row=>row.expiresAt),takeoverDelayMs:takeoverStarted-new Date(killPoint).getTime(),replacementWorkers:drained.map(item=>({pid:item.pid,claimed:item.claimed,completed:item.completed,batches:item.batches,generations:item.generations})),staleTransitionRows:stale,finalStateCounts:final,maxSuccessfulAttemptsPerRow:maxAttempts,elapsedRecoveryDrainMs:Date.now()-started,invariants:{expiredClaimsRecoverable:true,successorGenerationAdvanced:successorAdvanced,staleOwnerFenced:Object.values(stale).every(value=>value===0),noRowsLost:final.reduce((sum,row)=>sum+Number(row.count),0)===count,noDuplicateCanonicalCompletion:maxAttempts===1,backlogFullyDrained:terminalCount===count}};
}
try{
 const ingestion=await execute('ingestion');assert(Object.values(ingestion.invariants).every(Boolean));await writeFile(`${dir}/ingestion-backlog-recovery.json`,JSON.stringify(ingestion,null,2));
 const notification=await execute('notification');assert(Object.values(notification.invariants).every(Boolean));await writeFile(`${dir}/notification-backlog-recovery.json`,JSON.stringify({...notification,providerSpecificRecoveryEvidence:'notification-recovery.json'},null,2));
 console.log(JSON.stringify({ingestion:ingestion.invariants,notification:notification.invariants}));
}catch(error){await writeFile(`${dir}/backlog-recovery-failure.json`,JSON.stringify({exactGitSha:process.env.SEC_G_HEAD_SHA??null,environment:'github-actions-test',error:error instanceof Error?error.stack??error.message:String(error),capturedAt:new Date().toISOString()},null,2));throw error;}finally{await db.end();}
