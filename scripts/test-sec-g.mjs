import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const migration=await readFile(new URL('../infra/db/schema/0062_sec_g_scale_resilience.sql',import.meta.url),'utf8'),k6=await readFile(new URL('../load/sec-g.k6.js',import.meta.url),'utf8');
const facts={schemaClaimColumnsPresent:/claim_token/.test(migration)&&/claim_generation/.test(migration),opsUniqueConstraintPresent:/UNIQUE INDEX[^;]+idx_ops_active_scope/s.test(migration),k6HarnessPresent:/ramping-vus/.test(k6)&&/api\/account\/state/.test(k6),exactHead:process.env.GITHUB_SHA??null};
assert(Object.values(facts).filter((v)=>typeof v==='boolean').every(Boolean));await mkdir('artifacts/sec-g',{recursive:true});await writeFile('artifacts/sec-g/structural-summary.json',JSON.stringify(facts,null,2));console.log('SEC-G structural facts verified');
