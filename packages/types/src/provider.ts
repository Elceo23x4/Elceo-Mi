export type ProviderId =
  | 'finnhub'
  | 'fmp'
  | 'marketaux'
  | 'gdelt'
  | 'firecrawl'
  | 'playwright'
  | 'imf'
  | 'worldbank'
  | 'oecd';

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
