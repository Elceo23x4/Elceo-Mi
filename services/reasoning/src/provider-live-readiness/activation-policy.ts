import type { ProviderLiveActivationEnvironment, ProviderLiveActivationPolicy, ProviderQuotaPolicy } from '@elceo/types';
import { CANONICAL_EVIDENCE_SOURCES, EVIDENCE_EXECUTION_REGISTRATIONS } from '../evidence-fabric/index';

export const LIVE_PROVIDER_IDS = ['tiingo_market_data','cftc_cot','federal_reserve','ecb_public','boe','boj','us_treasury','fred','bank_public_reports','public_regulatory_filings','calculated_internal_conditions','calculated_internal_macro_calendar','public_statistics_agencies','macro_surprise_calculated_internal'] as const;

export function getDefaultProviderQuotaPolicies(): ProviderQuotaPolicy[] {
  return LIVE_PROVIDER_IDS.map((providerId)=>({ providerId, unit:'unknown', limit:null, burstLimit:null, rationale:'No production quota is inferred. Provider-specific approved limits must be supplied through Provider API Gate policy before staging/production execution.' }));
}

function registrationsForRuntimeProvider(providerId:string){return EVIDENCE_EXECUTION_REGISTRATIONS.filter(registration=>registration.sourceId===providerId||registration.gateSourceId===providerId);}
function canonicalSourcesForRuntimeProvider(providerId:string){const ids=new Set(registrationsForRuntimeProvider(providerId).map(registration=>registration.sourceId));return CANONICAL_EVIDENCE_SOURCES.filter(source=>ids.has(source.sourceId));}

export function getProviderLiveActivationPolicy(providerId: string, environment: ProviderLiveActivationEnvironment): ProviderLiveActivationPolicy {
  const registrations=registrationsForRuntimeProvider(providerId);
  const hasExecutableImplementation=registrations.length>0;
  const hasStagingVerifiedImplementation=registrations.some(registration=>registration.stagingVerified);
  const requireApiKey=canonicalSourcesForRuntimeProvider(providerId).some(source=>source.credential==='api_key');
  /* Structural executability never authorizes network I/O by itself. Staging must additionally have empirical verification and an approved Provider API Gate policy. */
  const liveEnabled=environment==='staging'&&hasStagingVerifiedImplementation;
  const allowLiveFetch=environment==='staging'&&hasStagingVerifiedImplementation;
  return {providerId,environment,liveEnabled,allowLiveFetch,requireExplicitEnv:true,requireApiKey,requireStagingFirst:true,productionBlockedByDefault:true,rationale:environment==='production'?'Production activation is blocked by default in DFC-1.':hasStagingVerifiedImplementation?'Empirically staging-verified route; Provider API Gate policy and explicit enablement remain required.':hasExecutableImplementation?'Executable adapter exists but staging verification is absent; live fetch remains blocked.':'No executable evidence route is registered; live fetch remains blocked.'};
}
