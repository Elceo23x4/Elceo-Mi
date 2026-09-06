import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { ErrorEvent } from '@sentry/nextjs';
import { allowedCaptureTags, applyBrowserSentryPrivacyPolicy, applySentryPrivacyPolicy, isValidPublicDsn } from '../lib/sentry-policy';
import { browserSentryDsn, isSentryBrowserBuildAuthorized, sentryBrowserBuildEnv, sentryBrowserIngestOrigin, sentryBrowserRelease, sentryConnectSources, sentryRelease, serverSentryDsn } from '../lib/sentry-dsn.mjs';

const PUBLIC_KEY = '0123456789abcdef0123456789abcdef';
const DEFAULT_DSN = `https://${PUBLIC_KEY}@o4500000000000000.ingest.sentry.io/1234567`;
const US_DSN = `https://${PUBLIC_KEY}@o4500000000000000.ingest.us.sentry.io/1234567`;
const DE_DSN = `https://${PUBLIC_KEY}@o4500000000000000.ingest.de.sentry.io/1234567`;
const COMMIT_RELEASE = '0123456789abcdef0123456789abcdef01234567';
const RAILWAY_COMMIT_RELEASE = 'a4b7c9d2e5f80123456789abcdef0123456789ab';

export function runSentryPrivacyPolicyTests() {
  const filtered = applySentryPrivacyPolicy({
    type: undefined,
    message: 'private@example.com journal-sentinel cus_payment_123 Bearer_token_secret webhook_provider_secret',
    exception: { values: [{
      type: 'PaymentProviderError',
      value: 'private@example.com journal-sentinel cus_payment_123 Bearer_token_secret webhook_provider_secret',
      mechanism: { type: 'generic', handled: true, data: { authorization: 'Bearer_token_secret' } },
      stacktrace: { frames: [{ filename: 'https://elceo.test/route.ts?token=Bearer_token_secret', function: 'POST', lineno: 42, vars: { token: 'Bearer_token_secret' } }] }
    }] },
    request: { url: 'https://elceo.test/dashboard?token=secret', cookies: { session: 'secret' } },
    user: { id: 'user-1', email: 'private@example.com', ip_address: '127.0.0.1' },
    extra: { body: 'private journal text' },
    breadcrumbs: [{ message: 'private coaching payload' }],
    tags: {
      scope: 'api.dashboard',
      route: '/dashboard?asset=private',
      requestId: 'request-123',
      customerReference: 'cus_private'
    }
  } as ErrorEvent);

  assert.equal(filtered.request, undefined);
  assert.equal(filtered.user, undefined);
  assert.equal(filtered.extra, undefined);
  assert.equal(filtered.breadcrumbs, undefined);
  assert.equal(filtered.message, 'ELCEO captured error');
  assert.equal(filtered.exception?.values?.[0]?.value, 'ELCEO captured error');
  assert.equal(filtered.exception?.values?.[0]?.type, 'PaymentProviderError');
  assert.equal(filtered.exception?.values?.[0]?.stacktrace?.frames?.[0]?.lineno, 42);
  assert.equal(filtered.exception?.values?.[0]?.stacktrace?.frames?.[0]?.filename, 'https://elceo.test/route.ts');
  assert.equal(filtered.exception?.values?.[0]?.stacktrace?.frames?.[0]?.vars, undefined);
  const serialized = JSON.stringify(filtered);
  for (const sentinel of ['private@example.com', 'journal-sentinel', 'cus_payment_123', 'Bearer_token_secret', 'webhook_provider_secret']) {
    assert.equal(serialized.includes(sentinel), false);
  }
  assert.deepEqual(filtered.tags, {
    scope: 'api.dashboard',
    route: '/dashboard',
    requestId: 'request-123'
  });

  const debugMeta = {
    images: [{
      type: 'sourcemap' as const,
      code_file: 'https://staging.elceo.app/_next/static/chunks/app.js',
      debug_id: '12345678-1234-4234-8234-123456789abc'
    }]
  };
  const ambientBrowserEvent = {
    type: undefined,
    message: 'private journal content',
    debug_meta: debugMeta,
    request: { data: 'provider payload' },
    user: { email: 'private@example.com' },
    extra: { customer: 'cus_private' },
    breadcrumbs: [{ message: 'authorization material' }],
    contexts: { device: { name: 'private device' } },
    tags: { category: 'diagnostic', arbitrary: 'private' }
  } as ErrorEvent;
  const browserFiltered = applyBrowserSentryPrivacyPolicy(ambientBrowserEvent);
  assert.equal(browserFiltered.debug_meta, debugMeta);
  assert.equal(browserFiltered.debug_meta?.images, debugMeta.images);
  assert.deepEqual(browserFiltered.debug_meta?.images?.[0], debugMeta.images[0]);
  assert.equal(browserFiltered.request, undefined);
  assert.equal(browserFiltered.user, undefined);
  assert.equal(browserFiltered.extra, undefined);
  assert.equal(browserFiltered.breadcrumbs, undefined);
  assert.equal(browserFiltered.contexts, undefined);
  assert.deepEqual(browserFiltered.tags, { category: 'diagnostic' });
  assert.equal(applySentryPrivacyPolicy(ambientBrowserEvent).debug_meta, undefined);

  assert.deepEqual(allowedCaptureTags('api.checkout', {
    requestId: 'request-456',
    route: 'https://elceo.test/api/checkout?customer=private',
    providerPayload: { email: 'private@example.com' }
  }), {
    appEnv: 'staging',
    scope: 'api.checkout',
    route: '/api/checkout',
    requestId: 'request-456'
  });

  assert.equal(isValidPublicDsn(DEFAULT_DSN), true);
  assert.equal(isValidPublicDsn(US_DSN), true);
  assert.equal(isValidPublicDsn(DE_DSN), true);
  assert.equal(isValidPublicDsn('https://0123456789abcdef0123456789abcdef@attacker.example/123'), false);
  assert.equal(isValidPublicDsn('https://0123456789abcdef0123456789abcdef@localhost/123'), false);
  assert.equal(isValidPublicDsn(`https://${PUBLIC_KEY}@o1.ingest.xyz.sentry.io/123`), false);
  assert.equal(isValidPublicDsn('https://0123456789abcdef0123456789abcdef:secret@o1.ingest.sentry.io/123'), false);
  assert.equal(isValidPublicDsn('http://0123456789abcdef0123456789abcdef@o1.ingest.sentry.io/123'), false);
  assert.equal(isValidPublicDsn('https://0123456789abcdef0123456789abcdef@o1.ingest.sentry.io/not-a-project'), false);
  assert.equal(isValidPublicDsn('not-a-dsn'), false);

  assert.equal(sentryBrowserIngestOrigin({ APP_ENV: 'staging', NEXT_PUBLIC_APP_ENV: 'staging' }), null);
  assert.equal(sentryBrowserIngestOrigin({ APP_ENV: 'staging', NEXT_PUBLIC_APP_ENV: 'staging', NEXT_PUBLIC_SENTRY_DSN: 'https://0123456789abcdef0123456789abcdef@attacker.example/123' }), null);
  assert.equal(sentryBrowserIngestOrigin({ APP_ENV: 'production', NEXT_PUBLIC_APP_ENV: 'staging', NEXT_PUBLIC_SENTRY_DSN: US_DSN }), null);
  assert.equal(sentryBrowserIngestOrigin({ APP_ENV: 'staging', NEXT_PUBLIC_APP_ENV: 'production', NEXT_PUBLIC_SENTRY_DSN: US_DSN }), null);
  assert.equal(serverSentryDsn({ APP_ENV: 'production', SENTRY_DSN: US_DSN }), null);
  assert.equal(browserSentryDsn({ NEXT_PUBLIC_ELCEO_SENTRY_BROWSER_ENABLED: 'false', NEXT_PUBLIC_APP_ENV: 'staging', NEXT_PUBLIC_SENTRY_DSN: US_DSN }), null);
  assert.equal(browserSentryDsn({ NEXT_PUBLIC_ELCEO_SENTRY_BROWSER_ENABLED: 'true', NEXT_PUBLIC_APP_ENV: 'staging', NEXT_PUBLIC_SENTRY_DSN: US_DSN })?.dsn, US_DSN);
  assert.equal(sentryBrowserIngestOrigin({ APP_ENV: 'staging', NEXT_PUBLIC_APP_ENV: 'staging', NEXT_PUBLIC_SENTRY_DSN: DE_DSN }), 'https://o4500000000000000.ingest.de.sentry.io');
  assert.equal(sentryBrowserIngestOrigin({ APP_ENV: 'staging', NEXT_PUBLIC_APP_ENV: 'staging', NEXT_PUBLIC_SENTRY_DSN: `${US_DSN}?token=private` }), null);
  assert.deepEqual(sentryConnectSources({ APP_ENV: 'staging', NEXT_PUBLIC_APP_ENV: 'staging' }), ["'self'", 'https://api.onesignal.com']);
  assert.deepEqual(sentryConnectSources({ APP_ENV: 'staging', NEXT_PUBLIC_APP_ENV: 'staging', NEXT_PUBLIC_SENTRY_DSN: `${US_DSN}?token=private` }), ["'self'", 'https://api.onesignal.com']);
  assert.deepEqual(sentryConnectSources({ APP_ENV: 'staging', NEXT_PUBLIC_APP_ENV: 'staging', NEXT_PUBLIC_SENTRY_DSN: DE_DSN }), ["'self'", 'https://api.onesignal.com', 'https://o4500000000000000.ingest.de.sentry.io']);
  assert.equal(isSentryBrowserBuildAuthorized({ APP_ENV: 'production', NEXT_PUBLIC_APP_ENV: 'staging', NEXT_PUBLIC_SENTRY_DSN: US_DSN }), false);
  assert.equal(isSentryBrowserBuildAuthorized({ APP_ENV: 'staging', NEXT_PUBLIC_APP_ENV: 'production', NEXT_PUBLIC_SENTRY_DSN: US_DSN }), false);
  assert.equal(isSentryBrowserBuildAuthorized({ APP_ENV: 'staging', NEXT_PUBLIC_APP_ENV: 'staging', NEXT_PUBLIC_SENTRY_DSN: 'invalid' }), false);
  assert.equal(isSentryBrowserBuildAuthorized({ APP_ENV: 'staging', NEXT_PUBLIC_APP_ENV: 'staging', NEXT_PUBLIC_SENTRY_DSN: US_DSN }), true);
  const authorizedBrowserBuild = {
    APP_ENV: 'staging',
    NEXT_PUBLIC_APP_ENV: 'staging',
    NEXT_PUBLIC_SENTRY_DSN: US_DSN
  };
  assert.equal(sentryBrowserRelease({ ...authorizedBrowserBuild, RAILWAY_GIT_COMMIT_SHA: RAILWAY_COMMIT_RELEASE }), RAILWAY_COMMIT_RELEASE);
  assert.equal(sentryRelease({ RAILWAY_GIT_COMMIT_SHA: RAILWAY_COMMIT_RELEASE, SENTRY_RELEASE: COMMIT_RELEASE }), RAILWAY_COMMIT_RELEASE);
  assert.equal(sentryRelease({ RAILWAY_GIT_COMMIT_SHA: 'malformed', SENTRY_RELEASE: COMMIT_RELEASE }), COMMIT_RELEASE);
  assert.equal(sentryRelease({ RAILWAY_GIT_COMMIT_SHA: 'malformed', SENTRY_RELEASE: 'also-malformed' }), undefined);
  assert.equal(sentryRelease({}), undefined);
  assert.equal(sentryBrowserRelease(authorizedBrowserBuild), undefined);
  for (const unsafeRelease of [
    'main',
    'feature/sentry-release',
    '0123456',
    '0123456789abcdef0123456789abcdef0123456',
    `${COMMIT_RELEASE}\nSENTRY_AUTH_TOKEN=secret`,
    'release@example.com'
  ]) {
    assert.equal(sentryRelease({ RAILWAY_GIT_COMMIT_SHA: unsafeRelease }), undefined);
    assert.equal(sentryRelease({ SENTRY_RELEASE: unsafeRelease }), undefined);
  }
  assert.equal(sentryBrowserRelease({
    ...authorizedBrowserBuild,
    APP_ENV: 'production',
    RAILWAY_GIT_COMMIT_SHA: RAILWAY_COMMIT_RELEASE
  }), undefined);

  assert.deepEqual(sentryBrowserBuildEnv({
    ...authorizedBrowserBuild,
    RAILWAY_GIT_COMMIT_SHA: RAILWAY_COMMIT_RELEASE,
    SENTRY_DSN: DEFAULT_DSN,
    [['SENTRY', 'AUTH', 'TOKEN'].join('_')]: 'must-not-be-public',
    SENTRY_ENVIRONMENT: 'private',
    OTHER_SERVER_ONLY_VALUE: 'private'
  }), {
    NEXT_PUBLIC_ELCEO_SENTRY_BROWSER_ENABLED: 'true',
    NEXT_PUBLIC_ELCEO_SENTRY_RELEASE: RAILWAY_COMMIT_RELEASE
  });
  assert.deepEqual(sentryBrowserBuildEnv({
    ...authorizedBrowserBuild,
    APP_ENV: 'production',
    RAILWAY_GIT_COMMIT_SHA: RAILWAY_COMMIT_RELEASE
  }), { NEXT_PUBLIC_ELCEO_SENTRY_BROWSER_ENABLED: 'false' });

  const envSchema = readFileSync('../../packages/schemas/src/env.schema.ts', 'utf8');
  for (const variable of ['SENTRY_DSN', 'NEXT_PUBLIC_SENTRY_DSN', 'NEXT_PUBLIC_APP_ENV', 'SENTRY_ENVIRONMENT', 'SENTRY_RELEASE']) {
    assert.match(envSchema, new RegExp(`${variable}\\?`));
  }
  const sentrySources = [
    readFileSync('instrumentation.ts', 'utf8'),
    readFileSync('instrumentation-client.ts', 'utf8'),
    readFileSync('lib/sentry-policy.ts', 'utf8'),
    readFileSync('lib/sentry-dsn.mjs', 'utf8')
  ].join('\n');
  assert.equal(sentrySources.includes(['SENTRY', 'AUTH', 'TOKEN'].join('_')), false);

  const nextConfigSource = readFileSync('next.config.mjs', 'utf8');
  assert.match(readFileSync('lib/sentry-dsn.mjs', 'utf8'), /NEXT_PUBLIC_ELCEO_SENTRY_RELEASE/);
  assert.equal(nextConfigSource.includes('NEXT_PUBLIC_APP_ENV:'), false);
  assert.equal(nextConfigSource.includes(['SENTRY', 'AUTH', 'TOKEN'].join('_')), false);
  assert.match(nextConfigSource, /sentryBrowserBuildEnv\(process\.env\)/);

  const serverInstrumentationSource = readFileSync('instrumentation.ts', 'utf8');
  const browserInstrumentationSource = readFileSync('instrumentation-client.ts', 'utf8');
  assert.match(browserInstrumentationSource, /beforeSend: applyBrowserSentryPrivacyPolicy/);
  assert.equal(browserInstrumentationSource.includes('beforeSend: applySentryPrivacyPolicy'), false);
  assert.match(serverInstrumentationSource, /beforeSend: applySentryPrivacyPolicy/);
  assert.equal(serverInstrumentationSource.includes('applyBrowserSentryPrivacyPolicy'), false);
  assert.match(serverInstrumentationSource, /release: sentryRelease\(process\.env\)/);
  assert.equal(serverInstrumentationSource.includes('process.env.SENTRY_RELEASE'), false);

  const diagnosticPageSource = readFileSync('app/diagnostics/sentry-symbolication/page.tsx', 'utf8');
  const diagnosticClientSource = readFileSync('app/diagnostics/sentry-symbolication/SentrySymbolicationProbe.tsx', 'utf8');
  assert.match(diagnosticPageSource, /process\.env\.APP_ENV !== 'staging'/);
  assert.match(diagnosticPageSource, /notFound\(\)/);
  assert.match(diagnosticPageSource, /dynamic = 'force-dynamic'/);
  assert.match(diagnosticPageSource, /robots: \{ index: false, follow: false \}/);
  assert.match(diagnosticClientSource, /process\.env\.NEXT_PUBLIC_APP_ENV !== 'staging'/);
  assert.match(diagnosticClientSource, /new Error\('ELCEO Sentry native symbolication probe'\)/);
  assert.match(diagnosticClientSource, /Sentry\.captureException\(error/);
  assert.match(diagnosticClientSource, /ELCEOSentryNativeSymbolicationProbeV2/);
  assert.equal(/(?:\.stack\s*=|defineProperty\s*\([^,]+,\s*['"]stack|filename\s*:|lineno\s*:|colno\s*:|sourceURL|\beval\s*\()/.test(diagnosticClientSource), false);

}
