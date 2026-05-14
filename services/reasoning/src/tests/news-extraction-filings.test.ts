import { strict as assert } from 'node:assert';
import { validateNewsExtractionFixturePayload } from '@elceo/schemas';
import { PROVIDER_SOURCE_IDS } from '@elceo/types';
import { CanonicalMarketIntelligenceBoundaryService } from '../runtime/canonical-market-intelligence-boundary';

export function runNewsExtractionFilingsTests(): void {
  const svc = new CanonicalMarketIntelligenceBoundaryService({} as never, {} as never);
  const registry = svc.getNewsExtractionSourceRegistry();
  assert.ok(registry.length >= 8);
  registry.forEach((s) => { assert.ok(PROVIDER_SOURCE_IDS.includes(s.sourceId)); assert.equal(s.liveBlockedByDefault, true); });
  const fixtures = svc.listNewsExtractionFixturePayloads();
  assert.ok(fixtures.length >= 5);
  fixtures.forEach((f) => assert.equal(validateNewsExtractionFixturePayload(f).ok, true));
  assert.ok(svc.normalizeNewsExtractionFixturePayload(fixtures[0]!).length > 0);
  const payloadBlob = JSON.stringify({ registry, fixtures, filings: svc.listFilingFixturePayloads(), etf: svc.listEtfFlowFixturePayloads(), narratives: svc.listNarrativeClusterFixturePayloads() }).toLowerCase();
  assert.equal(/\b(buy|sell|hold)\b/.test(payloadBlob), false);
  assert.equal(/(api[_-]?key|secret|token|password)/.test(payloadBlob), false);
  assert.ok(svc.getNewsExtractionCoverageReport().allLiveBlockedByDefault);
}
