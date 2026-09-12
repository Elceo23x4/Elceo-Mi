import assert from 'node:assert/strict';
import { verifyAdaptiveTakeover } from './lib/sec-g-adaptive-evidence.mjs';

const head='a'.repeat(40);
const valid=()=>({exactGitSha:head,scenario:'adaptive-independent-process-kill-takeover',environment:'local-test',leaseMs:3000,recoverySloMs:5000,workers:{workerA:{pid:101,ownerToken:'a',acquiredAt:1000,expiresAt:4000,killedCode:null,killedSignal:'SIGKILL',generation:1,published:true},earlyWorkerB:{pid:102,ownerToken:'early',acquired:false,reason:'adaptive_scheduler_follower',exit:{code:2,signal:null},observedAt:2000},workerB:{pid:103,ownerToken:'b',acquiredAt:4100,expiresAt:5100,generation:2,published:true,observedAt:4200}},observed:{ownerDeathObserved:true,recoveryBoundary:4000,recoveryAfterExpiryMs:200,stalePublish:false,staleRenew:null,staleRelease:false,currentIdentity:'adaptive-B',successorCurrent:true}});
const rejects=(name,mutate,reason)=>{const value=structuredClone(valid());mutate(value);assert.throws(()=>verifyAdaptiveTakeover(value,head),new RegExp(reason),name);};

assert.equal(verifyAdaptiveTakeover(valid(),head),true);
rejects('owner and early PID reuse',v=>v.workers.earlyWorkerB.pid=v.workers.workerA.pid,'processes-not-independent');
rejects('early and successor PID reuse',v=>v.workers.workerB.pid=v.workers.earlyWorkerB.pid,'processes-not-independent');
rejects('late early contender',v=>v.workers.earlyWorkerB.observedAt=v.workers.workerA.expiresAt,'early-contender-not-before-expiry');
rejects('early contender acquired',v=>v.workers.earlyWorkerB.acquired=true,'early-contender-acquired');
rejects('generation did not advance',v=>v.workers.workerB.generation=1,'successor-generation-not-monotonic');
rejects('stale publish succeeded',v=>v.observed.stalePublish=true,'stale-publish-succeeded');
rejects('stale renewal succeeded',v=>v.observed.staleRenew={expiresAt:9000},'stale-renew-succeeded');
rejects('stale release succeeded',v=>v.observed.staleRelease=true,'stale-release-succeeded');
rejects('owner death absent',v=>v.observed.ownerDeathObserved=false,'owner-death-not-observed');
rejects('successor not authoritative',v=>v.observed.successorCurrent=false,'successor-not-current-owner');
rejects('recovery exceeds SLO',v=>v.observed.recoveryAfterExpiryMs=5001,'recovery-slo-exceeded');
rejects('artifact SHA differs',v=>v.exactGitSha='b'.repeat(40),'exact-head-mismatch');
rejects('raw process evidence absent',v=>delete v.workers.earlyWorkerB,'required-raw-process-evidence-absent');
console.log('SEC-G adaptive producer/verifier evidence contract passed.');
