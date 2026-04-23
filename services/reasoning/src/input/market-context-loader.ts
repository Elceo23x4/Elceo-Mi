import type { CanonicalAssetSymbol, CanonicalProviderAdapterSuite, Timeframe } from '@elceo/types';

export type ReasoningMarketContext = {
  latestPrice: number;
  recentPriceRange: {
    high: number;
    low: number;
    close: number;
  };
};

export type ReasoningMarketContextErrorCode =
  | 'missing_market_data_adapter'
  | 'missing_latest_price'
  | 'missing_recent_price_range'
  | 'invalid_market_context';

export class ReasoningMarketContextError extends Error {
  constructor(public readonly code: ReasoningMarketContextErrorCode, message: string) {
    super(message);
    this.name = 'ReasoningMarketContextError';
  }
}

export interface ReasoningMarketContextLoader {
  load(asset: CanonicalAssetSymbol, timeframe: Timeframe, asOf: string): Promise<ReasoningMarketContext>;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateRange(range: unknown): range is ReasoningMarketContext['recentPriceRange'] {
  if (typeof range !== 'object' || range === null) return false;
  const candidate = range as { high?: unknown; low?: unknown; close?: unknown };
  return isFiniteNumber(candidate.high) && isFiniteNumber(candidate.low) && isFiniteNumber(candidate.close);
}

export class ProviderSuiteMarketContextLoader implements ReasoningMarketContextLoader {
  constructor(private readonly marketDataAdapter: CanonicalProviderAdapterSuite['marketData'] | null) {}

  async load(asset: CanonicalAssetSymbol, timeframe: Timeframe, _asOf: string): Promise<ReasoningMarketContext> {
    if (!this.marketDataAdapter) {
      throw new ReasoningMarketContextError('missing_market_data_adapter', 'marketData adapter is not available in provider suite');
    }

    const latestPrice = await this.marketDataAdapter.getLatestPrice(asset);
    if (!isFiniteNumber(latestPrice)) {
      throw new ReasoningMarketContextError('missing_latest_price', `latest price missing/invalid for ${asset}`);
    }

    const recentPriceRange = await this.marketDataAdapter.getRecentRange(asset, timeframe);
    if (!validateRange(recentPriceRange)) {
      throw new ReasoningMarketContextError('missing_recent_price_range', `recent price range missing/invalid for ${asset}/${timeframe}`);
    }

    if (recentPriceRange.high < recentPriceRange.low) {
      throw new ReasoningMarketContextError('invalid_market_context', `recent price range high < low for ${asset}/${timeframe}`);
    }

    return { latestPrice, recentPriceRange };
  }
}
