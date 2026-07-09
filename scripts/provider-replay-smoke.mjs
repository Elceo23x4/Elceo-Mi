import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const modulePath = new URL('../services/reasoning/dist-test-cjs/services/reasoning/src/provider-sources/live-payload-validation.cjs', import.meta.url);
if (!existsSync(modulePath)) throw new Error('reasoning_cjs_build_missing_run_npm_run_w_elceo_reasoning_test_first');
const { hashPayload, validateCapturedPayloadContract } = require(fileURLToPath(modulePath));
const fixtureUrl = process.env.ELCEO_PROVIDER_REPLAY_FIXTURE_PATH ? pathToFileURL(process.env.ELCEO_PROVIDER_REPLAY_FIXTURE_PATH) : new URL('../services/reasoning/src/provider-sources/captured-payload-fixtures/rc-h-replay-fixtures.json', import.meta.url);
const fixture = JSON.parse(readFileSync(fixtureUrl, 'utf8'));
let count = 0;
for (const sample of fixture.samples) {
  for (const key of ['sourceId','capabilityId','adapterId','capturedAt','requestId','rawPayload','normalizedPayload','rawPayloadChecksum','normalizedPayloadChecksum','recordCount','redactionProof']) if (sample[key] === undefined || sample[key] === '') throw new Error(`missing_${key}`);
  if (String(sample.rawPayloadChecksum).startsWith('fixture-sha256-') || String(sample.normalizedPayloadChecksum).startsWith('fixture-sha256-')) throw new Error('placeholder_checksum');
  if (sample.rawPayloadChecksum !== hashPayload(sample.rawPayload)) throw new Error(`raw_checksum_mismatch:${sample.requestId}`);
  if (sample.normalizedPayloadChecksum !== hashPayload(sample.normalizedPayload)) throw new Error(`normalized_checksum_mismatch:${sample.requestId}`);
  const errors = validateCapturedPayloadContract(sample);
  if (errors.length > 0) throw new Error(`captured_payload_contract_invalid:${sample.requestId}:${errors.join('|')}`);
  if (JSON.stringify(sample).match(/sk_live_|sk_test_|Bearer\s+|api[_-]?key=|postgres:\/\/|-----BEGIN|tok_[a-z0-9]/i)) throw new Error('secret_like_fixture_value');
  count += 1;
}
const suiteChecksum = hashPayload(fixture.samples.map((sample) => ({ requestId: sample.requestId, rawPayloadChecksum: sample.rawPayloadChecksum, normalizedPayloadChecksum: sample.normalizedPayloadChecksum })));
console.log(`provider replay smoke passed samples=${count} checksum=${suiteChecksum}`);
