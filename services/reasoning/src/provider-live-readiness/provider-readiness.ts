import type { ProviderLiveActivationEnvironment, ProviderLiveReadinessSnapshot, ProviderLiveReadinessStatus } from '@elceo/types';
import { getTiingoProviderHealth, type TiingoRuntimeConfig } from '../provider-sources/tiingo/index';
import { getDefaultProviderQuotaPolicies, getProviderLiveActivationPolicy, LIVE_PROVIDER_IDS } from './activation-policy';

export type RuntimeReadinessConfig = { tiingo?: TiingoRuntimeConfig; liveEnabled?: boolean };
const quotas = getDefaultProviderQuotaPolicies();
export function evaluateProviderLiveReadiness(providerId: string, environment: ProviderLiveActivationEnvironment, config: RuntimeReadinessConfig = {}): ProviderLiveReadinessStatus {
  const checkedAt = new Date().toISOString(); const reasons: string[] = []; const policy = getProviderLiveActivationPolicy(providerId, environment); const quotaPolicies = quotas.filter((x)=>x.providerId===providerId);
  let hasRequiredSecrets = false; let allowLiveFetch = false; let activationStatus: ProviderLiveReadinessStatus['activationStatus'] = 'disabled'; let riskLevel: ProviderLiveReadinessStatus['riskLevel'] = 'medium';
  if (!LIVE_PROVIDER_IDS.includes(providerId as never)) reasons.push('provider_not_in_live_activation_registry');
  if (providerId !== 'tiingo_market_data') { activationStatus = 'fixture_only'; reasons.push('no_live_implementation'); riskLevel = 'low'; }
  else {
    const health = getTiingoProviderHealth(config.tiingo ?? {});
    hasRequiredSecrets = health.hasApiKey;
    const explicitEnabled = Boolean(config.liveEnabled) || health.liveEnabled;
    allowLiveFetch = environment === 'staging' && explicitEnabled && hasRequiredSecrets;
    if (environment === 'production') { activationStatus = 'production_blocked'; reasons.push('production_blocked_by_default'); }
    else if (allowLiveFetch) activationStatus = 'staging_ready';
    else { activationStatus = health.capabilityStatus === 'invalid_config' ? 'invalid_config' : 'disabled'; reasons.push('staging_live_requirements_not_met'); if (!explicitEnabled) reasons.push('explicit_live_env_not_enabled'); if (!hasRequiredSecrets) reasons.push('missing_required_secret'); }
    riskLevel = allowLiveFetch ? 'medium' : 'high';
  }
  if (!policy.productionBlockedByDefault) reasons.push('policy_violation_production_must_be_blocked');
  return { providerId, environment, activationStatus, liveEnabled: policy.liveEnabled, hasRequiredSecrets, allowLiveFetch, quotaPolicies, riskLevel, reasons: activationStatus==='staging_ready'?[]:Array.from(new Set(reasons)), checkedAt };
}

export function getProviderLiveReadinessSnapshot(environment: ProviderLiveActivationEnvironment, config: RuntimeReadinessConfig = {}): ProviderLiveReadinessSnapshot {
  const providers = LIVE_PROVIDER_IDS.map((providerId)=>evaluateProviderLiveReadiness(providerId, environment, config));
  const failures = providers.filter((p)=>p.activationStatus==='invalid_config' || p.activationStatus==='production_blocked').map((p)=>`${p.providerId}:${p.activationStatus}`);
  return { generatedAt: new Date().toISOString(), environment, providers, pass: failures.length===0, failures };
}
