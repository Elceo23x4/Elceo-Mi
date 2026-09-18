import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHandoffData, renderExplorer } from './generate-ui-handoff.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FREEZE_COMMIT = '20266494efd3a8d3a97c3ea9335c672e20fe7fa5';
const FREEZE_TREE = '6f81f55269031e0ec6467cd60283593dd5b7c2d3';
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
const REQUIRED = [
  'docs/backend-freeze.md',
  'docs/ui-handoff/README.md',
  'docs/ui-handoff/api-explorer.html',
  'docs/ui-handoff/ui-state-matrix.md',
  'docs/ui-handoff/validation-and-field-rules.md',
  'docs/ui-handoff/auth-session-and-authorization.md',
  'docs/ui-handoff/state-ownership.md',
  'docs/ui-handoff/frontend-integration-map.md',
  'docs/ui-handoff/billing-payment-state-machine.md',
  'docs/ui-handoff/notifications-ui-contract.md',
  'docs/ui-handoff/contract-gaps.md',
  'artifacts/ui-handoff/backend-freeze-manifest.json',
  'artifacts/ui-handoff/route-inventory.json',
  'artifacts/ui-handoff/openapi.json',
  'artifacts/ui-handoff/handoff-summary.json'
];

function fail(message) {
  console.error(`UI handoff verification failed: ${message}`);
  process.exitCode = 1;
}

function readJson(path) {
  return JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
}

function canonical(value) {
  return JSON.stringify(value);
}

function listJsonFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).sort().flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listJsonFiles(full) : name.endsWith('.json') ? [full] : [];
  });
}

function collectOperations(openapi) {
  const out = [];
  for (const [path, item] of Object.entries(openapi.paths ?? {})) {
    for (const method of HTTP_METHODS) if (item?.[method]) out.push(`${method.toUpperCase()} ${path}`);
  }
  return out.sort();
}

for (const path of REQUIRED) if (!existsSync(join(ROOT, path))) fail(`required file missing: ${path}`);
if (process.exitCode) process.exit(process.exitCode);

const manifest = readJson('artifacts/ui-handoff/backend-freeze-manifest.json');
if (manifest.frozenMainCommit !== FREEZE_COMMIT) fail('freeze manifest main commit mismatch');
if (manifest.frozenFunctionalTree !== FREEZE_TREE) fail('freeze manifest functional tree mismatch');
if (manifest.status !== 'frozen') fail('freeze manifest must remain frozen');
if (manifest.freezePolicy?.functionalBackendChangesAllowed !== false) fail('freeze manifest must prohibit functional backend changes');

const generated = buildHandoffData();
const committedInventory = readJson('artifacts/ui-handoff/route-inventory.json');
const committedOpenApi = readJson('artifacts/ui-handoff/openapi.json');
const committedSummary = readJson('artifacts/ui-handoff/handoff-summary.json');
if (canonical(committedInventory) !== canonical(generated.routeInventory)) fail('route-inventory.json is stale; run npm run generate:ui-handoff');
if (canonical(committedOpenApi) !== canonical(generated.openapi)) fail('openapi.json is stale; run npm run generate:ui-handoff');
if (canonical(committedSummary) !== canonical(generated.summary)) fail('handoff-summary.json is stale; run npm run generate:ui-handoff');
const committedExplorer = readFileSync(join(ROOT, 'docs/ui-handoff/api-explorer.html'), 'utf8');
if (committedExplorer !== renderExplorer(generated)) fail('api-explorer.html is stale; run npm run generate:ui-handoff');

const routeOps = committedInventory.routes.flatMap((route) => route.methods.map((method) => `${method} ${route.routePath}`)).sort();
const apiOps = collectOperations(committedOpenApi);
if (canonical(routeOps) !== canonical(apiOps)) fail('OpenAPI operation set differs from canonical route inventory');
if (new Set(routeOps).size !== routeOps.length) fail('duplicate route/method operation in route inventory');
if (committedSummary.operationCount !== routeOps.length) fail('summary operation count mismatch');
if (committedSummary.routeFileCount !== committedInventory.routes.length) fail('summary route-file count mismatch');

for (const route of committedInventory.routes) {
  if ((route.internalToken === 'required' || route.routePath.startsWith('/api/internal/') || route.routePath.startsWith('/api/ops/') || route.routePath.startsWith('/api/admin/')) && route.browserSafe) fail(`${route.routePath} is server/internal but marked browser-safe`);
  if (route.uiAudience === 'provider_webhook' && route.browserSafe) fail(`${route.routePath} provider webhook marked browser-safe`);
  if (route.classification === 'super_admin_required' && route.stepUp !== 'required') fail(`${route.routePath} super-admin route missing step-up requirement`);
}

const ownership = readFileSync(join(ROOT, 'docs/ui-handoff/state-ownership.md'), 'utf8');
for (const phrase of ['SERVER AUTHORITATIVE', 'NEVER CLIENT-OWNED', 'directional bias', 'confidence', 'entitlement', 'billing']) if (!ownership.toLowerCase().includes(phrase.toLowerCase())) fail(`state ownership doc missing required concept: ${phrase}`);

const currentDocs = REQUIRED.filter((path) => path.startsWith('docs/ui-handoff/')).map((path) => readFileSync(join(ROOT, path), 'utf8')).join('\n');
for (const stale of ['journal/portfolio integration deferred', 'C6-A10 Frontend Contracts + Mock Payloads']) if (currentDocs.includes(stale)) fail(`current handoff repeats stale fixture-era language: ${stale}`);

const mockRoot = join(ROOT, 'artifacts/ui-handoff/mocks');
const mockFiles = listJsonFiles(mockRoot);
if (mockFiles.length < 8) fail(`expected at least 8 realistic mock payloads, found ${mockFiles.length}`);
const routeKeySet = new Set(routeOps);
const secretKey = /(api[_-]?key|client[_-]?secret|access[_-]?token|password|x-elceo-internal-token)/i;
function inspectSecrets(value, path = '') {
  if (Array.isArray(value)) return value.forEach((item, index) => inspectSecrets(item, `${path}[${index}]`));
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    if (secretKey.test(key) && child !== null && child !== '<redacted>' && child !== 'not-provided') fail(`secret-like mock field must be redacted: ${childPath}`);
    inspectSecrets(child, childPath);
  }
}
for (const file of mockFiles) {
  let mock;
  try { mock = JSON.parse(readFileSync(file, 'utf8')); } catch (error) { fail(`invalid JSON mock ${file}: ${error instanceof Error ? error.message : String(error)}`); continue; }
  inspectSecrets(mock);
  const meta = mock?._meta;
  if (!meta || typeof meta.route !== 'string' || typeof meta.method !== 'string') { fail(`mock missing _meta.route/_meta.method: ${file}`); continue; }
  const key = `${meta.method.toUpperCase()} ${meta.route}`;
  if (!routeKeySet.has(key)) fail(`mock references unknown frozen route/method ${key}: ${file}`);
  if (meta.frozenMainCommit !== FREEZE_COMMIT) fail(`mock freeze commit mismatch: ${file}`);
}

if (!process.exitCode) {
  console.log(`UI handoff verified: ${committedInventory.routes.length} route files / ${routeOps.length} operations / ${mockFiles.length} mocks`);
}
