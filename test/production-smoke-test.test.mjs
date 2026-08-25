import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import http from 'node:http';
import { test } from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const sessionCookie = 'authjs.session-token=smoke-session';
const internalToken = 'smoke-internal-token';

async function withSmokeServer(run) {
  const requests = [];
  const server = http.createServer((request, response) => {
    requests.push({ method: request.method, url: request.url, headers: request.headers });
    const hasSession = request.headers.cookie === sessionCookie;
    const hasInternalToken = request.headers['x-elceo-internal-token'] === internalToken;
    const isAdmin = request.url.startsWith('/api/admin/');
    const isAuthenticatedRead = [
      '/api/refresh/latest',
      '/api/account/entitlements',
      '/api/account/usage',
    ].includes(request.url);
    const isMutation = request.url === '/api/internal/billing/reconcile/retry';
    const isProtectedMutation = request.url === '/api/workspace/refresh';

    let status = 200;
    if (isAdmin && !hasInternalToken) status = 403;
    else if ((isAdmin || isAuthenticatedRead || isMutation || isProtectedMutation) && !hasSession) status = 401;
    else if (isMutation && !hasInternalToken) status = 403;

    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(JSON.stringify(status === 200
      ? { ok: true, data: {} }
      : { ok: false, error: { code: status === 401 ? 'unauthorized' : 'forbidden', message: 'denied' } }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    await run(`http://127.0.0.1:${port}`, requests);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function runSmoke(baseUrl, overrides = {}) {
  const env = { ...process.env };
  delete env.ELCEO_INTERNAL_API_TOKEN;
  delete env.ELCEO_SMOKE_SESSION_COOKIE;
  delete env.ELCEO_SMOKE_AUTH_TOKEN;
  delete env.ELCEO_SMOKE_ALLOW_MUTATIONS;
  return execFileAsync(process.execPath, ['scripts/production-smoke-test.mjs'], {
    cwd: process.cwd(),
    env: { ...env, ELCEO_SMOKE_BASE_URL: baseUrl, ELCEO_SMOKE_VERBOSE: 'true', ...overrides },
  });
}

test('default safe mode runs negative checks without mutations', async () => {
  await withSmokeServer(async (baseUrl, requests) => {
    const { stdout } = await runSmoke(baseUrl);
    assert.match(stdout, /Mutation checks skipped by default \(safe mode\)/);
    assert.equal(requests.some(({ url }) => url === '/api/internal/billing/reconcile/retry'), false);
    assert.equal(requests.filter(({ method }) => method === 'POST').length, 1);
  });
});

test('absent optional authentication is explicitly skipped', async () => {
  await withSmokeServer(async (baseUrl) => {
    const { stdout } = await runSmoke(baseUrl);
    assert.match(stdout, /SKIPPED.*Auth read checks.*ELCEO_SMOKE_SESSION_COOKIE not set/);
    assert.match(stdout, /SKIPPED.*Internal admin reads with session and token/);
  });
});

test('internal token alone is rejected and does not enable positive admin reads', async () => {
  await withSmokeServer(async (baseUrl, requests) => {
    const { stdout } = await runSmoke(baseUrl, { ELCEO_INTERNAL_API_TOKEN: internalToken });
    assert.match(stdout, /PASSED.*Internal token alone does not authenticate an admin: status=401/);
    assert.match(stdout, /SKIPPED.*Internal admin reads with session and token/);
    const tokenOnlyAdminRequests = requests.filter(({ url, headers }) =>
      url.startsWith('/api/admin/') && headers['x-elceo-internal-token'] === internalToken);
    assert.equal(tokenOnlyAdminRequests.length, 1);
    assert.equal(tokenOnlyAdminRequests[0].headers.cookie, undefined);
  });
});

test('authenticated user reads send the supported session cookie', async () => {
  await withSmokeServer(async (baseUrl, requests) => {
    const { stdout } = await runSmoke(baseUrl, { ELCEO_SMOKE_SESSION_COOKIE: sessionCookie });
    assert.match(stdout, /PASSED.*Auth read checks/);
    const authReads = requests.filter(({ url, headers }) =>
      ['/api/refresh/latest', '/api/account/entitlements', '/api/account/usage'].includes(url) && headers.cookie);
    assert.equal(authReads.length, 3);
    assert.ok(authReads.every(({ headers }) => headers.cookie === sessionCookie && headers.authorization === undefined));
  });
});

test('positive admin reads send both authenticated session and internal token', async () => {
  await withSmokeServer(async (baseUrl, requests) => {
    const { stdout } = await runSmoke(baseUrl, {
      ELCEO_INTERNAL_API_TOKEN: internalToken,
      ELCEO_SMOKE_SESSION_COOKIE: sessionCookie,
    });
    assert.match(stdout, /PASSED.*Internal admin reads with session and token/);
    const positiveAdminReads = requests.filter(({ url, headers }) =>
      url.startsWith('/api/admin/') && headers.cookie === sessionCookie);
    assert.equal(positiveAdminReads.length, 3);
    assert.ok(positiveAdminReads.every(({ headers }) => headers['x-elceo-internal-token'] === internalToken));
  });
});

test('mutation request remains opt-in and carries both security credentials', async () => {
  await withSmokeServer(async (baseUrl, requests) => {
    await runSmoke(baseUrl, {
      ELCEO_INTERNAL_API_TOKEN: internalToken,
      ELCEO_SMOKE_SESSION_COOKIE: sessionCookie,
    });
    assert.equal(requests.some(({ url }) => url === '/api/internal/billing/reconcile/retry'), false);

    const { stdout } = await runSmoke(baseUrl, {
      ELCEO_INTERNAL_API_TOKEN: internalToken,
      ELCEO_SMOKE_SESSION_COOKIE: sessionCookie,
      ELCEO_SMOKE_ALLOW_MUTATIONS: 'true',
    });
    assert.match(stdout, /PASSED.*Optional mutation check/);
    const mutation = requests.findLast(({ url }) => url === '/api/internal/billing/reconcile/retry');
    assert.equal(mutation.headers.cookie, sessionCookie);
    assert.equal(mutation.headers['x-elceo-internal-token'], internalToken);
  });
});
