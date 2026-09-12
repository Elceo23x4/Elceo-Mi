import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { verifyAdaptiveTakeover } from './lib/sec-g-adaptive-evidence.mjs';

if(!process.env.REDIS_URL)throw new Error('REDIS_URL_required');
const require=createRequire(import.meta.url);
const adaptive=require(fileURLToPath(new URL('../services/reasoning/dist-test-cjs/services/reasoning/src/adaptive-materialization/index.cjs',import.meta.url)));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const dir='artifacts/sec-g';await mkdir(dir,{recursive:true});
const namespace=`elceo:sec-g:adaptive:${randomUUID()}`,jobHash=`job-${randomUUID()}`,scope=`scope-${randomUUID()}`;
const startedAt=new Date().toISOString();
const leaseMs=3000,recoverySloMs=5000;

function startWorker(token,identity,workerLeaseMs=leaseMs){
 const child=spawn(process.execPath,['scripts/sec-g-adaptive-worker.mjs'],{cwd:process.cwd(),env:{...process.env,SEC_G_ADAPTIVE_NAMESPACE:namespace,SEC_G_ADAPTIVE_JOB_HASH:jobHash,SEC_G_ADAPTIVE_SCOPE:scope,SEC_G_ADAPTIVE_TOKEN:token,SEC_G_ADAPTIVE_IDENTITY:identity,SEC_G_ADAPTIVE_LEASE_MS:String(workerLeaseMs),SEC_G_ADAPTIVE_HOLD_MS:'10000'},stdio:['ignore','pipe','pipe']});
 const diagnostics={stderr:''};
 const exit=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));
 const firstLine=new Promise((resolve,reject)=>{let buffer='';const timer=setTimeout(()=>reject(new Error(`adaptive_worker_timeout:${token}:pid=${child.pid}:stderr=${diagnostics.stderr}`)),recoverySloMs);child.stdout.on('data',chunk=>{buffer+=chunk.toString();const nl=buffer.indexOf('\n');if(nl<0)return;clearTimeout(timer);try{resolve({...JSON.parse(buffer.slice(0,nl)),observedAt:Date.now()});}catch(error){reject(error);}});child.once('error',reject);child.stderr.on('data',chunk=>{diagnostics.stderr+=chunk.toString();if(process.env.SEC_G_DEBUG==='1')process.stderr.write(chunk);});child.once('exit',(code,signal)=>{if(!buffer.includes('\n')){clearTimeout(timer);reject(new Error(`adaptive_worker_exited_without_event:${token}:pid=${child.pid}:code=${code}:signal=${signal}:stderr=${diagnostics.stderr}`));}});});
 return{child,firstLine,exit,diagnostics};
}

const first=startWorker('worker-a','adaptive-A');const firstEvent=await first.firstLine;assert.equal(firstEvent.event,'claimed');assert.equal(firstEvent.published,true);
first.child.kill('SIGKILL');const killed=await first.exit;assert.equal(killed.signal,'SIGKILL');
assert(Date.now()<Number(firstEvent.lease.expiresAt),'worker A lease expired before the early independent contender started');
const early=startWorker('worker-b-early','adaptive-B-early');const earlyEvent=await early.firstLine;assert.equal(earlyEvent.event,'not-acquired');const earlyExit=await early.exit;
const recoveryBoundary=Number(firstEvent.lease.expiresAt);await sleep(Math.max(0,recoveryBoundary-Date.now()+100));
const second=startWorker('worker-b','adaptive-B',1000);const secondEvent=await second.firstLine;assert.equal(secondEvent.event,'claimed');assert.equal(secondEvent.published,true);assert(Number(secondEvent.lease.generation)>Number(firstEvent.lease.generation));
const recoveryAfterExpiryMs=secondEvent.observedAt-recoveryBoundary;assert(recoveryAfterExpiryMs>=0&&recoveryAfterExpiryMs<=recoverySloMs);

const client=adaptive.createAdaptiveMaterializationRedisClient(process.env.REDIS_URL);const store=new adaptive.RedisAdaptiveOwnershipStore(client,namespace);
const stalePublish=await store.publishCurrent(firstEvent.lease,scope,'adaptive-A-stale');
const staleRenew=await store.renew(firstEvent.lease,1000);
const staleRelease=await store.release(firstEvent.lease);
const currentIdentity=await store.readCurrentIdentity(jobHash,scope);
assert.equal(stalePublish,false);assert.equal(staleRenew,null);assert.equal(staleRelease,false);assert.equal(currentIdentity,'adaptive-B');
const secondCurrent=await store.isCurrent(secondEvent.lease);assert.equal(secondCurrent,true);
await store.close();second.child.kill('SIGTERM');await second.exit;

const evidence={exactGitSha:process.env.SEC_G_HEAD_SHA??null,scenario:'adaptive-independent-process-kill-takeover',environment:process.env.GITHUB_ACTIONS==='true'?'github-actions-test':'local-test',startedAt,endedAt:new Date().toISOString(),namespace,jobHash,scope,leaseMs,recoverySloMs,workers:{workerA:{pid:first.child.pid,ownerToken:firstEvent.lease.ownerToken,acquiredAt:firstEvent.lease.acquiredAt,expiresAt:firstEvent.lease.expiresAt,killedCode:killed.code,killedSignal:killed.signal,generation:Number(firstEvent.lease.generation),published:firstEvent.published},earlyWorkerB:{pid:early.child.pid,ownerToken:'worker-b-early',acquired:false,reason:earlyEvent.reason,exit:earlyExit,observedAt:earlyEvent.observedAt},workerB:{pid:second.child.pid,ownerToken:secondEvent.lease.ownerToken,acquiredAt:secondEvent.lease.acquiredAt,expiresAt:secondEvent.lease.expiresAt,generation:Number(secondEvent.lease.generation),published:secondEvent.published,observedAt:secondEvent.observedAt}},observed:{ownerDeathObserved:killed.signal==='SIGKILL',recoveryBoundary,recoveryAfterExpiryMs,stalePublish,staleRenew,staleRelease,currentIdentity,successorCurrent:secondCurrent},invariants:{twoIndependentWorkers:true,ownerDeathObserved:killed.signal==='SIGKILL',earlyTakeoverBlocked:true,recoveryWithinSlo:recoveryAfterExpiryMs>=0&&recoveryAfterExpiryMs<=recoverySloMs,generationMonotonic:true,staleCannotPublish:!stalePublish,staleCannotRenew:staleRenew===null,staleCannotRelease:!staleRelease,successorAuthoritative:currentIdentity==='adaptive-B'&&secondCurrent},redisRecoveryEvidence:'redis-recovery.json'};
assert(Object.values(evidence.invariants).every(Boolean));
verifyAdaptiveTakeover(evidence,process.env.SEC_G_HEAD_SHA);
await writeFile(`${dir}/adaptive-takeover.json`,JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
