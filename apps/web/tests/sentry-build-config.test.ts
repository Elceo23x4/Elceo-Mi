import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sentrySourceMapBuildOptions } from '../lib/sentry-build-config.mjs';
import { sentryBrowserBuildEnv } from '../lib/sentry-dsn.mjs';

const PUBLIC_KEY = '0123456789abcdef0123456789abcdef';
const DSN = `https://${PUBLIC_KEY}@o4500000000000000.ingest.sentry.io/1234567`;
const RAILWAY_RELEASE = 'a4b7c9d2e5f80123456789abcdef0123456789ab';
const FAKE_TOKEN_SENTINEL = 'FAKE_TEST_BUILD_CREDENTIAL_DO_NOT_USE';

const validEnv = {
  ELCEO_SENTRY_SOURCEMAPS_UPLOAD: 'true',
  APP_ENV: 'staging',
  NEXT_PUBLIC_APP_ENV: 'staging',
  NEXT_PUBLIC_SENTRY_DSN: DSN,
  RAILWAY_GIT_COMMIT_SHA: RAILWAY_RELEASE,
  SENTRY_AUTH_TOKEN: FAKE_TOKEN_SENTINEL,
  SENTRY_ORG: 'elceo-test',
  SENTRY_PROJECT: 'elceo-web'
};

function rejectsVariable(overrides: Record<string, string | undefined>, variable: string) {
  assert.throws(
    () => sentrySourceMapBuildOptions({ ...validEnv, ...overrides }),
    new Error(`Invalid Sentry source-map upload configuration: ${variable}`)
  );
}

export function runSentryBuildConfigTests() {
  assert.equal(sentrySourceMapBuildOptions({}), null);
  assert.equal(sentrySourceMapBuildOptions({ ELCEO_SENTRY_SOURCEMAPS_UPLOAD: 'false' }), null);
  assert.equal(sentrySourceMapBuildOptions({ ELCEO_SENTRY_SOURCEMAPS_UPLOAD: 'TRUE' }), null);

  const options = sentrySourceMapBuildOptions(validEnv);
  assert.deepEqual(options, {
    org: 'elceo-test',
    project: 'elceo-web',
    authToken: FAKE_TOKEN_SENTINEL,
    release: { name: RAILWAY_RELEASE },
    sourcemaps: { disable: false, deleteSourcemapsAfterUpload: true },
    widenClientFileUpload: true,
    telemetry: false,
    silent: true
  });

  rejectsVariable({ APP_ENV: 'production' }, 'APP_ENV');
  rejectsVariable({ SENTRY_AUTH_TOKEN: undefined }, 'SENTRY_AUTH_TOKEN');
  rejectsVariable({ SENTRY_ORG: undefined }, 'SENTRY_ORG');
  rejectsVariable({ SENTRY_PROJECT: undefined }, 'SENTRY_PROJECT');
  rejectsVariable({ RAILWAY_GIT_COMMIT_SHA: 'short', SENTRY_RELEASE: RAILWAY_RELEASE }, 'RAILWAY_GIT_COMMIT_SHA');
  rejectsVariable({ SENTRY_AUTH_TOKEN: `${FAKE_TOKEN_SENTINEL}\nattack` }, 'SENTRY_AUTH_TOKEN');
  rejectsVariable({ SENTRY_ORG: 'elceo\nattack' }, 'SENTRY_ORG');
  rejectsVariable({ SENTRY_PROJECT: 'elceo/web' }, 'SENTRY_PROJECT');

  const browserEnv = JSON.stringify(sentryBrowserBuildEnv(validEnv));
  assert.equal(Object.keys(options ?? {}).some((key) => key.startsWith('NEXT_PUBLIC_')), false);
  assert.equal(options?.release.name, validEnv.RAILWAY_GIT_COMMIT_SHA);
  assert.equal('errorHandler' in (options ?? {}), false);
  assert.equal(browserEnv.includes(FAKE_TOKEN_SENTINEL), false);

  const clientInstrumentation = readFileSync('instrumentation-client.ts', 'utf8');
  const serverInstrumentation = readFileSync('instrumentation.ts', 'utf8');
  assert.equal(clientInstrumentation.includes('SENTRY_AUTH_TOKEN'), false);
  assert.equal(serverInstrumentation.includes('SENTRY_AUTH_TOKEN'), false);
  assert.equal(clientInstrumentation.includes(FAKE_TOKEN_SENTINEL), false);
  assert.equal(serverInstrumentation.includes(FAKE_TOKEN_SENTINEL), false);

  const nextConfig = readFileSync('next.config.mjs', 'utf8');
  assert.match(nextConfig, /withSentryConfig\(nextConfig, sentryBuildOptions\)/);
  assert.match(nextConfig, /config\.resolve\.alias/);
  assert.match(nextConfig, /securityHeaders/);
  assert.equal(nextConfig.includes('SENTRY_AUTH_TOKEN'), false);
  assert.equal(nextConfig.includes('productionBrowserSourceMaps'), false);
  assert.equal(browserEnv.includes('NEXT_PUBLIC_SENTRY_AUTH_TOKEN'), false);
}
