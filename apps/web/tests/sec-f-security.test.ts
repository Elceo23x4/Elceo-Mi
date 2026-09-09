import assert from 'node:assert/strict';
import { applySentryPrivacyPolicy } from '../lib/sentry-policy';
import { browserMutationException, verifyBrowserMutation } from '../lib/server/security/browser-mutation';
import { clearAuthTestOverrides, requireInternalRouteAccess, setAuthTestOverrides } from '../lib/server/auth/subject';

export async function runSecFSecurityTests(): Promise<void> {
  const sentinel = 'SEC_F_SENTRY_SECRET';
  const sentry = applySentryPrivacyPolicy({ message: sentinel, exception: { values: [{ value: sentinel, stacktrace: { frames: [{ filename: `https://host/a?token=${sentinel}`, abs_path: `/a?secret=${sentinel}` }] } }] } } as never);
  assert.equal(JSON.stringify(sentry).includes(sentinel), false);

  setAuthTestOverrides({ internalToken: 'correct-fixed-token' });
  for (const supplied of [undefined, 'wrong-fixed--token', 'short']) assert.throws(() => requireInternalRouteAccess(new Request('https://app.example/api/internal/x', { headers: supplied ? { 'x-elceo-internal-token': supplied } : {} })), /forbidden/);
  assert.equal(requireInternalRouteAccess(new Request('https://app.example/api/internal/x', { headers: { 'x-elceo-internal-token': 'correct-fixed-token' } })).kind, 'internal');
  clearAuthTestOverrides();
  assert.throws(() => requireInternalRouteAccess(new Request('https://app.example/api/internal/x')), /forbidden/);

  const check = (method: string, headers: Record<string,string>) => verifyBrowserMutation(new Request('https://app.example/api/portfolio/actions', { method, headers }), 'https://app.example');
  assert.equal(check('POST', { origin:'https://app.example', 'sec-fetch-site':'same-origin' }).allowed, true);
  assert.equal(check('POST', { origin:'https://app.example', }).allowed, true);
  assert.equal(check('POST', { origin:'https://app.example', 'sec-fetch-site':'cross-site' }).allowed, false);
  assert.equal(check('POST', { origin:'https://app.example.attacker.test', 'sec-fetch-site':'same-site' }).allowed, false);
  assert.equal(check('POST', { origin:'https://sibling.example', 'sec-fetch-site':'same-site' }).allowed, false);
  assert.equal(check('POST', {}).allowed, false);
  assert.equal(check('GET', {}).allowed, true);
  assert.equal(browserMutationException('/api/billing/webhook'), 'cryptographically_verified_provider_webhook');
  assert.equal(browserMutationException('/api/internal/billing/reconcile'), 'internal_token_or_machine_authority');


}
