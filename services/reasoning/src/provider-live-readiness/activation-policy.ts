import type { ProviderLiveActivationEnvironment, ProviderLiveActivationPolicy, ProviderQuotaPolicy } from '@elceo/types';

export const LIVE_PROVIDER_IDS = ['tiingo_market_data','cftc_cot','federal_reserve','ecb','boe','boj','us_treasury','fred','bank_public_reports','public_regulatory_filings','calculated_internal_conditions','calculated_internal_macro_calendar','public_statistics_agencies','macro_surprise_calculated_internal'] as const;

const liveCapable = new Set<string>(['tiingo_market_data']);

export function getDefaultProviderQuotaPolicies(): ProviderQuotaPolicy[] {
  return LIVE_PROVIDER_IDS.map((providerId)=>({ providerId, unit:'unknown', limit:null, burstLimit:null, rationale:'Quota policy placeholder; provider-specific limits to be confirmed before production activation.' }));
}

export function getProviderLiveActivationPolicy(providerId: string, environment: ProviderLiveActivationEnvironment): ProviderLiveActivationPolicy {
  const hasLiveImplementation = liveCapable.has(providerId);
  const requireApiKey = providerId === 'tiingo_market_data';
  const liveEnabled = environment === 'staging' && hasLiveImplementation;
  const allowLiveFetch = environment === 'staging' && hasLiveImplementation;
  return { providerId, environment, liveEnabled, allowLiveFetch, requireExplicitEnv:true, requireApiKey, requireStagingFirst:true, productionBlockedByDefault:true, rationale: environment==='production' ? 'Production activation is blocked by default in C5-A21.' : hasLiveImplementation ? 'Staging-only live planning path; explicit enablement required.' : 'Provider has no live implementation; fixture-only/disabled in C5-A21.' };
}
