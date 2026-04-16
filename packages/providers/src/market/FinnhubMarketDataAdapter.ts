import { ensureUtc, type NormalizedCandle, type NormalizedMarketQuote } from '@elceo/schemas';
import type { MarketDataProvider } from '../interfaces/MarketDataProvider';
import { fetchJson } from '../http';

export class FinnhubMarketDataAdapter implements MarketDataProvider {
  readonly providerId = 'finnhub';

  constructor(private readonly apiKey: string, private readonly baseUrl = 'https://finnhub.io/api/v1') {}

  async getLatestQuote(assetCode: string): Promise<NormalizedMarketQuote | null> {
    const symbol = assetCode.replace('/', '');
    const payload = await fetchJson<{ c: number; t: number }>(`${this.baseUrl}/quote?symbol=${symbol}&token=${this.apiKey}`);
    if (!payload?.c) return null;

    return ensureUtc({
      type: 'market_quote' as const,
      provider: 'finnhub' as const,
      assetCode,
      last: payload.c,
      timestampUtc: new Date(payload.t * 1000).toISOString()
    });
  }

  async getCandles(assetCode: string, timeframe: string, fromIso: string, toIso: string): Promise<NormalizedCandle[]> {
    const symbol = assetCode.replace('/', '');
    const from = Math.floor(new Date(fromIso).getTime() / 1000);
    const to = Math.floor(new Date(toIso).getTime() / 1000);
    const payload = await fetchJson<{ t: number[]; o: number[]; h: number[]; l: number[]; c: number[]; v?: number[] }>(
      `${this.baseUrl}/stock/candle?symbol=${symbol}&resolution=${timeframe}&from=${from}&to=${to}&token=${this.apiKey}`
    );

    return payload.t.map((timestamp, index) =>
      ensureUtc({
        type: 'market_candle' as const,
        provider: 'finnhub' as const,
        assetCode,
        timeframe,
        open: payload.o[index] ?? payload.c[index] ?? 0,
        high: payload.h[index] ?? payload.c[index] ?? 0,
        low: payload.l[index] ?? payload.c[index] ?? 0,
        close: payload.c[index] ?? 0,
        ...(payload.v?.[index] !== undefined ? { volume: payload.v[index] } : {}),
        timestampUtc: new Date(timestamp * 1000).toISOString()
      })
    );
  }
}
