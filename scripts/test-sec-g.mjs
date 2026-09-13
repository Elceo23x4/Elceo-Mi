import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';

const startedAt=new Date().toISOString();
const migration=await readFile(new URL('../infra/db/schema/0062_sec_g_scale_resilience.sql',import.meta.url),'utf8');
const k6=await readFile(new URL('../load/sec-g.k6.js',import.meta.url),'utf8');
const ci=await readFile(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8');
const exactHeadWorkflow=await readFile(new URL('../.github/workflows/sec-g-exact-head.yml',import.meta.url),'utf8');
const empiricalJob=ci.slice(ci.indexOf('  sec-g-empirical-scale:'));
const adaptiveStepIndex=exactHeadWorkflow.indexOf('      - name: Adaptive independent-process kill and takeover');
const postgresSeedIndex=exactHeadWorkflow.indexOf('      - name: High-cardinality PostgreSQL seed');
const cleanupStepIndex=exactHeadWorkflow.indexOf('      - name: Remove transient authenticated-runtime inputs before final provenance');
const finalVerificationIndex=exactHeadWorkflow.indexOf('      - name: Verify complete exact-head empirical artifact contract');
const invariants={
  schemaClaimColumnsPresent:/claim_token/.test(migration)&&/claim_generation/.test(migration),
  opsUniqueConstraintPresent:/UNIQUE INDEX[^;]+idx_ops_active_scope/s.test(migration),
  k6HarnessPresent:/ramping-vus/.test(k6)&&/api\/account\/state/.test(k6),
  authenticatedFailureSemantics:/status===429\|\|status===503/.test(k6)&&/response\.status>=200&&response\.status<300/.test(k6),
  privilegedWorkloadsUseInternalAuthority:/if\(name==='admin_read'\|\|name==='provider_ingestion'\)headers/.test(k6)&&/x-elceo-internal-token.*__ENV\.ELCEO_INTERNAL_API_TOKEN/.test(k6),
  empiricalRuntimeAndK6ShareTestAuthority:/^      ELCEO_INTERNAL_API_TOKEN: sec-g-ci-only-internal-token$/m.test(empiricalJob)&&!/^          ELCEO_INTERNAL_API_TOKEN:/m.test(empiricalJob),
  sourceJournalInitializedAtRunnerTime:!/SEC_G_SOURCE_INTEGRITY_PHASE_DIR:.*runner\.temp/.test(exactHeadWorkflow)&&/RUNNER_TEMP\/sec-g-source-integrity-phases/.test(exactHeadWorkflow)&&/GITHUB_ENV/.test(exactHeadWorkflow),
  adaptiveProvenancePrecedesRuntimeCredentialGeneration:adaptiveStepIndex>=0&&postgresSeedIndex>=0&&adaptiveStepIndex<postgresSeedIndex,
  transientRuntimeInputsRemovedBeforeFinalProvenance:cleanupStepIndex>=0&&finalVerificationIndex>=0&&cleanupStepIndex<finalVerificationIndex&&/rm -f \.sec-g-runtime-credentials\.json apps\/web\/\.env\.local/.test(exactHeadWorkflow)&&/test ! -e \.sec-g-runtime-credentials\.json/.test(exactHeadWorkflow)&&/test ! -e apps\/web\/\.env\.local/.test(exactHeadWorkflow)
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
