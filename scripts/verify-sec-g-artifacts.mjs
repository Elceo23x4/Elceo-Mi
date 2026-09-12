import assert from 'node:assert/strict';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { verifyAdaptiveTakeover } from './lib/sec-g-adaptive-evidence.mjs';

const dir='artifacts/sec-g';
const head=process.env.SEC_G_HEAD_SHA??process.env.GITHUB_SHA??null;
if(!head)throw new Error('SEC_G_HEAD_SHA_required');
const required=[
 'correctness-summary.json',
 'dataset-manifest.json',
 'explain-plans.json',
 'pool-saturation.json',
 'ingestion-fencing.json',
 'scheduler-fencing.json',
 'ops-fencing.json',
 'notification-recovery.json',
 'notification-inbox-query-count.json',
 'provider-single-flight.json',
 'redis-recovery.json',
 'adaptive-takeover.json',
 'ingestion-backlog-recovery.json',
 'notification-backlog-recovery.json',
 'graceful-shutdown.json',
 'hard-kill-recovery.json',
 'k6-summary.json',
 'k6-samples.json',
 'resource-samples.json',
 'source-integrity.json',
 'web-runtime.log'
];

const files={};
for(const name of required){
 const path=`${dir}/${name}`;
 const info=await stat(path);
 assert(info.isFile()&&info.size>0,`sec_g_required_artifact_empty:${name}`);
 const text=await readFile(path,'utf8');
 assert(text.includes(head),`sec_g_artifact_missing_exact_head:${name}`);
 files[name]={bytes:info.size};
 if(name.endsWith('.json')){
  const parsed=JSON.parse(text);
  const serialized=JSON.stringify(parsed);
  assert(serialized.includes('github-actions-test')||serialized.includes('local-test'),`sec_g_artifact_missing_environment:${name}`);
  files[name].json=parsed;
 }
}
verifyAdaptiveTakeover(files['adaptive-takeover.json'].json,head);

const correctness=files['correctness-summary.json'].json;
assert.equal(correctness.accepted,true,'sec_g_correctness_not_accepted');
assert(Object.values(correctness.invariants??{}).every(Boolean),'sec_g_correctness_invariant_failed');

const dataset=files['dataset-manifest.json'].json;
assert(Number(dataset.scale)>=5000,`sec_g_dataset_not_high_cardinality:${dataset.scale}`);
const datasetCounts=Object.values(dataset.counts??{}).map(Number);
assert(datasetCounts.length>=8&&datasetCounts.every(value=>value>=1000),'sec_g_dataset_counts_incomplete');

for(const name of ['ingestion-fencing.json','scheduler-fencing.json','ops-fencing.json','provider-single-flight.json','adaptive-takeover.json','ingestion-backlog-recovery.json','notification-backlog-recovery.json']){
 const evidence=files[name].json;
 assert(Object.values(evidence.invariants??{}).every(Boolean),`sec_g_invariant_failed:${name}`);
}
const notification=files['notification-recovery.json'].json;
assert(Object.values(notification.invariants??{}).every(Boolean),'sec_g_notification_recovery_invariant_failed');
assert.equal(notification.providerSpecific?.resend?.deterministicIdentityAcrossReclaim,true,'sec_g_resend_reclaim_identity_missing');
assert.equal(notification.providerSpecific?.oneSignal?.deterministicIdentityAcrossReclaim,true,'sec_g_onesignal_reclaim_identity_missing');
assert.equal(notification.providerSpecific?.postmark?.blindResendPrevented,true,'sec_g_postmark_ambiguity_not_fenced');

const redis=files['redis-recovery.json'].json;
assert(Object.values(redis.invariants??{}).every(Boolean),'sec_g_redis_recovery_invariant_failed');

const graceful=files['graceful-shutdown.json'].json;
const hardKill=files['hard-kill-recovery.json'].json;
assert(Object.values(graceful.invariants??{}).every(Boolean),'sec_g_graceful_shutdown_invariant_failed');
assert(Object.values(hardKill.invariants??{}).every(Boolean),'sec_g_hard_kill_invariant_failed');

const k6=files['k6-summary.json'].json;
assert.equal(k6.acceptance?.accepted,true,'sec_g_k6_not_accepted');
assert.deepEqual(k6.acceptance?.profilesExecuted,['smoke','ci','capacity-discovery']);
assert.equal(k6.acceptance?.authFailures,0,'sec_g_k6_auth_failures');
assert.equal(k6.acceptance?.unexpectedResponses,0,'sec_g_k6_unexpected_responses');
assert(Number(k6.acceptance?.maximumControlledLoad?.configuredReadVus)>=40,'sec_g_capacity_ramp_not_executed');

const resources=files['resource-samples.json'].json;
const phases=new Set((resources.samples??[]).map(sample=>sample.phase));
for(const phase of ['baseline','load','recovery','drain'])assert(phases.has(phase),`sec_g_resource_phase_missing:${phase}`);
assert((resources.samples??[]).length>=5,'sec_g_resource_sampling_not_repeated');
assert(resources.peak&&Number.isFinite(Number(resources.peak.rssBytes)),'sec_g_resource_peak_missing');

const verification={
 exactGitSha:head,
 scenario:'sec-g-final-artifact-integrity',
 environment:process.env.GITHUB_ACTIONS==='true'?'github-actions-test':'local-test',
 verifiedAt:new Date().toISOString(),
 requiredArtifactCount:required.length,
 requiredArtifacts:required,
 accepted:true
};
await writeFile(`${dir}/artifact-integrity.json`,JSON.stringify(verification,null,2));
console.log(JSON.stringify(verification));
