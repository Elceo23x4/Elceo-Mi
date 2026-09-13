import type { ProviderCapabilityKind, ProviderSourceId } from '@elceo/types';
import type { MarketEvidenceProviderAdapter } from '../provider-sources/normalization-contracts';
import { EcbOfficialAdapter, type EcbAdapterConfig } from '../provider-sources/official/ecb-adapter';
import { FredOfficialAdapter, type FredAdapterConfig } from '../provider-sources/official/fred-adapter';

export type EvidenceGateExecutionProfile={
 canonicalSourceId:ProviderSourceId;
 dfcCapabilityId:string;
 gateSourceId:string;
 providerCapabilityId:ProviderCapabilityKind;
 requestParams:Record<string,unknown>;
 adapter:MarketEvidenceProviderAdapter;
};
export type EvidenceExecutionConfig={fred?:FredAdapterConfig;ecb?:EcbAdapterConfig};

type ProfileDefinition={gateSourceId:string;providerCapabilityId:ProviderCapabilityKind;requestParams:Record<string,unknown>;build:(config:EvidenceExecutionConfig)=>MarketEvidenceProviderAdapter};
const PROFILES=new Map<string,ProfileDefinition>([
 ['fred_macro:real_yields',{gateSourceId:'fred',providerCapabilityId:'real_yield_series',requestParams:{seriesId:'DFII10'},build:config=>new FredOfficialAdapter(config.fred)}],
 ['fred_macro:financial_conditions',{gateSourceId:'fred',providerCapabilityId:'financial_conditions_index',requestParams:{seriesId:'NFCI'},build:config=>new FredOfficialAdapter(config.fred)}],
 ['ecb_official:ecb_policy',{gateSourceId:'ecb_public',providerCapabilityId:'policy_rate_series',requestParams:{series:'deposit_facility'},build:config=>new EcbOfficialAdapter(config.ecb)}]
]);

export function resolveEvidenceGateExecution(canonicalSourceId:ProviderSourceId,dfcCapabilityId:string,config:EvidenceExecutionConfig={}):EvidenceGateExecutionProfile|null{
 const profile=PROFILES.get(`${canonicalSourceId}:${dfcCapabilityId}`);if(!profile)return null;
 return{canonicalSourceId,dfcCapabilityId,gateSourceId:profile.gateSourceId,providerCapabilityId:profile.providerCapabilityId,requestParams:structuredClone(profile.requestParams),adapter:profile.build(config)};
}
export function listEvidenceGateExecutionProfiles(){return [...PROFILES.entries()].map(([route,profile])=>({route,gateSourceId:profile.gateSourceId,providerCapabilityId:profile.providerCapabilityId,requestParams:structuredClone(profile.requestParams)}));}
