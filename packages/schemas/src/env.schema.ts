export type ProviderEnv = {
  FINNHUB_API_KEY?: string;
  ALPHAVANTAGE_API_KEY?: string;
  FMP_API_KEY?: string;
  MARKETAUX_API_KEY?: string;
  NEWSAPI_API_KEY?: string;
  FIRECRAWL_API_KEY?: string;
};

export function readProviderEnv(env: Record<string, string | undefined> = {}): ProviderEnv {
  const out: ProviderEnv = {};
  if (env.FINNHUB_API_KEY) out.FINNHUB_API_KEY = env.FINNHUB_API_KEY;
  if (env.ALPHAVANTAGE_API_KEY) out.ALPHAVANTAGE_API_KEY = env.ALPHAVANTAGE_API_KEY;
  if (env.FMP_API_KEY) out.FMP_API_KEY = env.FMP_API_KEY;
  if (env.MARKETAUX_API_KEY) out.MARKETAUX_API_KEY = env.MARKETAUX_API_KEY;
  if (env.NEWSAPI_API_KEY) out.NEWSAPI_API_KEY = env.NEWSAPI_API_KEY;
  if (env.FIRECRAWL_API_KEY) out.FIRECRAWL_API_KEY = env.FIRECRAWL_API_KEY;
  return out;
}
