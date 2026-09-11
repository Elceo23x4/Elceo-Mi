import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createClient } from 'redis';

if(!process.env.REDIS_URL)throw new Error('REDIS_URL_required');
const dir='artifacts/sec-g';await mkdir(dir,{recursive:true});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function redisServiceContainer(){const ps=spawnSync('docker',['ps','--format','{{.ID}} {{.Image}}'],{encoding:'utf8'});if(ps.status!==0)throw new Error(`docker_ps_failed:${ps.stderr}`);const line=ps.stdout.split(/\r?\n/).find(value=>/\sredis:8-alpine(?:\s|$)/.test(`${value} `));if(!line)throw new Error(`sec_g_redis_service_container_not_found:${ps.stdout}`);return line.trim().split(/\s+/)[0];}
async function waitRedis(containerId){for(let attempt=0;attempt<60;attempt++){const ping=spawnSync('docker',['exec',containerId,'redis-cli','ping'],{encoding:'utf8'});if(ping.status===0&&ping.stdout.trim()==='PONG')return;await sleep(100);}throw new Error('sec_g_provider_redis_restart_timeout');}
function waitExit(child){if(child.exitCode!==null||child.signalCode!==null)return Promise.resolve({code:child.exitCode,signal:child.signalCode});return new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));}

function worker(namespace,index,counterPath,{barrier,region}={}){
 const child=spawn(process.execPath,['scripts/sec-g-provider-worker.mjs'],{cwd:process.cwd(),env:{...process.env,SEC_G_PROVIDER_NAMESPACE:namespace,SEC_G_PROVIDER_WORKER:String(index),SEC_G_PROVIDER_COUNTER_PATH:counterPath,SEC_G_PROVIDER_REGION:region??'sec-g-multiprocess',...(barrier?{SEC_G_PROVIDER_BARRIER:barrier}:{})},stdio:['ignore','pipe','pipe']});
 let buffer='',stderr='',readyResolve,readyReject,resultResolve,resultReject;const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;child.once('error',reject);}),result=new Promise((resolve,reject)=>{resultResolve=resolve;resultReject=reject;});
 child.stdout.on('data',chunk=>{buffer+=chunk.toString();for(;;){const nl=buffer.indexOf('\n');if(nl<0)break;const line=buffer.slice(0,nl);buffer=buffer.slice(nl+1);if(!line.trim())continue;let event;try{event=JSON.parse(line);}catch(error){resultReject(error);continue;}if(event.event==='ready')readyResolve(event);if(event.event==='result'||event.event==='error')resultResolve(event);}});
 child.stderr.on('data',chunk=>{stderr+=chunk.toString();if(process.env.SEC_G_DEBUG==='1')process.stderr.write(chunk);});child.once('exit',(code,signal)=>{if(code!==0&&code!==2){const error=new Error(`provider_worker_exit:${index}:${code}:${signal}:${stderr.slice(-1000)}`);readyReject(error);resultReject(error);}});
 return{child,ready,result};
}
const countLines=async path=>{try{return (await readFile(path,'utf8')).split(/\r?\n/).filter(Boolean).length;}catch{return 0;}};
async function controlLedger(namespace){
 const client=createClient({url:process.env.REDIS_URL,socket:{connectTimeout:1000,reconnectStrategy:false}});client.on('error',()=>undefined);await client.connect();
 const root=`${namespace}:control:{tiingo_market_data|market_price_history|primary}:policy:sec-g-multiprocess`;
 const [quotaUsed,reserved,committed]=await Promise.all([client.hGet(`${root}:quota`,'used'),client.hGet(`${root}:cost`,'reserved'),client.hGet(`${root}:cost`,'committed')]);await client.quit();
 return{quotaUsed:Number(quotaUsed??0),costReserved:Number(reserved??0),costCommitted:Number(committed??0)};
}
async function successfulWave(namespace,counterPath,region){
 const barrier=`${counterPath}.release`;await rm(counterPath,{force:true});await rm(barrier,{force:true});
 const workers=Array.from({length:8},(_,i)=>worker(namespace,i,counterPath,{region,barrier}));await Promise.all(workers.map(item=>item.ready));await writeFile(barrier,'release');
 const results=await Promise.all(workers.map(item=>item.result));const exits=await Promise.all(workers.map(item=>waitExit(item.child)));assert(exits.every(item=>item.code===0));
 const errors=results.filter(item=>item.event==='error'),owners=results.filter(item=>item.role==='owner'),followers=results.filter(item=>item.role==='follower'),live=results.filter(item=>item.providerCallMode==='live_staging_call'),shared=results.filter(item=>item.providerCallMode==='cache_response'),upstreamExecutions=await countLines(counterPath);assert.equal(errors.length,0);assert.equal(owners.length,1);assert.equal(live.length,1);assert.equal(shared.length,7);assert(followers.length>=1,'synchronized contention must exercise at least one distributed follower');assert.equal(upstreamExecutions,1);
 const ledger=await controlLedger(namespace);assert.equal(ledger.quotaUsed,1);assert.equal(ledger.costReserved,0);assert.equal(ledger.costCommitted,1);await rm(barrier,{force:true});
 return{processes:8,contenders:8,owners:owners.length,followers:followers.length,sharedCacheResponses:shared.length,actualUpstreamFixtureExecutions:upstreamExecutions,quotaDebits:ledger.quotaUsed,costDebits:ledger.costCommitted,costReservedAfterSettlement:ledger.costReserved,settlementState:owners[0].settlementState,ownerAdmissionSnapshot:owners[0].providerControlSnapshot??null,retryFailureClassifications:results.map(item=>item.decisionReason),invariants:{oneGovernedUpstreamExecution:true,distributedFollowerObserved:followers.length>=1,allNonOwnersSharedResult:shared.length===7,oneQuotaDebit:ledger.quotaUsed===1,oneCostDebit:ledger.costCommitted===1,noResidualCostReservation:ledger.costReserved===0}};
}

const startedAt=new Date().toISOString();
const successNamespace=`elceo:sec-g:provider:success:${randomUUID()}`,successCounter=`${dir}/.provider-success-count`;
const outageNamespace=`elceo:sec-g:provider:outage:${randomUUID()}`,outageCounter=`${dir}/.provider-outage-count`,barrier=`${dir}/.provider-outage-release`,recoveryCounter=`${dir}/.provider-recovery-count`;
try{
 const steady=await successfulWave(successNamespace,successCounter,'steady');
 const containerId=redisServiceContainer();
 await rm(outageCounter,{force:true});await rm(barrier,{force:true});const outageWorkers=Array.from({length:8},(_,i)=>worker(outageNamespace,`outage-${i}`,outageCounter,{barrier,region:'fault-wave'}));await Promise.all(outageWorkers.map(item=>item.ready));
 const stopped=spawnSync('docker',['stop','--time','0',containerId],{encoding:'utf8'});assert.equal(stopped.status,0,stopped.stderr);await writeFile(barrier,'release');const outageResults=await Promise.all(outageWorkers.map(item=>item.result));const outageExits=await Promise.all(outageWorkers.map(item=>waitExit(item.child)));assert(outageExits.every(item=>item.code===0||item.code===2));const outageUpstream=await countLines(outageCounter);assert.equal(outageUpstream,0,'Redis authority loss must prevent unmanaged upstream execution');
 const started=spawnSync('docker',['start',containerId],{encoding:'utf8'});assert.equal(started.status,0,started.stderr);await waitRedis(containerId);
 const recovered=await successfulWave(outageNamespace,recoveryCounter,'recovery-wave');

 const providerEvidence={exactGitSha:process.env.SEC_G_HEAD_SHA??null,scenario:'provider-independent-process-single-flight-and-redis-loss',environment:'github-actions-test',startedAt,endedAt:new Date().toISOString(),steady,redisFault:{processes:8,redisStoppedDuringReleasedContention:true,results:outageResults.map(item=>({event:item.event,providerCallMode:item.providerCallMode??null,decisionReason:item.decisionReason??null,error:item.error??null})),upstreamExecutionsDuringOutage:outageUpstream,failSafe:outageUpstream===0,containerRestarted:true},recovery:recovered,invariants:{steadySingleFlight:steady.actualUpstreamFixtureExecutions===1&&steady.distributedFollowerObserved,redisLossFailSafe:outageUpstream===0,recoverySingleFlight:recovered.actualUpstreamFixtureExecutions===1&&recovered.distributedFollowerObserved,noSilentQuotaCorruption:recovered.quotaDebits===1,noSilentCostCorruption:recovered.costDebits===1}};
 assert(Object.values(providerEvidence.invariants).every(Boolean));await writeFile(`${dir}/provider-single-flight.json`,JSON.stringify(providerEvidence,null,2));
 let priorRedis={};try{priorRedis=JSON.parse(await readFile(`${dir}/redis-recovery.json`,'utf8'));}catch{}
 await writeFile(`${dir}/redis-recovery.json`,JSON.stringify({exactGitSha:process.env.SEC_G_HEAD_SHA??null,scenario:'redis-stop-restart-and-provider-contention-recovery',environment:'github-actions-test',startedAt,endedAt:new Date().toISOString(),genericRecovery:priorRedis,providerContention:{outageUpstreamExecutions:outageUpstream,containerRestarted:true,recoveryUpstreamExecutions:recovered.actualUpstreamFixtureExecutions,recoveryQuotaDebits:recovered.quotaDebits,recoveryCostDebits:recovered.costDebits},invariants:{outageFailedSafe:outageUpstream===0,restarted:true,recoverySingleFlight:recovered.actualUpstreamFixtureExecutions===1,noQuotaCorruption:recovered.quotaDebits===1,noCostCorruption:recovered.costDebits===1}},null,2));
 console.log(JSON.stringify(providerEvidence));
}catch(error){await writeFile(`${dir}/provider-single-flight-failure.json`,JSON.stringify({exactGitSha:process.env.SEC_G_HEAD_SHA??null,environment:'github-actions-test',error:error instanceof Error?error.stack??error.message:String(error),capturedAt:new Date().toISOString()},null,2));throw error;}finally{await Promise.all([rm(successCounter,{force:true}),rm(`${successCounter}.release`,{force:true}),rm(outageCounter,{force:true}),rm(recoveryCounter,{force:true}),rm(`${recoveryCounter}.release`,{force:true}),rm(barrier,{force:true})]);}
