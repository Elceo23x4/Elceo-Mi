import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const FREEZE_COMMIT = '20266494efd3a8d3a97c3ea9335c672e20fe7fa5';
const FREEZE_TREE = '6f81f55269031e0ec6467cd60283593dd5b7c2d3';
const FREEZE_RECORDED_AT = '2026-09-18T00:19:01Z';
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function extractAll(source, regex, group = 1) {
  const values = [];
  for (const match of source.matchAll(regex)) values.push(match[group]);
  return uniqueSorted(values);
}

function extractRouteDetails(row) {
  const absoluteFile = join(ROOT, row.routeFile);
  const source = readFileSync(absoluteFile, 'utf8');
  const validators = uniqueSorted([
    ...extractAll(source, /\b(validate[A-Z][A-Za-z0-9_]*)\s*\(/g),
    ...extractAll(source, /\b(parse[A-Z][A-Za-z0-9_]*)\s*\(/g)
  ]);
  const queryParameters = uniqueSorted([
    ...extractAll(source, /searchParams\.get\(\s*['"]([^'"]+)['"]\s*\)/g),
    ...extractAll(source, /\.searchParams\.get\(\s*['"]([^'"]+)['"]\s*\)/g)
  ]);
  const headerReferences = uniqueSorted([
    ...extractAll(source, /headers\.get\(\s*['"]([^'"]+)['"]\s*\)/g),
    ...extractAll(source, /request\.headers\.get\(\s*['"]([^'"]+)['"]\s*\)/g)
  ].map((value) => value.toLowerCase()));
  const explicitStatuses = uniqueSorted(extractAll(source, /\bstatus\s*:\s*(\d{3})\b/g).map(Number));
  const pathParameters = extractAll(row.routePath, /\{([^}]+)\}/g);
  const importedValidators = extractAll(source, /import\s*\{([^}]+)\}\s*from\s*['"]@elceo\/schemas['"]/gs)
    .flatMap((chunk) => chunk.split(',').map((item) => item.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]))
    .filter(Boolean);
  const importedTypes = extractAll(source, /import\s+(?:type\s+)?\{([^}]+)\}\s*from\s*['"]@elceo\/types['"]/gs)
    .flatMap((chunk) => chunk.split(',').map((item) => item.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]))
    .filter(Boolean);
  const hasJsonBody = /await\s+[A-Za-z_$][\w$]*\.json\s*\(/.test(source);
  const providerWebhook = row.routePath.startsWith('/api/billing/webhook') || (row.routePath.includes('/providers/') && row.routePath.endsWith('/webhook'));
  const frameworkOwned = row.routePath.startsWith('/api/auth/');
  const internalRequired = row.internalToken === 'required';
  let uiAudience = 'user_ui';
  if (frameworkOwned) uiAudience = 'auth_framework';
  else if (providerWebhook) uiAudience = 'provider_webhook';
  else if (row.classification === 'super_admin_required') uiAudience = 'super_admin_server_bridge';
  else if (row.routePath.startsWith('/api/admin/')) uiAudience = 'admin_server_bridge';
  else if (row.routePath.startsWith('/api/internal/') || row.routePath.startsWith('/api/ops/') || row.classification === 'internal_only') uiAudience = 'server_internal';
  const browserSafe = !internalRequired && !providerWebhook && !row.routePath.startsWith('/api/internal/') && !row.routePath.startsWith('/api/ops/') && !row.routePath.startsWith('/api/admin/');
  const standardEnvelope = /withApiErrorBoundary|\bok\s*\(|\bapiSuccess\s*\(|\bsuccessResponse\s*\(/.test(source);
  const responseContract = frameworkOwned
    ? 'authjs_framework_owned'
    : row.routePath === '/api/dashboard/{asset}'
      ? 'DashboardChartWorkspaceViewModel_or_KickOffDashboardViewModelV1'
      : standardEnvelope
        ? 'standard_api_envelope'
        : 'handler_specific_json';
  const errorTokens = uniqueSorted([
    ...extractAll(source, /['"](unauthorized|forbidden|bad_request|validation_error|not_found|conflict|unprocessable_entity|dependency_failed|internal_error|rate_limited)['"]/g),
    ...extractAll(source, /['"]([A-Z][A-Z0-9_]{2,})['"]/g)
  ]);

  return {
    ...row,
    pathParameters,
    queryParameters,
    headerReferences,
    validators: uniqueSorted([...validators, ...importedValidators]),
    importedTypes: uniqueSorted(importedTypes),
    explicitStatuses,
    hasJsonBody,
    responseContract,
    errorTokens,
    uiAudience,
    browserSafe,
    sourceProvenance: {
      routeFile: row.routeFile,
      policyInventory: 'apps/web/lib/server/access/route-policy-inventory.ts',
      schemaAuthority: validators.length || importedValidators.length ? '@elceo/schemas references in handler' : 'handler/helper contract; field constraints unspecified where not statically provable'
    }
  };
}

function operationSecurity(route) {
  const needsSession = route.handlerGuardEvidence.authenticatedSubjectResolverCall || route.ownerBoundary === 'required' || route.adminPermission !== 'not_required';
  const needsInternal = route.internalToken === 'required';
  if (needsSession && needsInternal) return [{ SessionAuth: [], InternalToken: [] }];
  if (needsInternal) return [{ InternalToken: [] }];
  if (needsSession) return [{ SessionAuth: [] }];
  return [];
}

function expectedErrorStatuses(route) {
  const statuses = new Set(route.explicitStatuses.filter((status) => status >= 400));
  if (route.handlerGuardEvidence.authenticatedSubjectResolverCall || route.ownerBoundary === 'required') statuses.add(401);
  if (route.classification.includes('required') || route.commercialRestrictionFirst === 'required' || route.adminPermission !== 'not_required') statuses.add(403);
  if (route.idempotency === 'required') statuses.add(409);
  if (route.handlerGuardEvidence.securityDecisionReference) statuses.add(429);
  const tokenMap = {
    bad_request: 400,
    validation_error: 400,
    unauthorized: 401,
    forbidden: 403,
    not_found: 404,
    conflict: 409,
    unprocessable_entity: 422,
    dependency_failed: 424,
    rate_limited: 429,
    internal_error: 500
  };
  for (const token of route.errorTokens) if (tokenMap[token]) statuses.add(tokenMap[token]);
  return [...statuses].sort((a, b) => a - b);
}

function buildOperation(route, method) {
  const lower = method.toLowerCase();
  const parameters = [];
  for (const name of route.pathParameters) parameters.push({ name, in: 'path', required: true, schema: { type: 'string' }, description: 'Path identifier; exact validation follows the route handler/schema.' });
  for (const name of route.queryParameters) parameters.push({ name, in: 'query', required: false, schema: { type: 'string' }, description: 'Constraint is documented only when the frozen handler/schema proves one.' });
  if (route.idempotency === 'required' && !route.headerReferences.includes('idempotency-key')) parameters.push({ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string' }, description: 'Required by the frozen mutation-security contract.' });
  if (route.internalToken === 'required' && !route.headerReferences.includes('x-elceo-internal-token')) parameters.push({ name: 'x-elceo-internal-token', in: 'header', required: true, schema: { type: 'string', writeOnly: true }, description: 'Server-side/internal secret. Never expose this value to browser JavaScript.' });
  const successStatuses = route.explicitStatuses.filter((status) => status >= 200 && status < 300);
  const successStatus = String(successStatuses[0] ?? 200);
  const responses = {
    [successStatus]: {
      description: 'Successful response. Exact payload authority is the frozen handler and referenced DTO/type.',
      content: { 'application/json': { schema: route.responseContract === 'standard_api_envelope' ? { $ref: '#/components/schemas/SuccessEnvelope' } : { type: 'object', additionalProperties: true } } },
      'x-elceo-response-contract': route.responseContract,
      'x-elceo-imported-types': route.importedTypes
    }
  };
  for (const status of expectedErrorStatuses(route)) responses[String(status)] = { description: `Possible ${status} response under the frozen route/security contract.`, content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } };
  const operation = {
    tags: [route.family],
    summary: `${method} ${route.routePath}`,
    operationId: `${method.toLowerCase()}_${route.routePath.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
    parameters,
    responses,
    security: operationSecurity(route),
    'x-elceo-classification': route.classification,
    'x-elceo-runtime-expectation': route.runtimeExpectation,
    'x-elceo-product-entitlement': route.productEntitlement,
    'x-elceo-owner-boundary': route.ownerBoundary,
    'x-elceo-target-user-boundary': route.targetUserBoundary,
    'x-elceo-admin-permission': route.adminPermission,
    'x-elceo-step-up': route.stepUp,
    'x-elceo-idempotency': route.idempotency,
    'x-elceo-audit': route.audit,
    'x-elceo-browser-safe': route.browserSafe,
    'x-elceo-ui-audience': route.uiAudience,
    'x-elceo-source-file': route.routeFile,
    'x-elceo-validators': route.validators,
    'x-elceo-field-constraints': route.validators.length ? 'See referenced frozen validators; generated spec does not invent unproven limits.' : 'Unspecified beyond frozen handler/type contract.'
  };
  if (route.hasJsonBody && !['get', 'head', 'options'].includes(lower)) {
    operation.requestBody = {
      required: true,
      content: { 'application/json': { schema: { type: 'object', additionalProperties: true, 'x-elceo-validators': route.validators } } },
      description: 'Request body shape is governed by the frozen handler/validator references. Unproven field limits are intentionally not invented.'
    };
  }
  return operation;
}

function buildOpenApi(routes) {
  const paths = {};
  for (const route of routes) {
    const path = route.routePath;
    paths[path] ??= {};
    for (const method of route.methods) paths[path][method.toLowerCase()] = buildOperation(route, method);
  }
  return {
    openapi: '3.1.0',
    info: {
      title: 'ELCEO Frozen Backend API Handoff',
      version: FREEZE_COMMIT.slice(0, 12),
      description: 'Machine-derived UI/API handoff for the frozen ELCEO backend. Where a field constraint cannot be proven from the frozen handler/schema, it is intentionally left unspecified instead of guessed.'
    },
    jsonSchemaDialect: 'https://json-schema.org/draft/2020-12/schema',
    tags: uniqueSorted(routes.map((route) => route.family)).map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: {
        SessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'authjs.session-token',
          description: 'Auth.js-managed JWT session cookie. Production deployments may apply Auth.js secure-cookie prefixes; browser code must not construct or trust identity claims independently.'
        },
        InternalToken: {
          type: 'apiKey',
          in: 'header',
          name: 'x-elceo-internal-token',
          description: 'Server/internal secret boundary. Never expose this token to browser JavaScript.'
        }
      },
      schemas: {
        SuccessEnvelope: {
          type: 'object',
          required: ['ok', 'data'],
          properties: { ok: { const: true }, data: {}, meta: {} },
          additionalProperties: false
        },
        ErrorEnvelope: {
          type: 'object',
          properties: {
            ok: { const: false },
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: { code: { type: 'string' }, message: { type: 'string' }, details: {} },
              additionalProperties: true
            }
          },
          required: ['error'],
          additionalProperties: true,
          description: 'Canonical application error envelope where used. A small number of framework/specialized routes return handler-specific error JSON; see x-elceo-response-contract and source provenance.'
        }
      }
    },
    'x-elceo-freeze': { commit: FREEZE_COMMIT, tree: FREEZE_TREE, recordedAt: FREEZE_RECORDED_AT },
    'x-elceo-source-of-truth': 'apps/web/app/api/**/route.ts + apps/web/lib/server/access/route-policy-inventory.ts'
  };
}

function buildSummary(routes, openapi) {
  const operationCount = Object.values(openapi.paths).reduce((sum, item) => sum + HTTP_METHODS.filter((method) => item[method]).length, 0);
  return {
    schemaVersion: 1,
    frozenMainCommit: FREEZE_COMMIT,
    frozenFunctionalTree: FREEZE_TREE,
    generatedAt: FREEZE_RECORDED_AT,
    routeFileCount: routes.length,
    operationCount,
    browserSafeOperationCount: routes.reduce((sum, route) => sum + (route.browserSafe ? route.methods.length : 0), 0),
    userUiOperationCount: routes.filter((route) => route.uiAudience === 'user_ui').reduce((sum, route) => sum + route.methods.length, 0),
    adminServerBridgeOperationCount: routes.filter((route) => route.uiAudience === 'admin_server_bridge').reduce((sum, route) => sum + route.methods.length, 0),
    superAdminServerBridgeOperationCount: routes.filter((route) => route.uiAudience === 'super_admin_server_bridge').reduce((sum, route) => sum + route.methods.length, 0),
    serverInternalOperationCount: routes.filter((route) => route.uiAudience === 'server_internal').reduce((sum, route) => sum + route.methods.length, 0),
    providerWebhookOperationCount: routes.filter((route) => route.uiAudience === 'provider_webhook').reduce((sum, route) => sum + route.methods.length, 0),
    routeFamilies: uniqueSorted(routes.map((route) => route.family)),
    unresolvedFieldConstraintOperations: routes.reduce((sum, route) => sum + (route.validators.length ? 0 : route.methods.length), 0),
    note: 'Unresolved field-constraint count is informational: the handoff intentionally leaves constraints unspecified where the frozen route does not expose a statically provable validator reference.'
  };
}

export function buildHandoffData() {
  process.chdir(ROOT);
  const compiledInventory = join(ROOT, 'apps/web/dist-test/lib/server/access/route-policy-inventory.js');
  if (!existsSync(compiledInventory)) {
    throw new Error('compiled_route_inventory_missing: run `npm run compile:ui-handoff` first');
  }
  const require = createRequire(import.meta.url);
  delete require.cache[require.resolve(compiledInventory)];
  const { buildRouteInventory } = require(compiledInventory);
  const baseRoutes = buildRouteInventory(join(ROOT, 'apps/web/app/api'));
  const routes = baseRoutes.map(extractRouteDetails);
  const openapi = buildOpenApi(routes);
  const routeInventory = {
    schemaVersion: 1,
    frozenMainCommit: FREEZE_COMMIT,
    frozenFunctionalTree: FREEZE_TREE,
    generatedAt: FREEZE_RECORDED_AT,
    generator: 'scripts/generate-ui-handoff.mjs',
    canonicalInventory: 'apps/web/lib/server/access/route-policy-inventory.ts',
    routeFileCount: routes.length,
    operationCount: routes.reduce((sum, route) => sum + route.methods.length, 0),
    routes
  };
  const summary = buildSummary(routes, openapi);
  return { routeInventory, openapi, summary };
}

export function renderExplorer({ routeInventory, summary }) {
  const safeData = JSON.stringify({ routes: routeInventory.routes.map((route) => ({
    routePath: route.routePath,
    methods: route.methods,
    family: route.family,
    classification: route.classification,
    uiAudience: route.uiAudience,
    browserSafe: route.browserSafe,
    productEntitlement: route.productEntitlement,
    adminPermission: route.adminPermission,
    internalToken: route.internalToken,
    stepUp: route.stepUp,
    idempotency: route.idempotency,
    validators: route.validators,
    responseContract: route.responseContract,
    routeFile: route.routeFile
  })), summary }).replace(/</g, '\u003c');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ELCEO API Handoff Explorer</title>
<style>body{font-family:system-ui,sans-serif;margin:0;background:#0b0b0b;color:#f3f3f3}main{max-width:1500px;margin:auto;padding:24px}h1{margin:0 0 8px}.muted{color:#aaa}.controls{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0}input,select{background:#171717;color:#fff;border:1px solid #444;border-radius:6px;padding:10px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:8px;border-bottom:1px solid #292929;text-align:left;vertical-align:top}th{position:sticky;top:0;background:#111}.yes{color:#75d18b}.no{color:#ff9c7d}code{white-space:nowrap}</style></head>
<body><main><h1>ELCEO Frozen Backend API Handoff</h1><div class="muted" id="summary"></div><div class="controls"><input id="q" placeholder="Search path, family, validator…"><select id="aud"><option value="">All audiences</option></select></div><table><thead><tr><th>Method</th><th>Path</th><th>Family</th><th>Audience</th><th>Browser-safe</th><th>Entitlement / admin</th><th>Security</th><th>Validators</th><th>Response contract</th><th>Source</th></tr></thead><tbody id="rows"></tbody></table></main>
<script id="handoff-data" type="application/json">__HANDOFF_DATA__</script><script>
const data=JSON.parse(document.getElementById('handoff-data').textContent);const q=document.getElementById('q'),aud=document.getElementById('aud'),rows=document.getElementById('rows');
document.getElementById('summary').textContent='Frozen '+data.summary.frozenMainCommit.slice(0,12)+' · '+data.summary.routeFileCount+' route files · '+data.summary.operationCount+' operations';
[...new Set(data.routes.map(r=>r.uiAudience))].sort().forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;aud.appendChild(o)});
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function render(){const needle=q.value.trim().toLowerCase(),a=aud.value;const expanded=data.routes.flatMap(r=>r.methods.map(method=>({...r,method}))).filter(r=>(!a||r.uiAudience===a)&&(!needle||JSON.stringify(r).toLowerCase().includes(needle)));rows.innerHTML=expanded.map(r=>'<tr><td><code>'+esc(r.method)+'</code></td><td><code>'+esc(r.routePath)+'</code></td><td>'+esc(r.family)+'</td><td>'+esc(r.uiAudience)+'</td><td class="'+(r.browserSafe?'yes':'no')+'">'+(r.browserSafe?'yes':'no')+'</td><td>'+esc(r.productEntitlement)+'<br>'+esc(r.adminPermission)+'</td><td>internal:'+esc(r.internalToken)+'<br>step-up:'+esc(r.stepUp)+'<br>idempotency:'+esc(r.idempotency)+'</td><td>'+esc(r.validators.join(', ')||'unspecified')+'</td><td>'+esc(r.responseContract)+'</td><td><code>'+esc(r.routeFile)+'</code></td></tr>').join('')}
q.addEventListener('input',render);aud.addEventListener('change',render);render();
</script></body></html>\n`;
  return html.replace('__HANDOFF_DATA__', safeData);
}

export function writeHandoffArtifacts(data = buildHandoffData()) {
  const artifactDir = join(ROOT, 'artifacts/ui-handoff');
  const docsDir = join(ROOT, 'docs/ui-handoff');
  mkdirSync(artifactDir, { recursive: true });
  mkdirSync(docsDir, { recursive: true });
  writeFileSync(join(artifactDir, 'route-inventory.json'), `${JSON.stringify(data.routeInventory, null, 2)}\n`);
  writeFileSync(join(artifactDir, 'openapi.json'), `${JSON.stringify(data.openapi, null, 2)}\n`);
  writeFileSync(join(artifactDir, 'handoff-summary.json'), `${JSON.stringify(data.summary, null, 2)}\n`);
  writeFileSync(join(docsDir, 'api-explorer.html'), renderExplorer(data));
  return data.summary;
}

if (resolve(process.argv[1] ?? '') === __filename) {
  const summary = writeHandoffArtifacts();
  console.log(`UI handoff generated: ${summary.routeFileCount} route files / ${summary.operationCount} operations`);
}
