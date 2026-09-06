import { AlphaVantageMarketDataAdapter, FirecrawlExtractionAdapter, GdeltEventAdapter, InvestingCalendarScrapeAdapter } from '@elceo/providers';
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
    const candles = await new AlphaVantageMarketDataAdapter(sentinel).getCandles('EUR/USD', '1h', '', '');
    assert(candles.length === 0, 'unsupported Alpha Vantage candles must not be synthesized');
    const events = await new GdeltEventAdapter().searchEvents('risk', '', '');
    assert(events.length === 0, 'GDELT failure must not become geopolitical evidence');
    assert(await new FirecrawlExtractionAdapter().extract('https://example.test') === null, 'missing Firecrawl key must not create content');
    assert(await new FirecrawlExtractionAdapter(sentinel).extract('https://example.test') === null, 'failed Firecrawl extraction must remain unavailable');
    const calendar = await new InvestingCalendarScrapeAdapter().getCalendar('', '');
    assert(calendar.length === 0, 'Investing calendar must not emit placeholder evidence');
  } finally {
    globalThis.fetch = originalFetch;
  }
}
