import type { ProviderLiveActivationEnvironment, ProviderLiveReadinessSnapshot, ProviderLiveReadinessStatus } from '@elceo/types';
import { getTiingoProviderHealth, type TiingoRuntimeConfig } from '../provider-sources/tiingo/index';
import { EVIDENCE_EXECUTION_REGISTRATIONS } from '../evidence-fabric/index';
import { getDefaultProviderQuotaPolicies, getProviderLiveActivationPolicy, LIVE_PROVIDER_IDS } from './activation-policy';

export type RuntimeReadinessConfig = { tiingo?: TiingoRuntimeConfig; liveEnabled?: boolean };
const quotas = getDefaultProviderQuotaPolicies();
const runtimeRegistrations=(providerId:string)=>EVIDENCE_EXECUTION_REGISTRATIONS.filter(registration=>registration.sourceId===providerId||registration.gateSourceId===providerId);
export function evaluateProviderLiveReadiness(providerId: string, environment: ProviderLiveActivationEnvironment, config: RuntimeReadinessConfig = {}): ProviderLiveReadinessStatus {
  const checkedAt = new Date().toISOString(); const reasons: string[] = []; const policy = getProviderLiveActivationPolicy(providerId, environment); const quotaPolicies = quotas.filter((x)=>x.providerId===providerId); const registrations=runtimeRegistrations(providerId);
  const structurallyExecutable=registrations.length>0; const empiricallyStagingVerified=registrations.some(registration=>registration.stagingVerified);
  let hasRequiredSecrets = !policy.requireApiKey; let allowLiveFetch = false; let activationStatus: ProviderLiveReadinessStatus['activationStatus'] = 'disabled'; let riskLevel: ProviderLiveReadinessStatus['riskLevel'] = 'medium';
  if (!LIVE_PROVIDER_IDS.includes(providerId as never)) reasons.push('provider_not_in_live_activation_registry');
  if (providerId === 'tiingo_market_data') {
    const health = getTiingoProviderHealth(config.tiingo ?? {});
    hasRequiredSecrets = health.hasApiKey;
    const explicitEnabled = config.liveEnabled === true;
    const adapterLiveStateConsistent = health.mode === 'live_enabled' && health.liveEnabled;
    const adapterConfigured = health.capabilityStatus === 'configured';
    const localRuntimeReady=explicitEnabled&&hasRequiredSecrets&&adapterLiveStateConsistent&&adapterConfigured;
    allowLiveFetch = environment === 'staging' && localRuntimeReady && policy.allowLiveFetch && empiricallyStagingVerified;
    if (environment === 'production') { activationStatus = 'production_blocked'; reasons.push('production_blocked_by_default'); }
    else if (allowLiveFetch) activationStatus = 'staging_ready';
    else { activationStatus = health.capabilityStatus === 'invalid_config' ? 'invalid_config' : 'disabled'; if (!explicitEnabled) reasons.push('explicit_live_env_not_enabled'); if (!hasRequiredSecrets) reasons.push('missing_required_secret'); if (!adapterLiveStateConsistent) reasons.push('tiingo_adapter_live_state_inconsistent'); if (!adapterConfigured) reasons.push(`tiingo_health_${health.capabilityStatus}`); if(structurallyExecutable&&!empiricallyStagingVerified)reasons.push('staging_empirical_verification_missing'); }
    riskLevel = allowLiveFetch ? 'medium' : 'high';
  } else if(structurallyExecutable) {
    activationStatus=environment==='production'?'production_blocked':'disabled';
    hasRequiredSecrets=!policy.requireApiKey;
    reasons.push(environment==='production'?'production_blocked_by_default':'staging_empirical_verification_missing');
    if(policy.requireApiKey)reasons.push('runtime_secret_status_not_proven');
    riskLevel='high';
  } else {
    activationStatus='fixture_only'; reasons.push('no_executable_evidence_route'); riskLevel='low';
  }
  if (!policy.productionBlockedByDefault) reasons.push('policy_violation_production_must_be_blocked');
  return { providerId, environment, activationStatus, liveEnabled: policy.liveEnabled, hasRequiredSecrets, allowLiveFetch, quotaPolicies, riskLevel, reasons: activationStatus==='staging_ready'?[]:Array.from(new Set(reasons)), checkedAt };
}

export function getProviderLiveReadinessSnapshot(environment: ProviderLiveActivationEnvironment, config: RuntimeReadinessConfig = {}): ProviderLiveReadinessSnapshot {
  const providers = LIVE_PROVIDER_IDS.map((providerId)=>evaluateProviderLiveReadiness(providerId, environment, config));
  const failures = providers.filter((p)=>p.activationStatus==='invalid_config' || p.activationStatus==='production_blocked').map((p)=>`${p.providerId}:${p.activationStatus}`);
  return { generatedAt: new Date().toISOString(), environment, providers, pass: failures.length===0, failures };
}
