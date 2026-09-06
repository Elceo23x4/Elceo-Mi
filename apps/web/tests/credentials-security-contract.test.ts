import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveCredentialsActivation } from '../lib/auth/credentials-activation.js';

export async function runCredentialsSecurityContractTests(): Promise<void> {
  assert.deepEqual(resolveCredentialsActivation({}), { enabled: false, resetBaseUrl: null });
  assert.throws(() => resolveCredentialsActivation({ AUTH_CREDENTIALS_ENABLED: '1' }), /true or false/);
  assert.throws(() => resolveCredentialsActivation({ APP_ENV: 'production', AUTH_CREDENTIALS_ENABLED: 'true', NEXT_PUBLIC_APP_BASE_URL: 'http:\/\/app.example.test', REDIS_URL: 'redis://x', NOTIFICATION_EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'key', NOTIFICATION_EMAIL_FROM_ADDRESS: 'mail@example.test' }), /https/);
  const active = resolveCredentialsActivation({ APP_ENV: 'production', AUTH_CREDENTIALS_ENABLED: 'true', NEXT_PUBLIC_APP_BASE_URL: 'https://app.example.test/base', REDIS_URL: 'redis://x', NOTIFICATION_EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'key', NOTIFICATION_EMAIL_FROM_ADDRESS: 'mail@example.test' });
  assert.equal(active.resetBaseUrl?.origin, 'https://app.example.test');
  assert.throws(() => resolveCredentialsActivation({ APP_ENV: 'production', AUTH_CREDENTIALS_ENABLED: 'true', NEXT_PUBLIC_APP_BASE_URL: 'https://app.example.test', NOTIFICATION_EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'key', NOTIFICATION_EMAIL_FROM_ADDRESS: 'mail@example.test' }), /REDIS_URL/);
  assert.throws(() => resolveCredentialsActivation({ APP_ENV: 'production', AUTH_CREDENTIALS_ENABLED: 'true', NEXT_PUBLIC_APP_BASE_URL: 'https://app.example.test', REDIS_URL: 'redis://x' }), /Transactional email/);
  const route = await readFile('app/api/auth/password-reset/request/route.ts', 'utf8');
  assert(!route.includes('request.url') && !route.includes('Host') && route.includes('after'), 'reset route must use tracked post-response work and no request authority');
  for (const page of ['app/(public)/forgot-password/page.tsx','app/(public)/reset-password/page.tsx']) await assert.doesNotReject(() => readFile(page, 'utf8'));
}
