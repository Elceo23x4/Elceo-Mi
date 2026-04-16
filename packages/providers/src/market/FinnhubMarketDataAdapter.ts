<<<<<<< HEAD
import { ensureUtc, type NormalizedCandle, type NormalizedMarketQuote } from '@elceo/schemas';
import type { MarketDataProvider } from '../interfaces/MarketDataProvider';
import { fetchJson } from '../http';

function mapAssetCodeToFinnhubSymbol(assetCode: string): string {
  const known: Record<string, string> = {
    'XAU/USD': 'OANDA:XAU_USD',
    'EUR/USD': 'OANDA:EUR_USD',
    'GBP/USD': 'OANDA:GBP_USD',
    'USD/JPY': 'OANDA:USD_JPY',
    'USD/CHF': 'OANDA:USD_CHF',
    'AUD/USD': 'OANDA:AUD_USD',
    'NZD/USD': 'OANDA:NZD_USD',
    'USD/CAD': 'OANDA:USD_CAD',
    'BTC/USD': 'BINANCE:BTCUSDT',
    'NASDAQ100': 'OANDA:NAS100_USD',
    'SPX500': 'OANDA:SPX500_USD',
    'DE30': 'OANDA:DE30_EUR'
  };

  return known[assetCode] ?? assetCode.replace('/', '');
}

export class FinnhubMarketDataAdapter implements MarketDataProvider {
  readonly providerId = 'finnhub';

  constructor(private readonly apiKey: string, private readonly baseUrl = 'https://finnhub.io/api/v1') {}

  private assertConfigured(): void {
    if (!this.apiKey.trim()) {
      throw new Error('FinnhubMarketDataAdapter requires FINNHUB_API_KEY');
    }
  }

  async getLatestQuote(assetCode: string): Promise<NormalizedMarketQuote | null> {
    this.assertConfigured();
    const symbol = mapAssetCodeToFinnhubSymbol(assetCode);
    const payload = await fetchJson<{ c?: number; t?: number; bid?: number; ask?: number }>(
      `${this.baseUrl}/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(this.apiKey)}`
    );

    if (typeof payload?.c !== 'number' || Number.isNaN(payload.c)) return null;

    return ensureUtc({
      type: 'market_quote' as const,
      provider: 'finnhub' as const,
      assetCode,
      ...(typeof payload.bid === 'number' ? { bid: payload.bid } : {}),
      ...(typeof payload.ask === 'number' ? { ask: payload.ask } : {}),
      last: payload.c,
      timestampUtc: new Date((payload.t ?? Date.now() / 1000) * 1000).toISOString()
    });
  }

  async getCandles(assetCode: string, timeframe: string, fromIso: string, toIso: string): Promise<NormalizedCandle[]> {
    this.assertConfigured();
    const symbol = mapAssetCodeToFinnhubSymbol(assetCode);
    const from = Math.floor(new Date(fromIso).getTime() / 1000);
    const to = Math.floor(new Date(toIso).getTime() / 1000);
    const payload = await fetchJson<{ s?: string; t?: number[]; o?: number[]; h?: number[]; l?: number[]; c?: number[]; v?: number[] }>(
      `${this.baseUrl}/forex/candle?symbol=${encodeURIComponent(symbol)}&resolution=${encodeURIComponent(timeframe)}&from=${from}&to=${to}&token=${encodeURIComponent(this.apiKey)}`
    );

    if (!payload?.t?.length || !payload.o || !payload.h || !payload.l || !payload.c || payload.s !== 'ok') {
      return [];
    }

    const output: NormalizedCandle[] = [];

    for (const [index, timestamp] of payload.t.entries()) {
      const close = payload.c[index];
      if (typeof close !== 'number') continue;

      output.push(
        ensureUtc({
          type: 'market_candle' as const,
          provider: 'finnhub' as const,
          assetCode,
          timeframe,
          open: payload.o[index] ?? close,
          high: payload.h[index] ?? close,
          low: payload.l[index] ?? close,
          close,
          ...(payload.v?.[index] !== undefined ? { volume: payload.v[index] } : {}),
          timestampUtc: new Date(timestamp * 1000).toISOString()
        })
      );
    }

    return output;
  }
}
=======
export {};
>>>>>>> origin/main
