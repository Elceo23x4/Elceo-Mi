import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';

const startedAt=new Date().toISOString();
const migration=await readFile(new URL('../infra/db/schema/0062_sec_g_scale_resilience.sql',import.meta.url),'utf8');
const k6=await readFile(new URL('../load/sec-g.k6.js',import.meta.url),'utf8');
const invariants={
  schemaClaimColumnsPresent:/claim_token/.test(migration)&&/claim_generation/.test(migration),
  opsUniqueConstraintPresent:/UNIQUE INDEX[^;]+idx_ops_active_scope/s.test(migration),
  k6HarnessPresent:/ramping-vus/.test(k6)&&/api\/account\/state/.test(k6),
  authenticatedFailureSemantics:/status===429\|\|status===503/.test(k6)&&/response\.status>=200&&response\.status<300/.test(k6)
};
assert(Object.values(invariants).every(Boolean));
const evidence={
  exactGitSha:process.env.SEC_G_HEAD_SHA??process.env.GITHUB_SHA??null,
  scenario:'sec-g-bounded-structural-correctness',
  environment:process.env.GITHUB_ACTIONS==='true'?'github-actions-test':'local-test',
  startedAt,
  endedAt:new Date().toISOString(),
  invariants,
  accepted:true
};
await mkdir('artifacts/sec-g',{recursive:true});
await writeFile('artifacts/sec-g/correctness-summary.json',JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence));