<<<<<<< HEAD
export type ProviderId =
  | 'finnhub'
  | 'alphavantage'
  | 'fmp'
  | 'marketaux'
  | 'newsapi'
  | 'gdelt'
  | 'firecrawl'
  | 'playwright'
  | 'imf'
  | 'worldbank'
  | 'oecd'
  | 'investing-firecrawl';

export type ProviderHealthStatus = 'healthy' | 'degraded' | 'down';

export type ProviderHealthRecord = {
  provider: ProviderId;
  domain: 'market' | 'macro' | 'news' | 'geopolitics' | 'extraction' | 'context';
  status: ProviderHealthStatus;
  successRatePct: number;
  consecutiveFailures: number;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  message?: string;
};
=======
export {};
>>>>>>> origin/main
