import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startSecGResourceSampler } from '../lib/server/sec-g-resource-sampler';

export async function runSecGResourceSamplerTests(): Promise<void> {
  const prior={appEnv:process.env.APP_ENV,path:process.env.SEC_G_RESOURCE_SAMPLE_PATH,redis:process.env.REDIS_URL,database:process.env.DATABASE_URL,sha:process.env.SEC_G_HEAD_SHA};
  const dir=await mkdtemp(join(tmpdir(),'sec-g-resource-')),path=join(dir,'resource-samples.json');
  Object.assign(process.env,{APP_ENV:'test',SEC_G_RESOURCE_SAMPLE_PATH:path,SEC_G_HEAD_SHA:'resource-test-sha'});
  delete process.env.REDIS_URL;delete process.env.DATABASE_URL;
  try {
    const sampler=startSecGResourceSampler();assert(sampler);
    await sampler.drain();
    const artifact=JSON.parse(await readFile(path,'utf8'));
    assert.equal(artifact.exactGitSha,'resource-test-sha');assert.ok(artifact.endedAt);
    assert.deepEqual(artifact.samples.map((sample:{phase:string})=>sample.phase),['baseline','drain']);
    const drain=artifact.samples[1];
    for(const field of ['cpuPercent','rssBytes','heapUsedBytes','heapTotalBytes','eventLoopDelayP95Ms','eventLoopDelayMaxMs','pools','ingestionBacklog','notificationBacklog','redisAvailable'])assert.ok(Object.hasOwn(drain,field),`drain sample missing ${field}`);
  } finally {
    for(const [name,value] of Object.entries({APP_ENV:prior.appEnv,SEC_G_RESOURCE_SAMPLE_PATH:prior.path,REDIS_URL:prior.redis,DATABASE_URL:prior.database,SEC_G_HEAD_SHA:prior.sha}))value===undefined?delete process.env[name]:process.env[name]=value;
  }
}
