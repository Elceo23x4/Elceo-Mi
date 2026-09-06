import { ensureUtc, type NormalizedCandle, type NormalizedMarketQuote } from '@elceo/schemas';
import type { MarketDataProvider } from '../interfaces/MarketDataProvider';
import { fetchJson } from '../http';

export class AlphaVantageMarketDataAdapter implements MarketDataProvider {
  readonly providerId = 'alphavantage';

  constructor(private readonly apiKey: string, private readonly baseUrl = 'https://www.alphavantage.co/query') {}

  async getLatestQuote(assetCode: string): Promise<NormalizedMarketQuote | null> {
    const symbol = assetCode.replace('/', '');
    const payload = await fetchJson<{ 'Global Quote'?: { '05. price'?: string } }>(
      `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`
    );
    const price = Number(payload['Global Quote']?.['05. price']);
    if (!Number.isFinite(price)) return null;

    return ensureUtc({
      type: 'market_quote' as const,
      provider: 'alphavantage' as const,
      assetCode,
      last: price,
      timestampUtc: new Date().toISOString()
    });
  }

  async getCandles(_assetCode: string, _timeframe: string, _fromIso: string, _toIso: string): Promise<NormalizedCandle[]> {
    return [];
  }
}
