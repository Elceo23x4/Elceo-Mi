export type ProviderEnv = {
  APP_ENV?: 'development' | 'staging' | 'production';
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
  NEXT_PUBLIC_APP_BASE_URL?: string;
  BILLING_PROVIDER?: 'mock' | 'stripe';
  BILLING_WEBHOOK_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID_PREMIUM?: string;
  ELCEO_INTERNAL_API_TOKEN?: string;
  SENTRY_DSN?: string;
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
  TIINGO_API_KEY?: string;
  TIINGO_LIVE_ENABLED?: string;
  TIINGO_BASE_URL?: string;
  TIINGO_TIMEOUT_MS?: string;
};

export type EnvValidationResult = {
  valid: boolean;
  errors: string[];
};

function isValidAbsoluteHttpUrl(input: string): boolean {
  try {
    const parsed = new URL(input);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function readProviderEnv(env: Record<string, string | undefined> = {}): ProviderEnv {
  const out: ProviderEnv = {};
  if (env.APP_ENV === 'development' || env.APP_ENV === 'staging' || env.APP_ENV === 'production') out.APP_ENV = env.APP_ENV;
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
  if (env.NEXT_PUBLIC_APP_BASE_URL) out.NEXT_PUBLIC_APP_BASE_URL = env.NEXT_PUBLIC_APP_BASE_URL;
  if (env.BILLING_PROVIDER === 'mock' || env.BILLING_PROVIDER === 'stripe') out.BILLING_PROVIDER = env.BILLING_PROVIDER;
  if (env.BILLING_WEBHOOK_SECRET) out.BILLING_WEBHOOK_SECRET = env.BILLING_WEBHOOK_SECRET;
  if (env.STRIPE_SECRET_KEY) out.STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY;
  if (env.STRIPE_WEBHOOK_SECRET) out.STRIPE_WEBHOOK_SECRET = env.STRIPE_WEBHOOK_SECRET;
  if (env.STRIPE_PRICE_ID_PREMIUM) out.STRIPE_PRICE_ID_PREMIUM = env.STRIPE_PRICE_ID_PREMIUM;
  if (env.ELCEO_INTERNAL_API_TOKEN) out.ELCEO_INTERNAL_API_TOKEN = env.ELCEO_INTERNAL_API_TOKEN;
  if (env.SENTRY_DSN) out.SENTRY_DSN = env.SENTRY_DSN;
  if (env.LOG_LEVEL === 'debug' || env.LOG_LEVEL === 'info' || env.LOG_LEVEL === 'warn' || env.LOG_LEVEL === 'error') out.LOG_LEVEL = env.LOG_LEVEL;
  if (env.TIINGO_API_KEY) out.TIINGO_API_KEY = env.TIINGO_API_KEY;
  if (env.TIINGO_LIVE_ENABLED) out.TIINGO_LIVE_ENABLED = env.TIINGO_LIVE_ENABLED;
  if (env.TIINGO_BASE_URL) out.TIINGO_BASE_URL = env.TIINGO_BASE_URL;
  if (env.TIINGO_TIMEOUT_MS) out.TIINGO_TIMEOUT_MS = env.TIINGO_TIMEOUT_MS;
  return out;
}

export function validateProviderEnv(env: ProviderEnv): EnvValidationResult {
  const errors: string[] = [];
  const appEnv = env.APP_ENV ?? 'development';

  if (!env.NEXT_PUBLIC_APP_BASE_URL) {
    errors.push('NEXT_PUBLIC_APP_BASE_URL is required');
  } else if (!isValidAbsoluteHttpUrl(env.NEXT_PUBLIC_APP_BASE_URL)) {
    errors.push('NEXT_PUBLIC_APP_BASE_URL must be an absolute http(s) URL');
  }

  if (appEnv === 'production' && !env.AUTH_SECRET) {
    errors.push('AUTH_SECRET is required in production');
  }

  if (appEnv === 'production' && !env.ELCEO_INTERNAL_API_TOKEN) {
    errors.push('ELCEO_INTERNAL_API_TOKEN is required in production');
  }

  if (env.BILLING_PROVIDER === 'stripe') {
    if (!env.STRIPE_SECRET_KEY) errors.push('STRIPE_SECRET_KEY is required when BILLING_PROVIDER=stripe');
    if (!env.STRIPE_WEBHOOK_SECRET) errors.push('STRIPE_WEBHOOK_SECRET is required when BILLING_PROVIDER=stripe');
    if (!env.STRIPE_PRICE_ID_PREMIUM) errors.push('STRIPE_PRICE_ID_PREMIUM is required when BILLING_PROVIDER=stripe');
  }

  if (env.ENABLE_KAFKA === 'true' && !env.KAFKA_BROKERS) {
    errors.push('KAFKA_BROKERS is required when ENABLE_KAFKA=true');
  }

  const tiingoLiveEnabled = env.TIINGO_LIVE_ENABLED === 'true' || env.TIINGO_LIVE_ENABLED === '1';
  if (tiingoLiveEnabled && !env.TIINGO_API_KEY) {
    errors.push('TIINGO_API_KEY is required when TIINGO_LIVE_ENABLED=true');
  }
  if (env.TIINGO_BASE_URL && !isValidAbsoluteHttpUrl(env.TIINGO_BASE_URL)) {
    errors.push('TIINGO_BASE_URL must be an absolute http(s) URL');
  }
  if (env.TIINGO_TIMEOUT_MS) {
    const timeoutMs = Number(env.TIINGO_TIMEOUT_MS);
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) errors.push('TIINGO_TIMEOUT_MS must be a positive number when set');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
