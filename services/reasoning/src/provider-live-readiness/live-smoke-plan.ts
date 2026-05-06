import type { ProviderLiveActivationEnvironment, ProviderLiveSmokePlan } from '@elceo/types';
import { evaluateProviderLiveReadiness } from './provider-readiness';

export function buildProviderLiveSmokePlan(providerId: string, environment: ProviderLiveActivationEnvironment, config: { liveEnabled?: boolean; tiingo?: { liveEnabled?: boolean; mode?: 'fixture'|'live_disabled'|'live_enabled'; apiKey?: string|null } } = {}): ProviderLiveSmokePlan {
  const readiness = evaluateProviderLiveReadiness(providerId, environment, config);
  const allowed = readiness.activationStatus === 'staging_ready' && environment === 'staging';
  return { generatedAt: new Date().toISOString(), environment, providerId, allowed, checks: ['validate_activation_policy', 'validate_required_secrets_present', 'validate_no_secrets_in_response', 'validate_no_network_calls_in_tests'], warnings: allowed ? ['staging_only_live_fetch_gate_enabled'] : ['live_fetch_not_allowed_in_current_state'] };
}
