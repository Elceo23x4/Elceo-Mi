import { createHmac } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const adapterPath = new URL('../services/application-state/dist-test-cjs/services/application-state/src/payment-providers/sandbox-adapter.cjs', import.meta.url);
const runtimePath = new URL('../services/application-state/dist-test-cjs/services/application-state/src/billing/internal-payment.cjs', import.meta.url);
if (!existsSync(adapterPath) || !existsSync(runtimePath)) execFileSync('npm', ['run','-w','services/application-state','test'], { stdio:'ignore', env:{ ...process.env, ELCEO_PAYMENT_REPLAY_SKIP_CHECKSUM_PROBE:'1' } });
const { normalizeStripeProviderPayload, stableProviderChecksum, redactProviderPayload, buildStripeTestSignature, verifyStripeWebhookSignature, secretLikeValuesFound } = await import(adapterPath);
const { InternalPaymentRuntime, MemoryInternalPaymentRepository, createMemoryPaymentStore } = await import(runtimePath);
if (process.env.ELCEO_PAYMENT_REPLAY_SKIP_CHECKSUM_PROBE === '1') process.env.ELCEO_PAYMENT_REPLAY_SKIP_CHECKSUM_PROBE = '0';
const fixtureUrl = process.env.ELCEO_PAYMENT_REPLAY_FIXTURE_PATH ? new URL(`file://${process.env.ELCEO_PAYMENT_REPLAY_FIXTURE_PATH}`) : new URL('../services/application-state/src/payment-providers/replay-fixtures/rc-i2-stripe-replay.json', import.meta.url);
const fixture = JSON.parse(readFileSync(fixtureUrl,'utf8'));
const secretPattern = /(?:sk|rk|whsec)_(?:live|test)?_?[A-Za-z0-9]{12,}|\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\b/;
function assert(c,m){ if(!c){ console.error(`payment provider replay smoke failed: ${m}`); process.exit(1); }}
function expectedKind(normalized){ if (normalized.refundOrReversalOrChargeback !== 'none') return normalized.refundOrReversalOrChargeback; if (normalized.status === 'succeeded') return 'success'; if (normalized.status === 'failed') return 'provider_500_before_accepting'; return 'unknown_result'; }
const repo = new MemoryInternalPaymentRepository(createMemoryPaymentStore());
const rt = new InternalPaymentRuntime('replay_provider_event', repo);
const operations = new Map();
async function operationFor(sample, outcome='accepted'){
  const key = sample.expectedNormalized.metadataOperationId ?? sample.providerPaymentReference ?? sample.providerEventId;
  if (operations.has(key)) return operations.get(key);
  const op = await rt.checkout({ subjectUserId: sample.expectedNormalized.metadataSubjectUserId ?? 'replay_user', targetPlan:'focus_plan', amount: sample.amount ?? 2000, currency: sample.currency ?? 'USD', businessIdempotencyKey:key, outcome });
  operations.set(key, op.operation);
  return op.operation;
}
const seen = new Set();
for (const sample of fixture.samples) {
  assert(sample.providerKind === 'stripe', 'providerKind');
  assert(sample.sampleKind === 'replay_fixture', 'sampleKind');
  assert(sample.redactionProof === 'sanitized_redacted_payload_only', 'redaction proof');
  assert(sample.secretLikeValuesFound === false, 'secretLikeValuesFound false');
  assert(!secretPattern.test(JSON.stringify(sample)), 'secret-like value committed');
  assert(sample.rawPayload && sample.expectedNormalized, 'raw and expected normalized payload present');
  const rawChecksum = stableProviderChecksum(redactProviderPayload(sample.rawPayload));
  assert(rawChecksum === sample.rawPayloadChecksum, `raw checksum mismatch:${sample.providerEventId}`);
  const normalized = normalizeStripeProviderPayload(sample.rawPayload, sample.requestId ?? null);
  const normalizedChecksum = stableProviderChecksum(normalized);
  assert(normalizedChecksum === sample.normalizedPayloadChecksum, `normalized checksum mismatch:${sample.providerEventId}`);
  for (const [k,v] of Object.entries(sample.expectedNormalized)) assert(normalized[k] === v, `normalized field mismatch:${sample.providerEventId}:${k}`);
  assert(!secretLikeValuesFound(normalized.redactedPayload), `redacted normalized payload leaked secret-like value:${sample.providerEventId}`);
  const rawBody = JSON.stringify(sample.rawPayload);
  const signature = buildStripeTestSignature(rawBody, 'fixture_webhook_secret_not_real');
  assert(verifyStripeWebhookSignature(rawBody, signature, 'fixture_webhook_secret_not_real') === true, `signature fixture failed:${sample.providerEventId}`);
  if (sample.status === 'processing') {
    const op = await operationFor(sample, 'accepted_response_lost');
    const before = await rt.counts();
    await rt.webhook({ eventId: sample.providerEventId, kind: expectedKind(normalized), operationId: op.internalPaymentOperationId, providerPaymentReference: sample.providerPaymentReference, providerCheckoutSessionReference: sample.providerSessionReference, payload:{ normalized } });
    assert((await rt.counts()).entitlements === before.entitlements, 'processing replay did not grant entitlement');
    continue;
  }
  if (['refunded','partially_refunded','reversed','chargeback'].includes(sample.status)) {
    const op = await operationFor(sample, 'accepted');
    await rt.webhook({ eventId: `${sample.providerEventId}_success_anchor`, kind:'success', operationId: op.internalPaymentOperationId, providerPaymentReference: sample.providerPaymentReference, providerCheckoutSessionReference: sample.providerSessionReference });
    await rt.webhook({ eventId: sample.providerEventId, kind: expectedKind(normalized), operationId: op.internalPaymentOperationId, providerPaymentReference: sample.providerPaymentReference, providerCheckoutSessionReference: sample.providerSessionReference, payload:{ normalized } });
  } else {
    const op = await operationFor(sample, sample.status === 'succeeded' ? 'accepted' : 'accepted_response_lost');
    await rt.webhook({ eventId: sample.providerEventId, kind: expectedKind(normalized), operationId: op.internalPaymentOperationId, providerPaymentReference: sample.providerPaymentReference, providerCheckoutSessionReference: sample.providerSessionReference, payload:{ normalized } });
    if (seen.has(sample.providerEventId)) {
      const before = await rt.counts();
      await rt.webhook({ eventId: sample.providerEventId, kind: expectedKind(normalized), operationId: op.internalPaymentOperationId, providerPaymentReference: sample.providerPaymentReference, providerCheckoutSessionReference: sample.providerSessionReference, payload:{ normalized } });
      const after = await rt.counts();
      assert(after.ledger === before.ledger && after.entitlements === before.entitlements, 'duplicate event dedupe failed');
    }
  }
  seen.add(sample.providerEventId);
}
const counts = await rt.counts();
assert(fixture.samples.some(s=>s.status === 'processing'), 'unpaid processing fixture');
assert(fixture.samples.some(s=>s.status === 'succeeded'), 'success fixture');
assert(fixture.samples.some(s=>s.status === 'refunded'), 'refund fixture');
assert(fixture.samples.some(s=>s.status === 'partially_refunded'), 'partial refund fixture');
assert(fixture.samples.some(s=>s.status === 'reversed'), 'reversal fixture');
assert(fixture.samples.some(s=>s.status === 'chargeback'), 'chargeback fixture');
console.log(JSON.stringify({status:'payment_provider_replay_smoke_passed', providerKind:'stripe', samples:fixture.samples.length, uniqueProviderEvents:seen.size, ledgerEffects:counts.ledger, entitlementEffects:counts.entitlements, rawBehavior:'normalized_and_replayed'}));
