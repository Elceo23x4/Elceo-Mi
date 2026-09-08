import assert from 'node:assert/strict';import {readFileSync,readdirSync,statSync}from'node:fs';import{join}from'node:path';
const walk=d=>readdirSync(d).flatMap(n=>{const p=join(d,n);return statSync(p).isDirectory()?walk(p):[p]});
const routes=walk('apps/web/app/api').filter(p=>p.endsWith('/route.ts'));const browser=walk('apps/web/components').filter(p=>/\.tsx?$/.test(p));
assert.equal(routes.some(p=>p.includes('/app-state/')),false,'legacy app-state route');assert.equal(browser.some(p=>readFileSync(p,'utf8').includes('/api/app-state/')),false,'legacy browser reference');
for(const p of routes)assert.equal(readFileSync(p,'utf8').includes('request.json('),false,`unbounded request.json: ${p}`);
const security=readFileSync('apps/web/lib/server/security/route-security.ts','utf8');assert.equal(security.includes('getSecurityActorFromRequest'),false);assert.equal(security.includes("request.headers.get('x-elceo-internal-token')"),false);
console.log(`SEC-E static guard passed (${routes.length} deployed routes checked)`);
