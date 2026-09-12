import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const files=['scripts/test-sec-g-adaptive-takeover.mjs','scripts/verify-sec-g-artifacts.mjs'];
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const head=git('rev-parse','HEAD');
const expectedHead=process.env.SEC_G_HEAD_SHA??head;
const status=git('status','--porcelain=v1','--untracked-files=all');
const observations=files.map(path=>({path,committedBlob:git('rev-parse',`HEAD:${path}`),executableBlob:git('hash-object',path)}));
console.error(JSON.stringify({check:'sec-g-source-integrity',head,expectedHead,statusPaths:status?status.split('\n'):[],observations}));
assert.equal(head,expectedHead,'sec_g_source_integrity_head_mismatch');
git('diff','--exit-code','--',...files);
assert.equal(status,'','sec_g_source_integrity_worktree_not_clean');
for(const observation of observations)assert.equal(observation.executableBlob,observation.committedBlob,`sec_g_source_integrity_blob_mismatch:${observation.path}`);
const phase=process.argv[2]??'unspecified',path='artifacts/sec-g/source-integrity.json';
await mkdir('artifacts/sec-g',{recursive:true});
let phases=[];try{phases=JSON.parse(await readFile(path,'utf8')).phases??[];}catch{/* first integrity observation */}
const evidence={exactGitSha:head,scenario:'sec-g-executable-source-integrity',environment:process.env.GITHUB_ACTIONS==='true'?'github-actions-test':'local-test',head,status,tree:git('ls-tree','HEAD','--',...files),phases:[...phases,{phase,observedAt:new Date().toISOString(),observations}]};
await writeFile(path,JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence.phases.at(-1)));
