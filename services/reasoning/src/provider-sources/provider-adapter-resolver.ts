import type { ScheduledIngestionJobPolicy } from '@elceo/types';
import type { MarketEvidenceProviderAdapter } from './normalization-contracts';
import { translateProviderCapability, type ProviderActivationMode, type ProviderApiGateExecutionContext } from './provider-api-gate';
import { TiingoMarketDataAdapter, type TiingoRuntimeConfig } from './tiingo/tiingo-adapter';
import { FredOfficialAdapter } from './official/fred-adapter';
import { EcbOfficialAdapter } from './official/ecb-adapter';
import { UsTreasuryOfficialAdapter } from './official/us-treasury-adapter';

export type TrustedProviderExecution = { sourceId:string; capabilityId:ScheduledIngestionJobPolicy['capability']; activationMode:ProviderActivationMode; adapter:MarketEvidenceProviderAdapter; context:ProviderApiGateExecutionContext };
export type TrustedProviderExecutionResolver = (policy:ScheduledIngestionJobPolicy,requestedAt:string)=>Promise<TrustedProviderExecution|null>;

/** Builds the Tiingo adapter only from server-owned configuration and verifies it against the canonical registry. */
export function createTiingoStagingExecutionResolver(config:TiingoRuntimeConfig,context:ProviderApiGateExecutionContext):TrustedProviderExecutionResolver {
 return async policy=>{if(policy.providerId!=='tiingo_market_data'||policy.capability!=='market_price_history')return null;translateProviderCapability(policy.providerId,policy.capability);return{sourceId:policy.providerId,capabilityId:policy.capability,activationMode:'staging_live_allowed',adapter:new TiingoMarketDataAdapter(config),context};};
}

export type OfficialEvidenceStagingConfig={fredApiKey?:string|null};
const OFFICIAL_EXECUTABLE_CAPABILITIES:Readonly<Record<string,readonly ScheduledIngestionJobPolicy['capability'][]>>={
 fred:['real_yield_series','financial_conditions_index'],
 ecb_public:['policy_rate_series'],
 us_treasury:['nominal_yield_series','real_yield_series']
};
/**
 * Builds official-source adapters only from server-owned configuration. No hostname or endpoint is accepted from a request.
 * This resolver does not imply staging verification; it only makes an explicitly allowed staging execution possible through Provider API Gate.
 */
export function createOfficialEvidenceStagingExecutionResolver(config:OfficialEvidenceStagingConfig,context:ProviderApiGateExecutionContext):TrustedProviderExecutionResolver{
 return async policy=>{
  const allowed=OFFICIAL_EXECUTABLE_CAPABILITIES[policy.providerId];if(!allowed?.includes(policy.capability))return null;
  translateProviderCapability(policy.providerId,policy.capability);
  let adapter:MarketEvidenceProviderAdapter;
  if(policy.providerId==='fred'){
   if(!config.fredApiKey)return null;
   adapter=new FredOfficialAdapter({mode:'live_enabled',apiKey:config.fredApiKey});
  }else if(policy.providerId==='ecb_public')adapter=new EcbOfficialAdapter({mode:'live_enabled'});
  else if(policy.providerId==='us_treasury')adapter=new UsTreasuryOfficialAdapter({mode:'live_enabled'});
  else return null;
  return{sourceId:policy.providerId,capabilityId:policy.capability,activationMode:'staging_live_allowed',adapter,context};
 };
}

/** Resolves in priority order while preserving each resolver's fail-closed semantics. */
export function composeTrustedProviderExecutionResolvers(...resolvers:readonly TrustedProviderExecutionResolver[]):TrustedProviderExecutionResolver{
 return async(policy,requestedAt)=>{for(const resolver of resolvers){const resolved=await resolver(policy,requestedAt);if(resolved)return resolved;}return null;};
}
