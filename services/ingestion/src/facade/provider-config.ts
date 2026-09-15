import { readProviderEnv, type ProviderEnv } from '@elceo/schemas';
import type { SourceCategory } from '@elceo/types';
import type { ProviderCapabilityDiagnostic } from './provider-capabilities';

export type IngestionProviderConfig = {
  credentialPresent: boolean;
  configured: boolean;
  enabled: boolean;
  reasonIfDisabled: string | null;
  providerName: string;
  category: SourceCategory;
  requiresKeys: string[];
  presentKeys: string[];
  healthyToConstruct: boolean;
  liveDisabled: boolean;
  stagingLiveAuthorized: boolean;
  stagingLiveValidated: boolean;
  productionLiveBlocked: boolean;
};

export type IngestionProviderConfigSet = {
  env: ProviderEnv;
  providers: IngestionProviderConfig[];
};

/** Legacy/development compatibility inventory. Deployed provider execution must traverse the DFC Provider API Gate. */
const PROVIDER_SPECS: Array<{ providerName: string; category: SourceCategory; requiredKeys: string[] }> = [
  { providerName: 'finnhub', category: 'market_data', requiredKeys: ['FINNHUB_API_KEY'] },
  { providerName: 'fmp', category: 'market_data', requiredKeys: ['FMP_API_KEY'] },
  { providerName: 'finnhub-calendar', category: 'macro_calendar', requiredKeys: ['FINNHUB_API_KEY'] },
  { providerName: 'fmp-calendar', category: 'macro_calendar', requiredKeys: ['FMP_API_KEY'] },
  { providerName: 'imf', category: 'macro_context', requiredKeys: [] },
  { providerName: 'worldbank', category: 'macro_context', requiredKeys: [] },
  { providerName: 'oecd', category: 'macro_context', requiredKeys: [] },
  { providerName: 'marketaux', category: 'news', requiredKeys: ['MARKETAUX_API_KEY'] },
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

function resolveDisableReason(params: {
  deployed: boolean;
  globallyEnabled: boolean;
  categoryEnabled: boolean;
  providerEnabled: boolean;
  hasRequiredKeys: boolean;
}): string | null {
  if (params.deployed) return 'unmanaged_provider_gate_required';
  if (!params.globallyEnabled) return 'provider_disabled_by_env';
  if (!params.categoryEnabled) return 'provider_disabled_by_env';
  if (!params.providerEnabled) return 'provider_disabled_by_env';
  if (!params.hasRequiredKeys) return 'missing_api_key';
  return null;
}

export function getIngestionProviderConfig(rawEnv: Record<string, string | undefined>): IngestionProviderConfigSet {
  const env = readProviderEnv(rawEnv);
  const globallyEnabled = globalEnabled(rawEnv);
  const deployed = rawEnv.APP_ENV === 'staging' || rawEnv.APP_ENV === 'production' || rawEnv.NODE_ENV === 'production';

  const providers = PROVIDER_SPECS.map((spec) => {
    const presentKeys = spec.requiredKeys.filter((key) => Boolean(rawEnv[key]));
    const hasRequiredKeys = presentKeys.length === spec.requiredKeys.length;
    const isCategoryEnabled = categoryEnabled(rawEnv, spec.category);
    const isProviderEnabled = providerEnabled(rawEnv, spec.providerName);

    const reasonIfDisabled = resolveDisableReason({
      deployed,
      globallyEnabled,
      categoryEnabled: isCategoryEnabled,
      providerEnabled: isProviderEnabled,
      hasRequiredKeys
    });

    return {
      credentialPresent: presentKeys.length > 0,
      configured: hasRequiredKeys,
      enabled: reasonIfDisabled === null,
      reasonIfDisabled,
      providerName: spec.providerName,
      category: spec.category,
      requiresKeys: spec.requiredKeys,
      presentKeys,
      healthyToConstruct: reasonIfDisabled === null,
      liveDisabled: true,
      stagingLiveAuthorized: false,
      stagingLiveValidated: false,
      productionLiveBlocked: rawEnv.APP_ENV === 'production'
    } satisfies IngestionProviderConfig;
  });

  return {env,providers};
}

export function toProviderCapabilityDiagnostics(config: IngestionProviderConfigSet): ProviderCapabilityDiagnostic[] {
  return config.providers.map((provider) => ({providerName:provider.providerName,category:provider.category,enabled:provider.enabled,healthyToConstruct:provider.healthyToConstruct,reason:provider.reasonIfDisabled}));
}
