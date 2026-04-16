<<<<<<< HEAD
export type ProviderEnv = {
  FINNHUB_API_KEY?: string;
  ALPHAVANTAGE_API_KEY?: string;
  FMP_API_KEY?: string;
  MARKETAUX_API_KEY?: string;
  NEWSAPI_API_KEY?: string;
  FIRECRAWL_API_KEY?: string;
  KAFKA_BROKERS?: string;
  KAFKA_CLIENT_ID?: string;
  KAFKA_GROUP_ID_INGESTION?: string;
  ENABLE_KAFKA?: string;
  PERSISTENCE_MODE?: 'filesystem' | 'memory';
  PERSISTENCE_FILE_PATH?: string;
  AUTH_SECRET?: string;
  AUTH_GOOGLE_CLIENT_ID?: string;
  AUTH_GOOGLE_CLIENT_SECRET?: string;
  APP_STATE_REPOSITORY?: 'postgres' | 'memory';
};

export function readProviderEnv(env: Record<string, string | undefined> = {}): ProviderEnv {
  const out: ProviderEnv = {};
  if (env.FINNHUB_API_KEY) out.FINNHUB_API_KEY = env.FINNHUB_API_KEY;
  if (env.ALPHAVANTAGE_API_KEY) out.ALPHAVANTAGE_API_KEY = env.ALPHAVANTAGE_API_KEY;
  if (env.FMP_API_KEY) out.FMP_API_KEY = env.FMP_API_KEY;
  if (env.MARKETAUX_API_KEY) out.MARKETAUX_API_KEY = env.MARKETAUX_API_KEY;
  if (env.NEWSAPI_API_KEY) out.NEWSAPI_API_KEY = env.NEWSAPI_API_KEY;
  if (env.FIRECRAWL_API_KEY) out.FIRECRAWL_API_KEY = env.FIRECRAWL_API_KEY;
  if (env.KAFKA_BROKERS) out.KAFKA_BROKERS = env.KAFKA_BROKERS;
  if (env.KAFKA_CLIENT_ID) out.KAFKA_CLIENT_ID = env.KAFKA_CLIENT_ID;
  if (env.KAFKA_GROUP_ID_INGESTION) out.KAFKA_GROUP_ID_INGESTION = env.KAFKA_GROUP_ID_INGESTION;
  if (env.ENABLE_KAFKA) out.ENABLE_KAFKA = env.ENABLE_KAFKA;
  if (env.PERSISTENCE_MODE === 'filesystem' || env.PERSISTENCE_MODE === 'memory') out.PERSISTENCE_MODE = env.PERSISTENCE_MODE;
  if (env.PERSISTENCE_FILE_PATH) out.PERSISTENCE_FILE_PATH = env.PERSISTENCE_FILE_PATH;
  if (env.AUTH_SECRET) out.AUTH_SECRET = env.AUTH_SECRET;
  if (env.AUTH_GOOGLE_CLIENT_ID) out.AUTH_GOOGLE_CLIENT_ID = env.AUTH_GOOGLE_CLIENT_ID;
  if (env.AUTH_GOOGLE_CLIENT_SECRET) out.AUTH_GOOGLE_CLIENT_SECRET = env.AUTH_GOOGLE_CLIENT_SECRET;
  if (env.APP_STATE_REPOSITORY === 'postgres' || env.APP_STATE_REPOSITORY === 'memory') out.APP_STATE_REPOSITORY = env.APP_STATE_REPOSITORY;
  return out;
}
=======
export {};
>>>>>>> origin/main
