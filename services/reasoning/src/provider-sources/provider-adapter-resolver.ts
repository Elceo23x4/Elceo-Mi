import type { ScheduledIngestionJobPolicy } from '@elceo/types';
import type { MarketEvidenceProviderAdapter } from './normalization-contracts';
import { translateProviderCapability, type ProviderActivationMode, type ProviderApiGateExecutionContext } from './provider-api-gate';
import { TiingoMarketDataAdapter, type TiingoRuntimeConfig } from './tiingo/tiingo-adapter';
import { createOfficialAdapter, getOfficialAdapterCatalogEntry, type OfficialAdapterFactoryConfig } from './official/official-adapter-catalog';

export type TrustedProviderExecution = { sourceId:string; capabilityId:ScheduledIngestionJobPolicy['capability']; activationMode:ProviderActivationMode; adapter:MarketEvidenceProviderAdapter; context:ProviderApiGateExecutionContext };
export type TrustedProviderExecutionResolver = (policy:ScheduledIngestionJobPolicy,requestedAt:string)=>Promise<TrustedProviderExecution|null>;

/** Builds the Tiingo adapter only from server-owned configuration and verifies it against the canonical registry. */
export function createTiingoStagingExecutionResolver(config:TiingoRuntimeConfig,context:ProviderApiGateExecutionContext):TrustedProviderExecutionResolver {
 return async policy=>{if(policy.providerId!=='tiingo_market_data'||policy.capability!=='market_price_history')return null;translateProviderCapability(policy.providerId,policy.capability);return{sourceId:policy.providerId,capabilityId:policy.capability,activationMode:'staging_live_allowed',adapter:new TiingoMarketDataAdapter(config),context};};
}

export type OfficialEvidenceStagingConfig=Omit<OfficialAdapterFactoryConfig,'mode'|'fetchImpl'>&{fetchImpl?:typeof fetch};
/**
 * Builds official-source adapters only from server-owned configuration. No hostname, path, series, table, vector or dataflow
 * is accepted from the caller. Catalog entries that are parser/profile/entitlement blocked are intentionally non-resolvable.
 * This function establishes staging eligibility only; it never implies staging verification.
 */
export function createOfficialEvidenceStagingExecutionResolver(config:OfficialEvidenceStagingConfig,context:ProviderApiGateExecutionContext):TrustedProviderExecutionResolver{
 return async policy=>{
  const catalog=getOfficialAdapterCatalogEntry(policy.providerId,policy.capability);if(!catalog||catalog.readiness!=='live_capable')return null;
  translateProviderCapability(policy.providerId,policy.capability);
  const adapter=createOfficialAdapter(policy.providerId,policy.capability,{...config,mode:'live_enabled',fetchImpl:config.fetchImpl});if(!adapter)return null;
  return{sourceId:policy.providerId,capabilityId:policy.capability,activationMode:'staging_live_allowed',adapter,context};
 };
}

/** Resolves in priority order while preserving each resolver's fail-closed semantics. */
export function composeTrustedProviderExecutionResolvers(...resolvers:readonly TrustedProviderExecutionResolver[]):TrustedProviderExecutionResolver{
 return async(policy,requestedAt)=>{for(const resolver of resolvers){const resolved=await resolver(policy,requestedAt);if(resolved)return resolved;}return null;};
}
