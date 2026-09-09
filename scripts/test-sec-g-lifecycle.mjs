import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp,readFile,mkdir,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';import { join } from 'node:path';
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
async function run(mode,signal='SIGTERM'){const dir=await mkdtemp(join(tmpdir(),'sec-g-life-')),marker=join(dir,'marker');const child=spawn(process.execPath,['scripts/sec-g-lifecycle-child.mjs'],{cwd:process.cwd(),env:{...process.env,SEC_G_LIFECYCLE_MARKER:marker,SEC_G_DRAIN_MODE:mode,ELCEO_SHUTDOWN_GRACE_MS:'75'}});for(let i=0;i<100;i++){try{if((await readFile(marker,'utf8')).includes('ready'))break}catch{}await wait(10)}child.kill(signal);const result=await new Promise(resolve=>child.once('exit',(code,sig)=>resolve({code,signal:sig})));return{...result,events:await readFile(marker,'utf8')}}
const graceful=await run('success'),timeout=await run('timeout'),hardKill=await run('success','SIGKILL');assert.equal(graceful.code,0);assert.match(graceful.events,/stop\ndrain-start\ndrain-complete/);assert.equal(timeout.code,1);assert.equal(hardKill.signal,'SIGKILL');assert(!hardKill.events.includes('drain-start'));
await mkdir('artifacts/sec-g',{recursive:true});await writeFile('artifacts/sec-g/graceful-shutdown.json',JSON.stringify(graceful,null,2));await writeFile('artifacts/sec-g/hard-kill-recovery.json',JSON.stringify(hardKill,null,2));console.log(JSON.stringify({graceful,timeout,hardKill}));
