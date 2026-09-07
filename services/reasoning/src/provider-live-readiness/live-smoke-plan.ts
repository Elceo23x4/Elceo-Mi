import type { ProviderLiveActivationEnvironment, ProviderLiveSmokePlan } from '@elceo/types';
import { evaluateProviderLiveReadiness, type RuntimeReadinessConfig } from './provider-readiness';

export function buildProviderLiveSmokePlan(providerId: string, environment: ProviderLiveActivationEnvironment, config: RuntimeReadinessConfig = {}): ProviderLiveSmokePlan {
  const readiness = evaluateProviderLiveReadiness(providerId, environment, config);
  const adapterConfiguredForStaging = readiness.activationStatus === 'staging_ready' && environment === 'staging';
  return { generatedAt: new Date().toISOString(), environment, providerId, allowed: false, checks: ['validate_activation_policy', 'validate_required_secrets_present', 'validate_adapter_configuration', 'validate_provider_api_gate_execution_context', 'validate_no_secrets_in_response', 'validate_no_network_calls_in_tests'], warnings: adapterConfiguredForStaging ? ['provider_api_gate_execution_context_not_ready_prov_p1b'] : ['live_fetch_not_allowed_in_current_state'] };
}
