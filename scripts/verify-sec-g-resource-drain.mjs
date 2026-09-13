import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const head=process.env.SEC_G_HEAD_SHA??process.env.GITHUB_SHA;
assert(head,'SEC_G_HEAD_SHA_required');
const path=resolve(process.env.SEC_G_RESOURCE_SAMPLE_PATH??'artifacts/sec-g/resource-samples.json');
const artifact=JSON.parse(await readFile(path,'utf8'));
assert.equal(artifact.exactGitSha,head,'sec_g_resource_exact_head_mismatch');
assert.ok(artifact.endedAt,'sec_g_resource_ended_at_missing');
const phases=new Set((artifact.samples??[]).map(sample=>sample.phase));
for(const phase of ['baseline','load','recovery','drain'])assert(phases.has(phase),`sec_g_resource_phase_missing:${phase}`);
console.log(JSON.stringify({scenario:'sec-g-resource-drain-verification',phases:[...phases],endedAt:artifact.endedAt,accepted:true}));
