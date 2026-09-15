import { strict as assert } from 'node:assert';
import { validateNewsExtractionFixturePayload } from '@elceo/schemas';
import { PROVIDER_SOURCE_IDS } from '@elceo/types';
import { CanonicalMarketIntelligenceBoundaryService } from '../runtime/canonical-market-intelligence-boundary';

export function runNewsExtractionFilingsTests(): void {
  const svc = new CanonicalMarketIntelligenceBoundaryService({} as never, {} as never);
  const registry = svc.getNewsExtractionSourceRegistry();
  const expectedSources = ['earnings_filings_shell','etf_flows_shell','firecrawl_extraction','gdelt_news','marketaux_news','sec_edgar'] as const;
  assert.deepEqual(registry.map((s)=>s.sourceId), [...expectedSources]);
  registry.forEach((s) => { assert.ok(PROVIDER_SOURCE_IDS.includes(s.sourceId)); assert.equal(s.liveBlockedByDefault, true); });
  assert.equal(registry.some((s)=>String(s.sourceId).includes('newsapi')),false);
  assert.equal(registry.some((s)=>String(s.sourceId).includes('alphavantage')),false);

  const fixtures = svc.listNewsExtractionFixturePayloads();
  assert.deepEqual(fixtures.map((f)=>f.sourceId), ['firecrawl_extraction','gdelt_news','marketaux_news']);
  fixtures.forEach((f) => assert.equal(validateNewsExtractionFixturePayload(f).ok, true));
  assert.ok(svc.normalizeNewsExtractionFixturePayload(fixtures[0]!).length > 0);

  const filings = svc.listFilingFixturePayloads();
  const etf = svc.listEtfFlowFixturePayloads();
  assert.ok(filings.some((f)=>f.sourceId==='sec_edgar'));
  assert.equal(etf.some((f)=>String(f.sourceId)==='sec_edgar'),false,'SEC EDGAR must remain filing/regulatory evidence, not synthetic ETF-flow evidence');
  assert.ok(etf.every((f)=>f.sourceId==='etf_flows_shell'));

  const payloadBlob = JSON.stringify({ registry, fixtures, filings, etf, narratives: svc.listNarrativeClusterFixturePayloads() }).toLowerCase();
  assert.equal(/\b(buy|sell|hold)\b/.test(payloadBlob), false);
  assert.equal(/(api[_-]?key|secret|token|password)/.test(payloadBlob), false);
  assert.ok(svc.getNewsExtractionCoverageReport().allLiveBlockedByDefault);
}
