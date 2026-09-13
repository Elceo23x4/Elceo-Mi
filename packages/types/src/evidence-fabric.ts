import type { ProviderSourceId } from './provider-source-registry';
import type { TradingAssetCoverage } from './market-evidence';

export type EvidenceRouteRole='primary'|'confirmation'|'fallback'|'proxy';
export type SourceAuthorityTier='official_first_party'|'market_venue'|'licensed_market_vendor'|'trusted_aggregator'|'public_extraction'|'calculated_internal';
export type EvidenceCriticality='critical'|'important'|'supplemental';
export type EvidenceAvailabilityState='executable'|'degraded'|'blocked'|'not_started';
export type EvidenceRouteFreshnessPolicy={policyId:string;maxAgeMs:number;cadence:'intraday'|'daily'|'weekly'|'release_aware'|'upstream_change'};
export type EvidenceRevisionPolicy={mode:'append_vintage'|'immutable'|'replace_with_audit';supportsAsOf:boolean};
export type SourceUsagePolicy={internalAnalytics:'allowed'|'unknown';rawDisplay:'permitted'|'restricted'|'unknown';attributionRequired:boolean|'unknown';redistribution:'permitted'|'restricted'|'legal_review_required'};
export type ProviderIdentityAlias={alias:string;canonicalSourceId:ProviderSourceId};
export type EvidenceImplementationState='descriptor_only'|'source_contract_ready'|'fixture_parser_ready'|'executable_adapter'|'staging_eligible'|'staging_verified'|'production_eligible'|'production_active'|'blocked';
export type ProxySemantics={proxy:true;underlyingTarget:string;proxyInstrument:string;basisRisk:'low'|'medium'|'high'|'unknown';rationale:string;mayLabelAsDirectPrice:false};
export type EvidenceRoute={role:EvidenceRouteRole;sourceId:ProviderSourceId;availability:EvidenceAvailabilityState;normalizerId:string|null;persistencePath:string|null;freshnessPolicy:EvidenceRouteFreshnessPolicy|null;trustedGateExecution:boolean;placeholder:boolean;proxy?:ProxySemantics};
export type AssetEvidenceRequirement={capabilityId:string;criticality:EvidenceCriticality;directPriceRequired?:boolean;proxyPermitted?:boolean;routes:EvidenceRoute[]};
export type AssetEvidenceBlueprint={asset:TradingAssetCoverage;requirements:AssetEvidenceRequirement[]};

export type MacroRevisionState='preliminary'|'final'|'revised';
export type NormalizedMacroVintage={correlationKey:string;countryOrArea:string;indicatorId:string;referencePeriod:string;scheduledReleaseAt:string|null;sourceReleaseAt:string|null;firstSeenAt:string;retrievedAt:string;effectiveAt:string;vintageId:string|null;previousPublishedValue:number|null;value:number;revisionState:MacroRevisionState;sourceUrl:string;sourceId:ProviderSourceId;retrievalRequestId:string};
export type CalendarOfficialReleaseLink={correlationKey:string;countryOrArea:string;indicatorId:string;referencePeriod:string;scheduledReleaseAt:string;sourceAuthority:ProviderSourceId;expectation:number|null;previous:number|null;preliminaryActual:number|null;authoritativeActual:number|null;revisedActual:number|null};
