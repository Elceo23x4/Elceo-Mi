#!/usr/bin/env node
const baseUrl = process.env.ELCEO_STAGING_BASE_URL;
const authToken = process.env.ELCEO_STAGING_AUTH_TOKEN;
const internalToken = process.env.ELCEO_INTERNAL_API_TOKEN;
const allowMutations = process.env.ELCEO_STAGING_ALLOW_MUTATION_PROBES === 'true';
const allowProdTarget = process.env.ELCEO_STAGING_ALLOW_PRODUCTION_TARGET === 'true';

if (!baseUrl) {
  console.error('ELCEO_STAGING_BASE_URL is required.');
  process.exit(1);
}

if (/prod|production/i.test(baseUrl) && !allowProdTarget) {
  console.error('Refusing production-like target without ELCEO_STAGING_ALLOW_PRODUCTION_TARGET=true.');
  process.exit(1);
}

if (/prod|production/i.test(baseUrl) && allowProdTarget) {
  console.warn('WARNING: Production-like target override enabled. Proceeding intentionally.');
}

const timeoutMs = 8000;
const secretPatterns = [/at\s+\S+\s*\(/i, /password\s*=/i, /elceo_internal_api_token/i, /api[_-]?key/i, /sk_(live|test)_/i];
const summary = [];

async function probe(name, fn, required = true) {
  try {
    const result = await fn();
    summary.push({ name, status: result ? 'pass' : required ? 'fail' : 'skip' });
  } catch {
    summary.push({ name, status: required ? 'fail' : 'skip' });
  }
}

function request(path, opts = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(new URL(path, baseUrl), { ...opts, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

(async () => {
  await probe('header:security-baseline', async () => {
    const res = await request('/');
    const xcto = res.headers.get('x-content-type-options');
    const referrer = res.headers.get('referrer-policy');
    return Boolean(xcto && referrer);
  });

  await probe('header:no-wildcard-cors-admin', async () => {
    const res = await request('/api/admin/market-evidence/payloads');
    return res.headers.get('access-control-allow-origin') !== '*';
  });

  await probe('denial:admin-without-token', async () => {
    const res = await request('/api/admin/market-evidence/payloads');
    return [401, 403].includes(res.status);
  });

  await probe('denial:scheduled-dry-run-without-token', async () => {
    const res = await request('/api/admin/market-evidence/scheduled-ingestion/dry-run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    return [401, 403].includes(res.status);
  });

  await probe('denial:internal-fixture-ingest-without-token', async () => {
    const res = await request('/api/internal/market-evidence/tiingo/fixture-ingest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    return [401, 403].includes(res.status);
  });

  await probe('abuse:invalid-query-standard-error', async () => {
    const res = await request('/api/admin/market-evidence/payloads?limit=-1');
    const text = await res.text();
    return res.status >= 400 && text.includes('ok') && text.includes('error');
  });

  await probe('secrets:no-leak-in-denied-body', async () => {
    const res = await request('/api/admin/market-evidence/payloads');
    const text = (await res.text()).slice(0, 4000);
    return !secretPatterns.some((pattern) => pattern.test(text));
  });

  await probe('provider-live:blocked-by-default', async () => {
    const res = await request('/api/admin/market-evidence/scheduled-ingestion/dry-run', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(internalToken ? { authorization: `Bearer ${internalToken}` } : {}) },
      body: JSON.stringify({ jobId: 'staging-safety-job', provider: 'tiingo', mode: 'live' })
    });
    return res.status >= 400;
  }, false);

  if (allowMutations) {
    await probe('abuse:malformed-json-safe-endpoint', async () => {
      const headers = { 'content-type': 'application/json', 'x-idempotency-key': 's6-drill-malformed-json' };
      const res = await request('/api/admin/market-evidence/scheduled-ingestion/dry-run', { method: 'POST', headers, body: '{"bad":' });
      return res.status >= 400;
    }, false);
  } else {
    summary.push({ name: 'abuse:malformed-json-safe-endpoint', status: 'skip' });
  }

  if (authToken) {
    await probe('auth:token-present-check', async () => true, false);
  } else {
    summary.push({ name: 'auth:token-present-check', status: 'skip' });
  }

  if (internalToken) {
    await probe('internal:token-present-check', async () => true, false);
  } else {
    summary.push({ name: 'internal:token-present-check', status: 'skip' });
  }

  const pass = summary.filter((x) => x.status === 'pass').length;
  const fail = summary.filter((x) => x.status === 'fail').length;
  const skip = summary.filter((x) => x.status === 'skip').length;
  console.log('Staging attack drill summary:');
  for (const row of summary) console.log(` - ${row.status.toUpperCase()}: ${row.name}`);
  console.log(`Totals => pass:${pass} fail:${fail} skip:${skip}`);
  process.exit(fail > 0 ? 1 : 0);
})();
