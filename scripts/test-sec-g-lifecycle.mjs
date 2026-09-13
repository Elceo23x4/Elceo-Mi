import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp,readFile,mkdir,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const head=process.env.SEC_G_HEAD_SHA??process.env.GITHUB_SHA??null;
const environment=process.env.GITHUB_ACTIONS==='true'?'github-actions-test':'local-test';

async function run(mode,signal='SIGTERM'){
  const startedAt=new Date().toISOString();
  const dir=await mkdtemp(join(tmpdir(),'sec-g-life-')),marker=join(dir,'marker');
  const child=spawn(process.execPath,['scripts/sec-g-lifecycle-child.mjs'],{cwd:process.cwd(),env:{...process.env,SEC_G_LIFECYCLE_MARKER:marker,SEC_G_DRAIN_MODE:mode,ELCEO_SHUTDOWN_GRACE_MS:'75'}});
  for(let i=0;i<100;i++){try{if((await readFile(marker,'utf8')).includes('ready'))break}catch{}await wait(10)}
  child.kill(signal);
  const result=await new Promise(resolve=>child.once('exit',(code,sig)=>resolve({code,signal:sig})));
  return{startedAt,endedAt:new Date().toISOString(),...result,events:await readFile(marker,'utf8')};
}

const graceful=await run('success');
const timeout=await run('timeout');
const hardKill=await run('success','SIGKILL');
assert.equal(graceful.code,0);
assert.match(graceful.events,/stop\ndrain-start\ndrain-complete/);
assert.equal(timeout.code,1);
assert.equal(hardKill.signal,'SIGKILL');
assert(!hardKill.events.includes('drain-start'));

const gracefulEvidence={exactGitSha:head,scenario:'node-process-sigterm-bounded-drain',environment,...graceful,invariants:{stopNewWorkObserved:/stop/.test(graceful.events),drainStarted:/drain-start/.test(graceful.events),drainCompleted:/drain-complete/.test(graceful.events),exitZero:graceful.code===0},accepted:true};
const hardKillEvidence={exactGitSha:head,scenario:'node-process-hard-kill-no-local-drain',environment,...hardKill,invariants:{killedBySigkill:hardKill.signal==='SIGKILL',noFalseDrainClaim:!hardKill.events.includes('drain-start')},recoveryAuthority:'covered by ingestion-backlog-recovery.json, notification-backlog-recovery.json, and adaptive-takeover.json',accepted:true};
await mkdir('artifacts/sec-g',{recursive:true});
await writeFile('artifacts/sec-g/graceful-shutdown.json',JSON.stringify(gracefulEvidence,null,2));
await writeFile('artifacts/sec-g/hard-kill-recovery.json',JSON.stringify(hardKillEvidence,null,2));
console.log(JSON.stringify({graceful:gracefulEvidence.invariants,timeout,hardKill:hardKillEvidence.invariants}));