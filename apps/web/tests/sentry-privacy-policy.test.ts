import assert from 'node:assert/strict';
import type { ErrorEvent } from '@sentry/nextjs';
import { allowedCaptureTags, applySentryPrivacyPolicy, isValidPublicDsn } from '../lib/sentry-policy';

export function runSentryPrivacyPolicyTests() {
  const filtered = applySentryPrivacyPolicy({
    type: undefined,
    message: 'actionable failure',
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
  assert.deepEqual(filtered.tags, {
    scope: 'api.dashboard',
    route: '/dashboard',
    requestId: 'request-123'
  });

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

  assert.equal(isValidPublicDsn('https://public@example.ingest.sentry.io/123'), true);
  assert.equal(isValidPublicDsn('https://public:secret@example.ingest.sentry.io/123'), false);
  assert.equal(isValidPublicDsn('not-a-dsn'), false);
}
