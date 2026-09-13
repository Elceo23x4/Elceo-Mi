import { readFile, writeFile } from 'node:fs/promises';

const dir='artifacts/sec-g';
const head=process.env.SEC_G_HEAD_SHA??process.env.GITHUB_SHA??null;
if(!head)throw new Error('SEC_G_HEAD_SHA_required');
const environment=process.env.GITHUB_ACTIONS==='true'?'github-actions-test':'local-test';
const specs={
  'dataset-manifest.json':'postgres-high-cardinality-dataset',
  'explain-plans.json':'postgres-explain-analyze-and-runtime-seed',
  'pool-saturation.json':'postgres-bounded-pool-saturation',
  'notification-recovery.json':'notification-postgres-contention-and-fencing',
  'runtime-seed.json':'canonical-credential-user-runtime-seed',
  'dashboard-runtime-seed.json':'canonical-dashboard-runtime-pointer-seed'
};

for(const [name,scenario] of Object.entries(specs)){
  const path=`${dir}/${name}`;
  const parsed=JSON.parse(await readFile(path,'utf8'));
  const evidence={
    ...parsed,
    exactGitSha:head,
    testedSha:head,
    scenario:parsed.scenario??scenario,
    environment:parsed.environment??environment,
    capturedAt:parsed.capturedAt??new Date().toISOString()
  };
  await writeFile(path,JSON.stringify(evidence,null,2));
}
console.log(JSON.stringify({exactGitSha:head,stamped:Object.keys(specs)}));