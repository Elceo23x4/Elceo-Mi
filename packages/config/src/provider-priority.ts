export const providerPriority = {
  marketData: ['finnhub', 'fmp'],
  macroCalendar: ['finnhub', 'fmp'],
  news: ['marketaux'],
  macroContext: ['imf', 'worldbank', 'oecd']
} as const;

export type ProviderDomain = keyof typeof providerPriority;
