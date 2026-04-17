import type { NormalizedCandle, NormalizedMarketQuote } from '@elceo/schemas';
import { providerPriority } from '@elceo/config';
import type { MarketDataProvider } from '../interfaces/MarketDataProvider';

export class MarketDataCompositeAdapter implements MarketDataProvider {
  readonly providerId = 'market-composite';

  constructor(private readonly providers: Record<string, MarketDataProvider>) {}

  async getLatestQuote(assetCode: string): Promise<NormalizedMarketQuote | null> {
    for (const providerKey of providerPriority.marketData) {
      const provider = this.providers[providerKey];
      if (!provider) continue;
      try {
        const quote = await provider.getLatestQuote(assetCode);
        if (quote) return quote;
      } catch {
        continue;
      }
    }
    return null;
  }

  async getCandles(assetCode: string, timeframe: string, fromIso: string, toIso: string): Promise<NormalizedCandle[]> {
    for (const providerKey of providerPriority.marketData) {
      const provider = this.providers[providerKey];
      if (!provider) continue;
      try {
        const candles = await provider.getCandles(assetCode, timeframe, fromIso, toIso);
        if (candles.length > 0) return candles;
      } catch {
        continue;
      }
    }
    return [];
  }
}
