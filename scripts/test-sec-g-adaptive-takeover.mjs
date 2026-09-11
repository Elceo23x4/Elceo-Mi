import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';

if(!process.env.REDIS_URL)throw new Error('REDIS_URL_required');
const require=createRequire(import.meta.url);
const adaptive=require(fileURLToPath(new URL('../services/reasoning/dist-test-cjs/services/reasoning/src/adaptive-materialization/index.cjs',import.meta.url)));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const dir='artifacts/sec-g';await mkdir(dir,{recursive:true});
const namespace=`elceo:sec-g:adaptive:${randomUUID()}`,jobHash=`job-${randomUUID()}`,scope=`scope-${randomUUID()}`;
const startedAt=new Date().toISOString();

function startWorker(token,identity,leaseMs=300){
 const child=spawn(process.execPath,['scripts/sec-g-adaptive-worker.mjs'],{cwd:process.cwd(),env:{...process.env,SEC_G_ADAPTIVE_NAMESPACE:namespace,SEC_G_ADAPTIVE_JOB_HASH:jobHash,SEC_G_ADAPTIVE_SCOPE:scope,SEC_G_ADAPTIVE_TOKEN:token,SEC_G_ADAPTIVE_IDENTITY:identity,SEC_G_ADAPTIVE_LEASE_MS:String(leaseMs),SEC_G_ADAPTIVE_HOLD_MS:'10000'},stdio:['ignore','pipe','pipe']});
 const firstLine=new Promise((resolve,reject)=>{let buffer='';const timer=setTimeout(()=>reject(new Error(`adaptive_worker_timeout:${token}`)),5000);child.stdout.on('data',chunk=>{buffer+=chunk.toString();const nl=buffer.indexOf('\n');if(nl<0)return;clearTimeout(timer);try{resolve(JSON.parse(buffer.slice(0,nl)));}catch(error){reject(error);}});child.once('error',reject);child.stderr.on('data',chunk=>{if(process.env.SEC_G_DEBUG==='1')process.stderr.write(chunk);});});
 return{child,firstLine};
}

const first=startWorker('worker-a','adaptive-A',300);const firstEvent=await first.firstLine;assert.equal(firstEvent.event,'claimed');assert.equal(firstEvent.published,true);
first.child.kill('SIGKILL');const killed=await new Promise(resolve=>first.child.once('exit',(code,signal)=>resolve({code,signal})));assert.equal(killed.signal,'SIGKILL');
const early=startWorker('worker-b-early','adaptive-B-early',300);const earlyEvent=await early.firstLine;assert.equal(earlyEvent.event,'not-acquired');await new Promise(resolve=>early.child.once('exit',resolve));
await sleep(350);
const second=startWorker('worker-b','adaptive-B',1000);const secondEvent=await second.firstLine;assert.equal(secondEvent.event,'claimed');assert.equal(secondEvent.published,true);assert(Number(secondEvent.lease.generation)>Number(firstEvent.lease.generation));

const client=adaptive.createAdaptiveMaterializationRedisClient(process.env.REDIS_URL);const store=new adaptive.RedisAdaptiveOwnershipStore(client,namespace);
const stalePublish=await store.publishCurrent(firstEvent.lease,scope,'adaptive-A-stale');
const staleRenew=await store.renew(firstEvent.lease,1000);
const staleRelease=await store.release(firstEvent.lease);
const currentIdentity=await store.readCurrentIdentity(jobHash,scope);
assert.equal(stalePublish,false);assert.equal(staleRenew,null);assert.equal(staleRelease,false);assert.equal(currentIdentity,'adaptive-B');
const secondCurrent=await store.isCurrent(secondEvent.lease);assert.equal(secondCurrent,true);
await store.close();second.child.kill('SIGTERM');await new Promise(resolve=>second.child.once('exit',resolve));

const evidence={exactGitSha:process.env.SEC_G_HEAD_SHA??null,scenario:'adaptive-independent-process-kill-takeover',environment:'github-actions-test',startedAt,endedAt:new Date().toISOString(),workers:{workerA:{pid:first.child.pid,killedSignal:killed.signal,generation:Number(firstEvent.lease.generation),published:firstEvent.published},earlyWorkerB:{pid:early.child.pid,acquired:false,reason:earlyEvent.reason},workerB:{pid:second.child.pid,generation:Number(secondEvent.lease.generation),published:secondEvent.published}},observed:{stalePublish,staleRenew,staleRelease,currentIdentity,successorCurrent:secondCurrent},invariants:{twoIndependentWorkers:true,earlyTakeoverBlocked:true,generationMonotonic:true,staleCannotPublish:!stalePublish,staleCannotRenew:staleRenew===null,staleCannotRelease:!staleRelease,successorAuthoritative:currentIdentity==='adaptive-B'&&secondCurrent},redisRecoveryEvidence:'redis-recovery.json'};
assert(Object.values(evidence.invariants).every(Boolean));
await writeFile(`${dir}/adaptive-takeover.json`,JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
