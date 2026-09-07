import type { ScheduledIngestionJobPolicy } from '@elceo/types';
import type { MarketEvidenceProviderAdapter } from './normalization-contracts';
import { translateProviderCapability, type ProviderActivationMode, type ProviderApiGateExecutionContext } from './provider-api-gate';
import { TiingoMarketDataAdapter, type TiingoRuntimeConfig } from './tiingo/tiingo-adapter';

export type TrustedProviderExecution = { sourceId:string; capabilityId:ScheduledIngestionJobPolicy['capability']; activationMode:ProviderActivationMode; adapter:MarketEvidenceProviderAdapter; context:ProviderApiGateExecutionContext };
export type TrustedProviderExecutionResolver = (policy:ScheduledIngestionJobPolicy,requestedAt:string)=>Promise<TrustedProviderExecution|null>;

/** Builds the Tiingo adapter only from server-owned configuration and verifies it against the canonical registry. */
export function createTiingoStagingExecutionResolver(config:TiingoRuntimeConfig,context:ProviderApiGateExecutionContext):TrustedProviderExecutionResolver {
 return async policy=>{if(policy.providerId!=='tiingo_market_data'||policy.capability!=='market_price_history')return null;translateProviderCapability(policy.providerId,policy.capability);return{sourceId:policy.providerId,capabilityId:policy.capability,activationMode:'staging_live_allowed',adapter:new TiingoMarketDataAdapter(config),context};};
}
