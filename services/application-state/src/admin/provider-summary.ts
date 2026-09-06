import type { AdminComponentStatus, AdminProviderCapabilitySummary } from '@elceo/types';

type NotificationProviderSpec = { providerKind: string; envKey: string; enabledWhen?: (value: string | undefined) => boolean };
type IngestionProviderSpec = { providerName: string; category: string; requiredKeys: string[] };

const NOTIFICATION_PROVIDERS: NotificationProviderSpec[] = [
  { providerKind: 'in_app', envKey: 'NOTIFICATION_IN_APP_PROVIDER', enabledWhen: (v) => (v ?? 'in_app') !== 'unsupported' },
  { providerKind: 'email', envKey: 'NOTIFICATION_EMAIL_PROVIDER', enabledWhen: (v) => Boolean(v) && v !== 'disabled' },
  { providerKind: 'push', envKey: 'NOTIFICATION_PUSH_PROVIDER', enabledWhen: (v) => Boolean(v) && v !== 'disabled' }
];

const INGESTION_PROVIDERS: IngestionProviderSpec[] = [
  { providerName: 'finnhub', category: 'market_data', requiredKeys: ['FINNHUB_API_KEY'] },
  { providerName: 'alphavantage', category: 'market_data', requiredKeys: ['ALPHAVANTAGE_API_KEY'] },
  { providerName: 'fmp', category: 'market_data', requiredKeys: ['FMP_API_KEY'] },
  { providerName: 'finnhub-calendar', category: 'macro_calendar', requiredKeys: ['FINNHUB_API_KEY'] },
  { providerName: 'fmp-calendar', category: 'macro_calendar', requiredKeys: ['FMP_API_KEY'] },
  { providerName: 'investing-calendar-scrape', category: 'macro_calendar', requiredKeys: ['FIRECRAWL_API_KEY'] },
  { providerName: 'imf', category: 'macro_context', requiredKeys: [] },
  { providerName: 'worldbank', category: 'macro_context', requiredKeys: [] },
  { providerName: 'oecd', category: 'macro_context', requiredKeys: [] },
  { providerName: 'marketaux', category: 'news', requiredKeys: ['MARKETAUX_API_KEY'] },
  { providerName: 'newsapi', category: 'news', requiredKeys: ['NEWSAPI_API_KEY'] },
  { providerName: 'tiingo_market_data', category: 'market_data', requiredKeys: ['TIINGO_API_KEY'] },
  { providerName: 'gdelt', category: 'geopolitics', requiredKeys: [] }
];

function normalizeStatus(configured: boolean, enabled: boolean): AdminComponentStatus {
  if (configured && enabled) return 'healthy';
  if (configured && !enabled) return 'degraded';
  return 'unknown';
}

export function getAdminProviderCapabilitySummary(env: Record<string, string | undefined> = process.env): AdminProviderCapabilitySummary {
  const notificationProviders = NOTIFICATION_PROVIDERS.map((spec) => {
    const raw = env[spec.envKey];
    const configured = raw !== undefined && raw !== '';
    const enabled = spec.enabledWhen ? spec.enabledWhen(raw) : configured;
    const reasons = enabled ? ['configured'] : configured ? ['provider_disabled_by_env'] : ['not_configured'];
    return { providerKind: spec.providerKind, configured, enabled, capabilityStatus: normalizeStatus(configured, enabled), reasons };
  }).sort((a, b) => a.providerKind.localeCompare(b.providerKind));

  const ingestionProviders = INGESTION_PROVIDERS.map((spec) => {
    const missing = spec.requiredKeys.filter((key) => !env[key]);
    const configured = missing.length === 0;
    const credentialPresent = spec.requiredKeys.some((key) => Boolean(env[key]));
    const productionLiveBlocked = env.APP_ENV === 'production';
    const enabled = false;
    const reasons = configured ? ['configured', 'live_disabled', productionLiveBlocked ? 'production_live_blocked' : 'staging_live_not_authorized'] : missing.map((k) => `missing:${k}`);
    return { providerName: spec.providerName, category: spec.category, credentialPresent, configured, liveDisabled: true, stagingLiveAuthorized: false, stagingLiveValidated: false, productionLiveBlocked, enabled, capabilityStatus: normalizeStatus(configured, enabled), reasons };
  }).sort((a, b) => a.category.localeCompare(b.category) || a.providerName.localeCompare(b.providerName));

  return { generatedAt: new Date().toISOString(), notificationProviders, ingestionProviders };
}
