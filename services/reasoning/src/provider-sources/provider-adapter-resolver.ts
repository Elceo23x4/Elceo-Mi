import type { ScheduledIngestionJobPolicy } from '@elceo/types';
import type { MarketEvidenceProviderAdapter } from './normalization-contracts';
import { translateProviderCapability, type ProviderActivationMode, type ProviderApiGateExecutionContext } from './provider-api-gate';
import { TiingoMarketDataAdapter, type TiingoRuntimeConfig } from './tiingo/tiingo-adapter';
import { CFTC_PUBLIC_REPORTING_GATE_ID, CftcCotAdapter, type CftcCotRuntimeConfig } from './cot/cot-adapter';
import { FinnhubMacroCalendarEvidenceAdapter, FinnhubMarketDataFallbackAdapter, type FinnhubRuntimeConfig } from './finnhub/finnhub-adapter';
import { GdeltNewsAdapter, MarketauxMarketNewsAdapter, type GdeltRuntimeConfig, type MarketauxRuntimeConfig } from './news/news-adapters';
import { createOfficialAdapter, getOfficialAdapterCatalogEntry, type OfficialAdapterFactoryConfig } from './official/official-adapter-catalog';

export type TrustedProviderExecution = { sourceId:string; capabilityId:ScheduledIngestionJobPolicy['capability']; activationMode:ProviderActivationMode; adapter:MarketEvidenceProviderAdapter; context:ProviderApiGateExecutionContext };
export type TrustedProviderExecutionResolver = (policy:ScheduledIngestionJobPolicy,requestedAt:string)=>Promise<TrustedProviderExecution|null>;

/** Builds the Tiingo primary adapter only from server-owned configuration and verifies it against the canonical registry. */
export function createTiingoStagingExecutionResolver(config:TiingoRuntimeConfig,context:ProviderApiGateExecutionContext):TrustedProviderExecutionResolver {
 return async policy=>{if(policy.providerId!=='tiingo_market_data'||policy.capability!=='market_price_history')return null;translateProviderCapability(policy.providerId,policy.capability);return{sourceId:policy.providerId,capabilityId:policy.capability,activationMode:'staging_live_allowed',adapter:new TiingoMarketDataAdapter({...config,mode:'live_enabled',liveEnabled:true}),context};};
}

/** CFTC live execution has a gate-only identity; normalized evidence remains canonical cftc_cot. */
export function createCftcStagingExecutionResolver(config:CftcCotRuntimeConfig,context:ProviderApiGateExecutionContext):TrustedProviderExecutionResolver{
 return async policy=>{if(policy.providerId!==CFTC_PUBLIC_REPORTING_GATE_ID||policy.capability!=='cot_report')return null;translateProviderCapability(policy.providerId,policy.capability);return{sourceId:policy.providerId,capabilityId:policy.capability,activationMode:'staging_live_allowed',adapter:new CftcCotAdapter({...config,mode:'live_enabled',liveEnabled:true,gateProviderId:CFTC_PUBLIC_REPORTING_GATE_ID}),context};};
}

export type SecondaryEvidenceStagingConfig={
 finnhub?:Omit<FinnhubRuntimeConfig,'mode'>;
 marketaux?:Omit<MarketauxRuntimeConfig,'mode'>;
 gdelt?:Omit<GdeltRuntimeConfig,'mode'>;
};
/**
 * Builds bounded secondary-provider adapters. These adapters do not inherit authority from the resolver:
 * Finnhub market data remains a Tiingo uptime fallback, Finnhub macro remains non-authoritative calendar/expectation
 * evidence, Marketaux is finance-news primary, and GDELT is geopolitical primary / finance-news degraded fallback.
 */
export function createSecondaryEvidenceStagingExecutionResolver(config:SecondaryEvidenceStagingConfig,context:ProviderApiGateExecutionContext):TrustedProviderExecutionResolver{
 return async policy=>{
  let adapter:MarketEvidenceProviderAdapter|null=null;
  if(policy.providerId==='finnhub_market_data'&&policy.capability==='market_price_history')adapter=new FinnhubMarketDataFallbackAdapter({...config.finnhub,mode:'live_enabled'});
  else if(policy.providerId==='finnhub_macro'&&policy.capability==='economic_calendar')adapter=new FinnhubMacroCalendarEvidenceAdapter({...config.finnhub,mode:'live_enabled'});
  else if(policy.providerId==='marketaux_news'&&policy.capability==='market_news_feed')adapter=new MarketauxMarketNewsAdapter({...config.marketaux,mode:'live_enabled'});
  else if(policy.providerId==='gdelt_news'&&(policy.capability==='market_news_feed'||policy.capability==='geopolitical_risk_event'))adapter=new GdeltNewsAdapter({...config.gdelt,mode:'live_enabled'});
  if(!adapter)return null;
  translateProviderCapability(policy.providerId,policy.capability);
  return{sourceId:policy.providerId,capabilityId:policy.capability,activationMode:'staging_live_allowed',adapter,context};
 };
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
  const adapterConfig:OfficialAdapterFactoryConfig={...config,mode:'live_enabled',...(config.fetchImpl?{fetchImpl:config.fetchImpl}:{})};
  const adapter=createOfficialAdapter(policy.providerId,policy.capability,adapterConfig);if(!adapter)return null;
  return{sourceId:policy.providerId,capabilityId:policy.capability,activationMode:'staging_live_allowed',adapter,context};
 };
}

/** Resolves in priority order while preserving each resolver's fail-closed semantics. */
export function composeTrustedProviderExecutionResolvers(...resolvers:readonly TrustedProviderExecutionResolver[]):TrustedProviderExecutionResolver{
 return async(policy,requestedAt)=>{for(const resolver of resolvers){const resolved=await resolver(policy,requestedAt);if(resolved)return resolved;}return null;};
}
