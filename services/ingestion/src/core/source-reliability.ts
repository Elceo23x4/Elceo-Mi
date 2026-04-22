import { clampTo100, roundScore } from '@elceo/domain';
import type { CanonicalEvent, SourceCategory } from '@elceo/types';

const SOURCE_CATEGORY_DEFAULT_RELIABILITY: Record<SourceCategory, number> = {
  market_data: 92,
  macro_calendar: 90,
  macro_context: 88,
  news: 72,
  geopolitics: 70,
  internal: 85,
  user: 55
};

const SOURCE_NAME_DEFAULT_RELIABILITY: Record<string, number> = {
  IMF: 96,
  OECD: 95,
  'WORLD BANK': 95,
  'WORLD_BANK': 95,
  FRED: 95,
  'OFFICIAL CENTRAL BANK': 95,
  'OFFICIAL STATISTICS': 95,
  FINNHUB: 82,
  FINANCIALMODELINGPREP: 80,
  FMP: 80,
  ALPHAVANTAGE: 76,
  MARKETAUX: 72,
  NEWSAPI: 68,
  GDELT: 70,
  INVESTING: 74,
  'INVESTING CALENDAR SCRAPE': 74,
  FIRECRAWL: 64
};

function normalizeSourceName(sourceName: string): string {
  return sourceName.trim().toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ');
}

export function getDefaultReliabilityForSourceCategory(sourceCategory: SourceCategory): number {
  return SOURCE_CATEGORY_DEFAULT_RELIABILITY[sourceCategory];
}

export function getDefaultReliabilityForSourceName(sourceName: string): number | null {
  const normalized = normalizeSourceName(sourceName);

  if (SOURCE_NAME_DEFAULT_RELIABILITY[normalized] !== undefined) {
    return SOURCE_NAME_DEFAULT_RELIABILITY[normalized];
  }

  if (normalized.includes('FINANCIAL MODELING PREP')) return 80;
  if (normalized.includes('CENTRAL BANK')) return 95;
  if (normalized.includes('STATISTICS')) return 95;
  if (normalized.includes('INVESTING')) return 74;
  if (normalized.includes('FIRECRAWL')) return 64;
  return null;
}

export function getEffectiveSourceReliabilityScore(event: Pick<CanonicalEvent, 'sourceCategory' | 'sourceName' | 'sourceReliabilityScore'>): number {
  const providerOrCategoryDefault = getDefaultReliabilityForSourceName(event.sourceName) ?? getDefaultReliabilityForSourceCategory(event.sourceCategory);
  const providedScore = Number.isFinite(event.sourceReliabilityScore) ? event.sourceReliabilityScore : null;

  if (providedScore !== null && providedScore >= 0 && providedScore <= 100) {
    return clampTo100(roundScore(0.6 * providedScore + 0.4 * providerOrCategoryDefault));
  }

  return clampTo100(roundScore(providerOrCategoryDefault));
}
