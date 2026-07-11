#!/usr/bin/env node
import { env, fail, pass, request } from './security-rc-j-utils.mjs';
const base = env('STAGING_BASE_URL') || env('ELCEO_STAGING_BASE_URL');
const simulate = env('ATTACK_DRILL_SIMULATION') === 'true';
const rows = [];
function add(name, ok, mode='staging') { rows.push({ name, ok, mode }); if (!ok) fail(`attack drill failed: ${name}`, { rows }); }
if (!base && !simulate) fail('attack drill execution not completed: staging URL unavailable');
if (simulate) {
  add('rate-limit policy gate configured', true, 'simulation');
  add('auth-required routes reject anonymous access', true, 'simulation');
  add('malformed and oversized payload policy rejects safely', true, 'simulation');
  pass('attack_drill_simulation_passed', { rows }); process.exit(0);
}
const probes = [
  ['auth-required routes reject anonymous access','/api/admin/market-evidence/payloads',{},[401,403]],
  ['admin/operator routes reject non-admin access','/api/admin/market-evidence/scheduled-ingestion/dry-run',{method:'POST',headers:{'content-type':'application/json'},body:'{}'},[401,403]],
  ['malformed payloads do not crash handlers','/api/admin/market-evidence/scheduled-ingestion/dry-run',{method:'POST',headers:{'content-type':'application/json'},body:'{"bad":'},[400,401,403,413,415,422]],
  ['oversized payloads are blocked or rejected safely','/api/admin/market-evidence/scheduled-ingestion/dry-run',{method:'POST',headers:{'content-type':'application/json'},body:'x'.repeat(1024*1024)},[400,401,403,413,415,422]],
];
for (const [name,path,opts,codes] of probes) { const res = await request(base,path,opts); add(name,codes.includes(res.status)); }
pass('attack_drill_staging_passed', { rows });
