export const providerPriority = {
  marketData: ['finnhub', 'alphavantage', 'fmp'],
  macroCalendar: ['finnhub', 'investing-firecrawl', 'fmp'],
  news: ['marketaux', 'newsapi'],
  macroContext: ['imf', 'worldbank', 'oecd']
} as const;

export type ProviderDomain = keyof typeof providerPriority;
