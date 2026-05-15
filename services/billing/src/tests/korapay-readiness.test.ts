import assert from 'node:assert/strict';
import { checkKoraPayCheckoutReadiness, decideKoraPayEntitlementGrant, getKoraPayEnvironmentTemplate, getKoraPayProviderDescriptor, getKoraPayProviderReadinessReport, processKoraPayWebhookFixture, verifyKoraPayWebhookSignature } from '../korapay-readiness/index.js';

export async function runKoraPayReadinessTests(): Promise<void> {
  assert.equal(getKoraPayProviderDescriptor().provider, 'korapay');
  assert.equal(getKoraPayProviderReadinessReport().supportsLiveCheckout, false);
  assert.ok(getKoraPayEnvironmentTemplate().secretKeyTemplate.includes('template'));

  const blocked = checkKoraPayCheckoutReadiness({ userId:'u1', planCode:'focus_plan', billingInterval:'monthly', socialIdentifierReady:false, socialIdentifiers:[], nowIso:new Date().toISOString() });
  assert.equal(blocked.status, 'blocked');
  const ready = checkKoraPayCheckoutReadiness({ userId:'u1', planCode:'focus_plan', billingInterval:'monthly', socialIdentifierReady:true, socialIdentifiers:[{kind:'x_username', value:'alice'}], nowIso:new Date().toISOString() });
  assert.equal(ready.status, 'ready_for_draft');
  assert.equal(ready.checkoutSessionDraft?.liveCreated, false);

  const fixture = { fixtureId:'f1', eventId:'e1', eventKind:'payment_success' as const, userId:'u1', planCode:'focus_plan', billingInterval:'monthly' as const, amount:70, currency:'USD', transactionReference:'tx1', providerReference:'p1', occurredAt:new Date().toISOString(), payload:{} };
  const processed = processKoraPayWebhookFixture({ fixture, verificationStatus:'verified' });
  assert.equal(processed.decision.status, 'grant_focus_plan');

  const dup = processKoraPayWebhookFixture({ fixture, verificationStatus:'verified', seenKeys:new Set([processed.normalizedEvent!.idempotencyKey]) });
  assert.equal(dup.decision.status, 'ignore');

  const failed = processKoraPayWebhookFixture({ fixture: { ...fixture, eventId:'e2', eventKind:'payment_failed' }, verificationStatus:'verified' });
  assert.equal(failed.decision.status, 'block');

  const unverifiedDecision = decideKoraPayEntitlementGrant({ event: { ...processed.normalizedEvent!, verificationStatus:'failed' } });
  assert.equal(unverifiedDecision.status, 'block');

  const liveMissing = verifyKoraPayWebhookSignature({ rawBody:'{}', headers:{}, receivedAt:new Date().toISOString(), fixtureMode:false });
  assert.equal(liveMissing.status, 'live_config_missing');
}
