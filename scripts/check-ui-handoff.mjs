import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buildHandoff, FROZEN_BACKEND_COMMIT, FROZEN_FUNCTIONAL_TREE } from './generate-ui-handoff.mjs';

const root=process.cwd();
const required=[
 'docs/backend-freeze.md',
 'docs/ui-handoff/README.md',
 'docs/ui-handoff/ui-state-matrix.md',
 'docs/ui-handoff/validation-and-field-rules.md',
 'docs/ui-handoff/auth-session-and-authorization.md',
 'docs/ui-handoff/state-ownership.md',
 'docs/ui-handoff/frontend-integration-map.md',
 'docs/ui-handoff/billing-payment-state-machine.md',
 'docs/ui-handoff/notifications-ui-contract.md',
 'artifacts/ui-handoff/backend-freeze-manifest.json',
 'artifacts/ui-handoff/route-inventory.json',
 'artifacts/ui-handoff/openapi.json'
];
for(const p of required){try{statSync(join(root,p));}catch{throw new Error(`ui_handoff_required_file_missing:${p}`);}}
const routeArtifact=JSON.parse(readFileSync(join(root,'artifacts/ui-handoff/route-inventory.json'),'utf8'));
const openapi=JSON.parse(readFileSync(join(root,'artifacts/ui-handoff/openapi.json'),'utf8'));
const manifest=JSON.parse(readFileSync(join(root,'artifacts/ui-handoff/backend-freeze-manifest.json'),'utf8'));
if(routeArtifact.freezeCommit!==FROZEN_BACKEND_COMMIT||manifest.freezeCommit!==FROZEN_BACKEND_COMMIT)throw new Error('ui_handoff_freeze_commit_mismatch');
if(routeArtifact.functionalTree!==FROZEN_FUNCTIONAL_TREE||manifest.functionalTree!==FROZEN_FUNCTIONAL_TREE)throw new Error('ui_handoff_functional_tree_mismatch');
const expected=buildHandoff(root).inventory;
const actual=routeArtifact.routes;
const key=(x)=>`${x.method}:${x.path}`;
const expectedKeys=expected.map(key),actualKeys=actual.map(key);
if(new Set(actualKeys).size!==actualKeys.length)throw new Error('ui_handoff_duplicate_route_method');
if(JSON.stringify(expectedKeys)!==JSON.stringify(actualKeys)){
 const missing=expectedKeys.filter(x=>!actualKeys.includes(x)); const extra=actualKeys.filter(x=>!expectedKeys.includes(x));
 throw new Error(`ui_handoff_route_inventory_drift:missing=${missing.join(',')}:extra=${extra.join(',')}`);
}
for(const row of actual){
 if((row.path.startsWith('/api/internal/')||row.path.startsWith('/api/ops/'))&&row.uiExposure!=='server_internal')throw new Error(`ui_handoff_internal_route_exposed:${key(row)}`);
}
const openApiKeys=[];
for(const [path,ops] of Object.entries(openapi.paths??{}))for(const method of Object.keys(ops))openApiKeys.push(`${method.toUpperCase()}:${path}`);
openApiKeys.sort(); const sortedActual=[...actualKeys].sort();
if(JSON.stringify(openApiKeys)!==JSON.stringify(sortedActual))throw new Error('ui_handoff_openapi_route_method_drift');
const mockDir=join(root,'artifacts/ui-handoff/mocks');
const secretLike=/(-----BEGIN [A-Z ]*PRIVATE KEY-----|sk_live_|sk_test_|ghp_[A-Za-z0-9]{20,}|xox[baprs]-|AIza[0-9A-Za-z_-]{20,}|password\s*["':=]\s*["'][^"']+)/i;
for(const name of readdirSync(mockDir).sort()){
 if(!name.endsWith('.json'))continue; const text=readFileSync(join(mockDir,name),'utf8'); JSON.parse(text); if(secretLike.test(text))throw new Error(`ui_handoff_secret_like_mock:${name}`);
}
const ownership=readFileSync(join(root,'docs/ui-handoff/state-ownership.md'),'utf8');
for(const term of ['confidence','directional bias','entitlement','billing truth','evidence sufficiency']){
 if(!ownership.toLowerCase().includes(term))throw new Error(`ui_handoff_state_ownership_missing:${term}`);
}
const canonicalDocs=required.filter(p=>p.startsWith('docs/ui-handoff/')).map(p=>readFileSync(join(root,p),'utf8')).join('\n').toLowerCase();
if(canonicalDocs.includes('journal/portfolio integration deferred'))throw new Error('ui_handoff_stale_c6a10_placeholder_claim');
if(manifest.routeMethodCount!==actual.length)throw new Error('ui_handoff_manifest_route_count_mismatch');
if(manifest.openApiOperationCount!==openApiKeys.length)throw new Error('ui_handoff_manifest_openapi_count_mismatch');
console.log(`UI handoff synchronized: ${actual.length} route methods, ${manifest.mockCount} mocks, frozen at ${FROZEN_BACKEND_COMMIT}`);
