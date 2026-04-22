import { readProviderEnv, type ProviderEnv } from '@elceo/schemas';
import type { SourceCategory } from '@elceo/types';
import type { ProviderCapabilityDiagnostic } from './provider-capabilities';

export type IngestionProviderConfig = {
  enabled: boolean;
  reasonIfDisabled: string | null;
  providerName: string;
  category: SourceCategory;
  requiresKeys: string[];
  presentKeys: string[];
  healthyToConstruct: boolean;
};

export type IngestionProviderConfigSet = {
  env: ProviderEnv;
  providers: IngestionProviderConfig[];
};

const PROVIDER_SPECS: Array<{ providerName: string; category: SourceCategory; requiredKeys: string[] }> = [
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
  { providerName: 'gdelt', category: 'geopolitics', requiredKeys: [] }
];

function envBoolean(value: string | undefined): boolean | null {
  if (value === undefined) return null;
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  return null;
}

function globalEnabled(rawEnv: Record<string, string | undefined>): boolean {
  const value = envBoolean(rawEnv.INGESTION_CANONICAL_ENABLED);
  return value ?? true;
}

function categoryEnabled(rawEnv: Record<string, string | undefined>, category: SourceCategory): boolean {
  const categoryFlag = envBoolean(rawEnv[`INGESTION_CATEGORY_${category.toUpperCase()}_ENABLED`]);
  return categoryFlag ?? true;
}

function providerEnabled(rawEnv: Record<string, string | undefined>, providerName: string): boolean {
  const normalized = providerName.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const providerFlag = envBoolean(rawEnv[`INGESTION_PROVIDER_${normalized}_ENABLED`]);
  return providerFlag ?? true;
}

function detectRuntimeSupport(rawEnv: Record<string, string | undefined>, providerName: string): boolean {
  if (providerName === 'investing-calendar-scrape') {
    const unsupported = envBoolean(rawEnv.INGESTION_DISABLE_SCRAPE_ADAPTERS);
    if (unsupported === true) return false;
  }

  return true;
}

function resolveDisableReason(params: {
  globallyEnabled: boolean;
  categoryEnabled: boolean;
  providerEnabled: boolean;
  runtimeSupported: boolean;
  hasRequiredKeys: boolean;
}): string | null {
  if (!params.globallyEnabled) return 'provider_disabled_by_env';
  if (!params.categoryEnabled) return 'provider_disabled_by_env';
  if (!params.providerEnabled) return 'provider_disabled_by_env';
  if (!params.runtimeSupported) return 'unsupported_in_current_runtime';
  if (!params.hasRequiredKeys) return 'missing_api_key';
  return null;
}

export function getIngestionProviderConfig(rawEnv: Record<string, string | undefined>): IngestionProviderConfigSet {
  const env = readProviderEnv(rawEnv);
  const globallyEnabled = globalEnabled(rawEnv);

  const providers = PROVIDER_SPECS.map((spec) => {
    const presentKeys = spec.requiredKeys.filter((key) => Boolean(rawEnv[key]));
    const hasRequiredKeys = presentKeys.length === spec.requiredKeys.length;
    const isCategoryEnabled = categoryEnabled(rawEnv, spec.category);
    const isProviderEnabled = providerEnabled(rawEnv, spec.providerName);
    const runtimeSupported = detectRuntimeSupport(rawEnv, spec.providerName);

    const reasonIfDisabled = resolveDisableReason({
      globallyEnabled,
      categoryEnabled: isCategoryEnabled,
      providerEnabled: isProviderEnabled,
      runtimeSupported,
      hasRequiredKeys
    });

    return {
      enabled: reasonIfDisabled === null,
      reasonIfDisabled,
      providerName: spec.providerName,
      category: spec.category,
      requiresKeys: spec.requiredKeys,
      presentKeys,
      healthyToConstruct: reasonIfDisabled === null
    } satisfies IngestionProviderConfig;
  });

  return {
    env,
    providers
  };
}

export function toProviderCapabilityDiagnostics(config: IngestionProviderConfigSet): ProviderCapabilityDiagnostic[] {
  return config.providers.map((provider) => ({
    providerName: provider.providerName,
    category: provider.category,
    enabled: provider.enabled,
    healthyToConstruct: provider.healthyToConstruct,
    reason: provider.reasonIfDisabled
  }));
}
