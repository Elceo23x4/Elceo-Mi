import { FirecrawlExtractionAdapter, GdeltEventAdapter, MarketauxNewsAdapter } from '@elceo/providers';
import { fetchJson } from '../../../../packages/providers/src/http';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export async function runProviderPreflightHardeningTests(): Promise<void> {
  const sentinel = 'PROV_P0_SENTINEL_SUPER_SECRET';
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async (input: string | URL | Request) => {
      throw new Error(`transport failed for ${String(input)} Authorization: Bearer ${sentinel}`);
    }) as typeof fetch;
    let serialized = '';
    try {
      await fetchJson(`https://provider.example/data?apiKey=${sentinel}&token=${sentinel}`, { headers: { Authorization: `Bearer ${sentinel}`, api_token: sentinel } });
    } catch (error) {
      serialized = JSON.stringify(error, Object.getOwnPropertyNames(error));
    }
    assert(serialized.length > 0 && !serialized.includes(sentinel) && serialized.includes('[REDACTED]'), 'HTTP errors must redact query and header credential sentinels');
    const events = await new GdeltEventAdapter().searchEvents('risk', '', '');
    assert(events.length === 0, 'GDELT failure must not become geopolitical evidence');
    assert(await new FirecrawlExtractionAdapter().extract('https://example.test') === null, 'missing Firecrawl key must not create content');
    assert(await new FirecrawlExtractionAdapter(sentinel).extract('https://example.test') === null, 'failed Firecrawl extraction must remain unavailable');
    let marketauxFailed=false;
    try{await new MarketauxNewsAdapter(sentinel).searchNews('markets','2026-09-14T00:00:00Z','2026-09-14T01:00:00Z');}catch{marketauxFailed=true;}
    assert(marketauxFailed,'failed Marketaux transport must fail closed rather than synthesize news');
  } finally {
    globalThis.fetch = originalFetch;
  }
}
