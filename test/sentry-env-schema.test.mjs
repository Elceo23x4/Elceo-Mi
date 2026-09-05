import assert from 'node:assert/strict';
import test from 'node:test';
import { readProviderEnv, validateProviderEnv } from '../packages/schemas/src/env.schema.ts';

test('canonical env schema reads public and server Sentry variables separately', () => {
  const env = readProviderEnv({
    APP_ENV: 'staging',
    NEXT_PUBLIC_APP_ENV: 'staging',
    SENTRY_DSN: 'server-dsn',
    NEXT_PUBLIC_SENTRY_DSN: 'public-browser-dsn',
    SENTRY_ENVIRONMENT: 'staging-review',
    SENTRY_RELEASE: 'immutable-release'
  });

  assert.equal(env.APP_ENV, 'staging');
  assert.equal(env.NEXT_PUBLIC_APP_ENV, 'staging');
  assert.equal(env.SENTRY_DSN, 'server-dsn');
  assert.equal(env.NEXT_PUBLIC_SENTRY_DSN, 'public-browser-dsn');
  assert.equal(env.SENTRY_ENVIRONMENT, 'staging-review');
  assert.equal(env.SENTRY_RELEASE, 'immutable-release');
});

test('optional invalid monitoring values do not create blocking schema errors', () => {
  const result = validateProviderEnv(readProviderEnv({
    APP_ENV: 'development',
    NODE_ENV: 'development',
    NEXT_PUBLIC_APP_BASE_URL: 'http://localhost:3000',
    SENTRY_DSN: 'invalid',
    NEXT_PUBLIC_SENTRY_DSN: 'invalid'
  }));

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});
