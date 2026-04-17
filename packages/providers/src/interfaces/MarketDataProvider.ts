import type { NormalizedCandle, NormalizedMarketQuote } from '@elceo/schemas';

export interface MarketDataProvider {
  readonly providerId: string;
  getLatestQuote(assetCode: string): Promise<NormalizedMarketQuote | null>;
  getCandles(assetCode: string, timeframe: string, fromIso: string, toIso: string): Promise<NormalizedCandle[]>;
}
