<<<<<<< HEAD
import { ensureUtc, type NormalizedCandle, type NormalizedMarketQuote } from '@elceo/schemas';
import type { MarketDataProvider } from '../interfaces/MarketDataProvider';
import { fetchJson } from '../http';

export class FmpMarketDataAdapter implements MarketDataProvider {
  readonly providerId = 'fmp';

  constructor(private readonly apiKey: string, private readonly baseUrl = 'https://financialmodelingprep.com/api/v3') {}

  async getLatestQuote(assetCode: string): Promise<NormalizedMarketQuote | null> {
    const symbol = assetCode.replace('/', '');
    const payload = await fetchJson<Array<{ price?: number }>>(`${this.baseUrl}/quote/${symbol}?apikey=${this.apiKey}`);
    const quote = payload?.[0]?.price;
    if (!quote) return null;

    return ensureUtc({
      type: 'market_quote' as const,
      provider: 'fmp' as const,
      assetCode,
      last: quote,
      timestampUtc: new Date().toISOString()
    });
  }

  async getCandles(assetCode: string, timeframe: string, _fromIso: string, _toIso: string): Promise<NormalizedCandle[]> {
    return [
      ensureUtc({
        type: 'market_candle' as const,
        provider: 'fmp' as const,
        assetCode,
        timeframe,
        open: 0,
        high: 0,
        low: 0,
        close: 0,
        timestampUtc: new Date().toISOString()
      })
    ];
  }
}
=======
export {};
>>>>>>> origin/main
