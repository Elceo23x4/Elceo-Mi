import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const fixture = JSON.parse(readFileSync(new URL('../services/reasoning/src/provider-sources/captured-payload-fixtures/rc-h-replay-fixtures.json', import.meta.url), 'utf8'));
let count = 0;
for (const sample of fixture.samples) {
  for (const key of ['sourceId','capabilityId','adapterId','capturedAt','requestId','rawPayloadChecksum','normalizedPayloadChecksum','recordCount','redactionProof']) if (sample[key] === undefined || sample[key] === '') throw new Error(`missing_${key}`);
  if (!Number.isFinite(Date.parse(sample.capturedAt))) throw new Error('invalid_capturedAt');
  if (JSON.stringify(sample).match(/sk_live_|sk_test_|Bearer\s+|api[_-]?key=|postgres:\/\/|-----BEGIN|tok_[a-z0-9]/i)) throw new Error('secret_like_fixture_value');
  count += 1;
}
const digest = createHash('sha256').update(JSON.stringify(fixture)).digest('hex');
console.log(`provider replay smoke passed samples=${count} checksum=${digest}`);
