#!/usr/bin/env node

const DEFAULT_TIMEOUT_MS = 8000;

const baseUrl = process.env.ELCEO_SMOKE_BASE_URL;
const internalToken = process.env.ELCEO_INTERNAL_API_TOKEN;
const sessionCookie = process.env.ELCEO_SMOKE_SESSION_COOKIE;
const allowMutations = process.env.ELCEO_SMOKE_ALLOW_MUTATIONS === 'true';
const verbose = process.env.ELCEO_SMOKE_VERBOSE === 'true';

if (!baseUrl) {
  console.error('Missing required env: ELCEO_SMOKE_BASE_URL');
  process.exit(1);
}

let parsedBaseUrl;
try {
  parsedBaseUrl = new URL(baseUrl);
} catch {
  console.error('ELCEO_SMOKE_BASE_URL must be a valid absolute URL');
  process.exit(1);
}

if (!['http:', 'https:'].includes(parsedBaseUrl.protocol)) {
  console.error('ELCEO_SMOKE_BASE_URL must use http or https');
  process.exit(1);
}

const results = [];

function summarizeEnvelope(body) {
  if (!body || typeof body !== 'object') return false;
  if (body.ok === true) return Object.prototype.hasOwnProperty.call(body, 'data');
  if (body.ok === false) {
    if (!body.error || typeof body.error !== 'object') return false;
    return typeof body.error.code === 'string' && typeof body.error.message === 'string';
  }
  return false;
}

async function requestJson(method, path, { headers = {}, body } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(new URL(path, parsedBaseUrl), {
      method,
      headers,
      body,
      signal: controller.signal,
    });
    const text = await response.text();
    let json = null;
    if (text.length > 0) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }

    return { response, json, text };
  } finally {
    clearTimeout(timeout);
  }
}

async function runCheck(check) {
  if (check.optional && !check.enabled()) {
    results.push({ name: check.name, status: 'skipped', message: check.skipMessage });
    return;
  }

  try {
    const outcome = await check.run();
    results.push({ name: check.name, ...outcome });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    results.push({ name: check.name, status: 'failed', message });
  }
}

const checks = [
  {
    name: 'Unauthorized envelope on protected account route',
    async run() {
      const { response, json } = await requestJson('GET', '/api/account/entitlements');
      const statusOk = response.status === 401 || response.status === 403;
      const envelopeOk = summarizeEnvelope(json) && json.ok === false;
      if (!statusOk || !envelopeOk) {
        return { status: 'failed', message: `Expected 401/403 + error envelope, got ${response.status}` };
      }
      return { status: 'passed', message: `status=${response.status}` };
    },
  },
  {
    name: 'Internal token gate rejects missing token',
    async run() {
      const { response, json } = await requestJson('GET', '/api/admin/system-summary');
      const statusOk = response.status === 401 || response.status === 403;
      const envelopeOk = summarizeEnvelope(json) && json.ok === false;
      if (!statusOk || !envelopeOk) {
        return { status: 'failed', message: `Expected 401/403 + error envelope, got ${response.status}` };
      }
      return { status: 'passed', message: `status=${response.status}` };
    },
  },
  {
    name: 'Internal token alone does not authenticate an admin',
    optional: true,
    enabled: () => Boolean(internalToken),
    skipMessage: 'ELCEO_INTERNAL_API_TOKEN not set',
    async run() {
      const { response, json } = await requestJson('GET', '/api/admin/system-summary', {
        headers: { 'x-elceo-internal-token': internalToken },
      });
      const statusOk = response.status === 401 || response.status === 403;
      const envelopeOk = summarizeEnvelope(json) && json.ok === false;
      if (!statusOk || !envelopeOk) {
        return { status: 'failed', message: `Expected 401/403 + error envelope, got ${response.status}` };
      }
      return { status: 'passed', message: `status=${response.status}` };
    },
  },
  {
    name: 'Internal admin reads with session and token',
    optional: true,
    enabled: () => Boolean(internalToken && sessionCookie),
    skipMessage: 'ELCEO_INTERNAL_API_TOKEN and ELCEO_SMOKE_SESSION_COOKIE are both required',
    async run() {
      const endpoints = ['/api/admin/system-summary', '/api/admin/ops', '/api/admin/providers'];
      for (const endpoint of endpoints) {
        const { response, json } = await requestJson('GET', endpoint, {
          headers: {
            Cookie: sessionCookie,
            'x-elceo-internal-token': internalToken,
          },
        });
        if (response.status !== 200 || !summarizeEnvelope(json) || json.ok !== true) {
          return { status: 'failed', message: `Endpoint ${endpoint} returned ${response.status}` };
        }
      }
      return { status: 'passed', message: 'all internal admin reads returned ok envelopes' };
    },
  },
  {
    name: 'Auth read checks',
    optional: true,
    enabled: () => Boolean(sessionCookie),
    skipMessage: 'ELCEO_SMOKE_SESSION_COOKIE not set',
    async run() {
      const endpoints = ['/api/refresh/latest', '/api/account/entitlements', '/api/account/usage'];
      for (const endpoint of endpoints) {
        const { response, json } = await requestJson('GET', endpoint, {
          headers: { Cookie: sessionCookie },
        });
        if (response.status !== 200 || !summarizeEnvelope(json) || json.ok !== true) {
          return { status: 'failed', message: `Endpoint ${endpoint} returned ${response.status}` };
        }
      }
      return { status: 'passed', message: 'all auth reads returned ok envelopes' };
    },
  },
  {
    name: 'Protected POST rejects missing auth/internal token',
    async run() {
      const { response, json } = await requestJson('POST', '/api/workspace/refresh', {
        headers: { 'content-type': 'application/json', 'Idempotency-Key': `smoke-${Date.now()}` },
        body: JSON.stringify({}),
      });
      const statusOk = response.status === 401 || response.status === 403;
      const envelopeOk = summarizeEnvelope(json) && json.ok === false;
      if (!statusOk || !envelopeOk) {
        return { status: 'failed', message: `Expected 401/403 + error envelope, got ${response.status}` };
      }
      return { status: 'passed', message: `status=${response.status}` };
    },
  },
  {
    name: 'Mutation mode guard',
    async run() {
      if (allowMutations) {
        return {
          status: 'passed',
          message: 'Mutation mode enabled. Use only on staging/safe environments.',
        };
      }
      return { status: 'passed', message: 'Mutation checks skipped by default (safe mode)' };
    },
  },
];

if (allowMutations) {
  checks.push({
    name: 'Optional mutation check: internal billing reconcile retry envelope',
    optional: true,
    enabled: () => Boolean(internalToken && sessionCookie),
    skipMessage: 'ELCEO_INTERNAL_API_TOKEN and ELCEO_SMOKE_SESSION_COOKIE are both required',
    async run() {
      const subjectId = 'smoke-test-subject';
      const { response, json } = await requestJson('POST', '/api/internal/billing/reconcile/retry', {
        headers: {
          'content-type': 'application/json',
          Cookie: sessionCookie,
          'x-elceo-internal-token': internalToken,
          'Idempotency-Key': `smoke-mutation-${Date.now()}`,
        },
        body: JSON.stringify({ subjectId }),
      });
      const statusAllowed = [200, 400, 404, 422, 424].includes(response.status);
      if (!statusAllowed || !summarizeEnvelope(json)) {
        return { status: 'failed', message: `Unexpected response status ${response.status}` };
      }
      return { status: 'passed', message: `status=${response.status} envelope validated` };
    },
  });
}

for (const check of checks) {
  await runCheck(check);
}

if (verbose) {
  for (const result of results) {
    console.log(`[${result.status.toUpperCase()}] ${result.name}: ${result.message}`);
  }
}

const passed = results.filter((result) => result.status === 'passed').length;
const failed = results.filter((result) => result.status === 'failed').length;
const skipped = results.filter((result) => result.status === 'skipped').length;

console.log(`Smoke test summary: passed=${passed} failed=${failed} skipped=${skipped}`);
for (const result of results) {
  if (result.status !== 'passed') {
    console.log(` - ${result.status.toUpperCase()}: ${result.name} (${result.message})`);
  }
}

if (failed > 0) {
  process.exit(1);
}
