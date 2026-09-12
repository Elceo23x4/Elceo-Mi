import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const files=['scripts/test-sec-g-adaptive-takeover.mjs','scripts/verify-sec-g-artifacts.mjs'];
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const head=git('rev-parse','HEAD');
assert.equal(head,process.env.SEC_G_HEAD_SHA??head,'sec_g_source_integrity_head_mismatch');
git('diff','--exit-code','--',...files);
const status=git('status','--short');
assert.equal(status,'','sec_g_source_integrity_worktree_not_clean');
const observations=files.map(path=>{const committedBlob=git('rev-parse',`HEAD:${path}`),executableBlob=git('hash-object',path);assert.equal(executableBlob,committedBlob,`sec_g_source_integrity_blob_mismatch:${path}`);return{path,committedBlob,executableBlob};});
const phase=process.argv[2]??'unspecified',path='artifacts/sec-g/source-integrity.json';
await mkdir('artifacts/sec-g',{recursive:true});
let phases=[];try{phases=JSON.parse(await readFile(path,'utf8')).phases??[];}catch{/* first integrity observation */}
const evidence={exactGitSha:head,scenario:'sec-g-executable-source-integrity',environment:process.env.GITHUB_ACTIONS==='true'?'github-actions-test':'local-test',head,status,tree:git('ls-tree','HEAD','--',...files),phases:[...phases,{phase,observedAt:new Date().toISOString(),observations}]};
await writeFile(path,JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence.phases.at(-1)));
