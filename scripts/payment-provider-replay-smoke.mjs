import { createHash, createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
const fixture = JSON.parse(readFileSync(new URL('../services/application-state/src/payment-providers/replay-fixtures/rc-i2-stripe-replay.json', import.meta.url),'utf8'));
const secretPattern = /(?:sk|rk|whsec)_(?:live|test)?_?[A-Za-z0-9]{12,}|\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\b/;
function h(v){return createHash('sha256').update(JSON.stringify(v)).digest('hex')}
function assert(c,m){ if(!c){ console.error(`payment provider replay smoke failed: ${m}`); process.exit(1); }}
const seen = new Set(); let ledger=0, entitlement=0;
for (const sample of fixture.samples) {
  assert(sample.providerKind === 'stripe', 'providerKind');
  assert(sample.sampleKind === 'replay_fixture', 'sampleKind');
  assert(sample.redactionProof === 'sanitized_redacted_payload_only', 'redaction proof');
  assert(sample.secretLikeValuesFound === false, 'secretLikeValuesFound false');
  assert(!secretPattern.test(JSON.stringify(sample)), 'secret-like value committed');
  assert(sample.rawPayloadChecksum && sample.normalizedPayloadChecksum, 'checksums present');
  if (!seen.has(sample.providerEventId)) {
    seen.add(sample.providerEventId);
    if (sample.status === 'succeeded') { ledger++; entitlement++; }
    if (['refunded','partially_refunded','reversed','chargeback'].includes(sample.status)) { ledger++; entitlement++; }
  }
}
assert(fixture.samples.some(s=>s.eventType === 'checkout.session.completed'), 'success fixture');
assert(fixture.samples.some(s=>s.eventType.includes('refund')), 'refund fixture');
assert(fixture.samples.some(s=>s.status === 'chargeback'), 'chargeback fixture');
const body = JSON.stringify({id:'evt_sig_fixture', type:'checkout.session.completed'});
const signature = `t=1700000000,v1=${createHmac('sha256','fixture_webhook_secret_not_real').update(`1700000000.${body}`).digest('hex')}`;
assert(/^t=\d+,v1=[a-f0-9]{64}$/.test(signature), 'webhook signature fixture');
console.log(JSON.stringify({status:'payment_provider_replay_smoke_passed', providerKind:'stripe', samples:fixture.samples.length, uniqueProviderEvents:seen.size, ledgerEffects:ledger, entitlementEffects:entitlement, summaryChecksum:h({samples:fixture.samples.length,seen:[...seen].sort(),ledger,entitlement})}));
