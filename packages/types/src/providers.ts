import type { CanonicalEvent, CanonicalAssetSymbol, Timeframe } from './events';

export type PriceRange = { high: number; low: number; close: number };

export interface MarketDataAdapter {
  getLatestPrice(asset: CanonicalAssetSymbol): Promise<number>;
  getRecentRange(asset: CanonicalAssetSymbol, timeframe: Timeframe): Promise<PriceRange>;
  getStructuredMarketEvidence(asset: CanonicalAssetSymbol, timeframe: Timeframe): Promise<CanonicalEvent[]>;
}

export interface MacroCalendarAdapter {
  getUpcomingEvents(fromIso: string, toIso: string): Promise<CanonicalEvent[]>;
  getRecentPublishedEvents(fromIso: string, toIso: string): Promise<CanonicalEvent[]>;
}

export interface NewsAdapter {
  getRecentNewsEvidence(asset: CanonicalAssetSymbol, fromIso: string, toIso: string): Promise<CanonicalEvent[]>;
}

export interface GeopoliticalEventAdapter {
  getRecentGeopoliticalEvidence(asset: CanonicalAssetSymbol, fromIso: string, toIso: string): Promise<CanonicalEvent[]>;
}

export interface MacroContextAdapter {
  getMacroContext(asset: CanonicalAssetSymbol, asOfIso: string): Promise<CanonicalEvent[]>;
}

export interface CanonicalProviderAdapterSuite {
  marketData: MarketDataAdapter;
  macroCalendar: MacroCalendarAdapter;
  news: NewsAdapter;
  geopolitics: GeopoliticalEventAdapter;
  macroContext: MacroContextAdapter;
}
