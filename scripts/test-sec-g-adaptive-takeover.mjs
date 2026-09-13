import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { verifyAdaptiveTakeover } from './lib/sec-g-adaptive-evidence.mjs';

const require=createRequire(import.meta.url);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const dir=process.env.SEC_G_ARTIFACT_DIR??'artifacts/sec-g';await mkdir(dir,{recursive:true});
const namespace=`elceo:sec-g:adaptive:${randomUUID()}`,jobHash=`job-${randomUUID()}`,scope=`scope-${randomUUID()}`;
const startedAt=new Date().toISOString(),leaseMs=3000,recoverySloMs=5000;
const diagnostic={exactGitSha:process.env.SEC_G_HEAD_SHA??null,scenario:'adaptive-independent-process-kill-takeover-diagnostic',environment:process.env.GITHUB_ACTIONS==='true'?'github-actions-test':'local-test',status:'running',startedAt,namespace,jobHash,scope,leaseMs,recoverySloMs,stage:'initializing',workers:{},timeline:[],redis:[]};
const children=new Set();
const record=(event,data={})=>diagnostic.timeline.push({event,observedAt:Date.now(),...data});

function startWorker(token,identity,{workerLeaseMs=leaseMs,waitForRelease=false}={}){
 const child=spawn(process.execPath,['scripts/sec-g-adaptive-worker.mjs'],{cwd:process.cwd(),env:{...process.env,SEC_G_ADAPTIVE_NAMESPACE:namespace,SEC_G_ADAPTIVE_JOB_HASH:jobHash,SEC_G_ADAPTIVE_SCOPE:scope,SEC_G_ADAPTIVE_TOKEN:token,SEC_G_ADAPTIVE_IDENTITY:identity,SEC_G_ADAPTIVE_LEASE_MS:String(workerLeaseMs),SEC_G_ADAPTIVE_HOLD_MS:'10000',SEC_G_ADAPTIVE_WAIT_FOR_RELEASE:waitForRelease?'1':'0'},stdio:['ignore','pipe','pipe','ipc']});
 children.add(child);const state={pid:child.pid,token,identity,spawnedAt:Date.now(),stderr:'',stdout:'',exit:null};
 const exit=new Promise(resolve=>child.once('exit',(code,signal)=>{state.exit={code,signal,observedAt:Date.now()};children.delete(child);resolve(state.exit);}));
 const ready=waitForRelease?new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(`adaptive_worker_ready_timeout:${token}:pid=${child.pid}`)),recoverySloMs);child.once('message',message=>{clearTimeout(timer);if(message?.event!=='ready')return reject(new Error(`adaptive_worker_invalid_ready:${token}`));state.ready=message;resolve(message);});child.once('error',reject);}):Promise.resolve(null);
 const result=new Promise((resolve,reject)=>{let buffer='';const timer=setTimeout(()=>reject(new Error(`adaptive_worker_result_timeout:${token}:pid=${child.pid}:stderr=${state.stderr}`)),15000);child.stdout.on('data',chunk=>{state.stdout+=chunk;buffer+=chunk.toString();const nl=buffer.indexOf('\n');if(nl<0)return;clearTimeout(timer);try{const event={...JSON.parse(buffer.slice(0,nl)),observedAt:Date.now()};state.result=event;resolve(event);}catch(error){reject(error);}});child.stderr.on('data',chunk=>{state.stderr=(state.stderr+chunk.toString()).slice(-8000);});child.once('error',reject);child.once('exit',(code,signal)=>{if(!state.result){clearTimeout(timer);reject(new Error(`adaptive_worker_exited_without_event:${token}:pid=${child.pid}:code=${code}:signal=${signal}:stderr=${state.stderr}`));}});});
 return{child,state,ready,result,exit,release:()=>child.send('acquire')};
}

let adaptive,client,store;
try{
 if(!process.env.REDIS_URL)throw new Error('REDIS_URL_required');
 adaptive=require(fileURLToPath(new URL('../services/reasoning/dist-test-cjs/services/reasoning/src/adaptive-materialization/index.cjs',import.meta.url)));
 client=adaptive.createAdaptiveMaterializationRedisClient(process.env.REDIS_URL);
 store=new adaptive.RedisAdaptiveOwnershipStore(client,namespace);
}catch(error){
 diagnostic.status='failed';diagnostic.stage='initialization';diagnostic.failedAt=new Date().toISOString();diagnostic.error=error instanceof Error?{name:error.name,message:error.message,stack:error.stack}:String(error);
 await writeFile(`${dir}/adaptive-takeover-failure.json`,JSON.stringify(diagnostic,null,2));throw error;
}
const redisNow=async()=>{if(!client.isOpen)await client.connect();const value=await client.sendCommand(['TIME']);return Number(value[0])*1000+Math.floor(Number(value[1])/1000);};
const leaseKey=`${namespace}:{${jobHash}}:lease:${scope}`;
const redisState=async phase=>{if(!client.isOpen)await client.connect();const [time,lease]=await Promise.all([redisNow(),client.hGetAll(leaseKey)]);const state={phase,serverTime:time,lease};diagnostic.redis.push(state);return state;};
const waitForBoundary=async boundary=>{while(await redisNow()<boundary)await sleep(Math.min(50,Math.max(5,boundary-await redisNow())));};

try{
 diagnostic.stage='owner-acquisition';record('owner-spawn');
 const first=startWorker('worker-a','adaptive-A');diagnostic.workers.workerA=first.state;
 const firstEvent=await first.result;assert.equal(firstEvent.event,'claimed');assert.equal(firstEvent.published,true);record('owner-authoritative',{pid:first.child.pid,generation:firstEvent.lease.generation,acquiredAt:firstEvent.lease.acquiredAt,expiresAt:firstEvent.lease.expiresAt});await redisState('owner-authoritative');

 diagnostic.stage='contenders-ready';
 const early=startWorker('worker-b-early','adaptive-B-early',{waitForRelease:true});diagnostic.workers.earlyWorkerB=early.state;
 const second=startWorker('worker-b','adaptive-B',{workerLeaseMs:1000,waitForRelease:true});diagnostic.workers.workerB=second.state;
 await Promise.all([early.ready,second.ready]);record('independent-contenders-ready',{earlyPid:early.child.pid,successorPid:second.child.pid});
 assert(await redisNow()<Number(firstEvent.lease.expiresAt),'worker A lease expired before ready early contender');

 diagnostic.stage='owner-kill';const killIssuedAt=Date.now();assert.equal(first.child.kill('SIGKILL'),true);record('owner-sigkill-issued',{pid:first.child.pid,killIssuedAt});
 const killed=await first.exit;assert.equal(killed.signal,'SIGKILL');record('owner-death-observed',{pid:first.child.pid,...killed});

 diagnostic.stage='early-contender';const earlyReleasedAt=await redisNow();assert(earlyReleasedAt<Number(firstEvent.lease.expiresAt),'early contender release was not before Redis lease expiry');early.release();
 const earlyEvent=await early.result;assert.equal(earlyEvent.event,'not-acquired');assert.equal(earlyEvent.reason,'adaptive_scheduler_follower');const earlyExit=await early.exit;record('early-contender-denied',{pid:early.child.pid,releasedAt:earlyReleasedAt,result:earlyEvent,exit:earlyExit});await redisState('early-contender-denied');

 diagnostic.stage='successor-takeover';const recoveryBoundary=Number(firstEvent.lease.expiresAt);await waitForBoundary(recoveryBoundary);const successorReleasedAt=await redisNow();assert(successorReleasedAt>=recoveryBoundary);second.release();
 const secondEvent=await second.result;assert.equal(secondEvent.event,'claimed');assert.equal(secondEvent.published,true);assert(Number(secondEvent.lease.generation)>Number(firstEvent.lease.generation));
 const recoveryAfterExpiryMs=Number(secondEvent.lease.acquiredAt)-recoveryBoundary;assert(recoveryAfterExpiryMs>=0&&recoveryAfterExpiryMs<=recoverySloMs);record('successor-authoritative',{pid:second.child.pid,releasedAt:successorReleasedAt,generation:secondEvent.lease.generation,recoveryAfterExpiryMs});await redisState('successor-authoritative');

 diagnostic.stage='stale-owner-fencing';
 const stalePublish=await store.publishCurrent(firstEvent.lease,scope,'adaptive-A-stale');const staleRenew=await store.renew(firstEvent.lease,1000);const staleRelease=await store.release(firstEvent.lease);const currentIdentity=await store.readCurrentIdentity(jobHash,scope);const secondCurrent=await store.isCurrent(secondEvent.lease);
 assert.equal(stalePublish,false);assert.equal(staleRenew,null);assert.equal(staleRelease,false);assert.equal(currentIdentity,'adaptive-B');assert.equal(secondCurrent,true);await redisState('stale-owner-rejected');
 second.child.kill('SIGTERM');await second.exit;

 const evidence={exactGitSha:process.env.SEC_G_HEAD_SHA??null,scenario:'adaptive-independent-process-kill-takeover',environment:diagnostic.environment,startedAt,endedAt:new Date().toISOString(),namespace,jobHash,scope,leaseMs,recoverySloMs,workers:{workerA:{pid:first.child.pid,ownerToken:firstEvent.lease.ownerToken,acquiredAt:firstEvent.lease.acquiredAt,expiresAt:firstEvent.lease.expiresAt,killIssuedAt,killedAt:killed.observedAt,killedCode:killed.code,killedSignal:killed.signal,generation:Number(firstEvent.lease.generation),published:firstEvent.published},earlyWorkerB:{pid:early.child.pid,ownerToken:'worker-b-early',spawnedAt:early.state.spawnedAt,readyAt:early.state.ready.observedAt,releasedAt:earlyReleasedAt,acquired:false,reason:earlyEvent.reason,exit:earlyExit,observedAt:earlyEvent.observedAt},workerB:{pid:second.child.pid,ownerToken:secondEvent.lease.ownerToken,spawnedAt:second.state.spawnedAt,readyAt:second.state.ready.observedAt,releasedAt:successorReleasedAt,acquiredAt:secondEvent.lease.acquiredAt,expiresAt:secondEvent.lease.expiresAt,generation:Number(secondEvent.lease.generation),published:secondEvent.published,observedAt:secondEvent.observedAt}},observed:{ownerDeathObserved:killed.signal==='SIGKILL',recoveryBoundary,recoveryAfterExpiryMs,stalePublish,staleRenew,staleRelease,currentIdentity,successorCurrent:secondCurrent,redisStates:diagnostic.redis},invariants:{twoIndependentWorkers:new Set([first.child.pid,early.child.pid,second.child.pid]).size===3,ownerDeathObserved:killed.signal==='SIGKILL',earlyTakeoverBlocked:earlyReleasedAt<recoveryBoundary&&!earlyEvent.acquired,recoveryWithinSlo:recoveryAfterExpiryMs>=0&&recoveryAfterExpiryMs<=recoverySloMs,generationMonotonic:Number(secondEvent.lease.generation)>Number(firstEvent.lease.generation),staleCannotPublish:!stalePublish,staleCannotRenew:staleRenew===null,staleCannotRelease:!staleRelease,successorAuthoritative:currentIdentity==='adaptive-B'&&secondCurrent},redisRecoveryEvidence:'redis-recovery.json'};
 assert(Object.values(evidence.invariants).every(Boolean));verifyAdaptiveTakeover(evidence,process.env.SEC_G_HEAD_SHA);await writeFile(`${dir}/adaptive-takeover.json`,JSON.stringify(evidence,null,2));await rm(`${dir}/adaptive-takeover-failure.json`,{force:true});console.log(JSON.stringify(evidence));
}catch(error){
 diagnostic.status='failed';diagnostic.failedAt=new Date().toISOString();diagnostic.error=error instanceof Error?{name:error.name,message:error.message,stack:error.stack}:String(error);
 try{await redisState('failure');}catch(redisError){diagnostic.redisDiagnosticError=redisError instanceof Error?redisError.message:String(redisError);}
 await writeFile(`${dir}/adaptive-takeover-failure.json`,JSON.stringify(diagnostic,null,2));throw error;
}finally{
 for(const child of children)child.kill('SIGKILL');await Promise.allSettled([...children].map(child=>new Promise(resolve=>child.once('exit',resolve))));await store?.close().catch(()=>{});
}
