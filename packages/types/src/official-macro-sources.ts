import type { LaunchAsset, ProviderSourceId } from './provider-source-registry';

export const OFFICIAL_MACRO_SOURCE_IDS = ['federal_reserve_official','fred_macro','us_treasury_official','bls_official','bea_official','census_official','ism_shell','ecb_official','eurostat_official','destatis_official','ifo_shell','zew_shell','boe_official','ons_official','boj_official','imf_official','world_bank_official','oecd_official','bis_official','uk_dmo_official','japan_mof_official'] as const;
export type OfficialMacroSourceId = typeof OFFICIAL_MACRO_SOURCE_IDS[number];
export const OFFICIAL_MACRO_REGIONS = ['us','eurozone','germany','uk','japan','global'] as const;
export type OfficialMacroRegion = typeof OFFICIAL_MACRO_REGIONS[number];
export const OFFICIAL_MACRO_RELEASE_KINDS = ['cpi','hicp','pce','nfp','labor','gdp','retail_sales','pmi','industrial_production','factory_orders','trade_balance','leading_indicator','liquidity_credit'] as const;
export type OfficialMacroReleaseKind = typeof OFFICIAL_MACRO_RELEASE_KINDS[number];
export const OFFICIAL_MACRO_POLICY_KINDS = ['policy_decision','policy_statement','speech','minutes','vote_split','intervention_risk_notice','debt_supply_context'] as const;
export type OfficialMacroPolicyKind = typeof OFFICIAL_MACRO_POLICY_KINDS[number];
export const OFFICIAL_MACRO_EVIDENCE_CLASSES = ['inflation','labor','growth','policy','yields_real_rates','liquidity_credit','risk_sentiment','macro_context'] as const;
export type OfficialMacroEvidenceClass = typeof OFFICIAL_MACRO_EVIDENCE_CLASSES[number];
export const OFFICIAL_MACRO_FREQUENCIES = ['intraday','daily','weekly','monthly','quarterly','annual','event_driven'] as const;
export type OfficialMacroFrequency = typeof OFFICIAL_MACRO_FREQUENCIES[number];
export const OFFICIAL_MACRO_FIXTURE_MODES = ['fixture_only','dry_run_fixture'] as const;
export type OfficialMacroFixtureMode = typeof OFFICIAL_MACRO_FIXTURE_MODES[number];
export const OFFICIAL_MACRO_ACTIVATION_STATUSES = ['live_blocked','shell_ready','fixture_ready'] as const;
export type OfficialMacroActivationStatus = typeof OFFICIAL_MACRO_ACTIVATION_STATUSES[number];

export type OfficialMacroSourceDescriptor = { sourceId: OfficialMacroSourceId; providerSourceId: ProviderSourceId; displayName: string; region: OfficialMacroRegion; releaseKinds: OfficialMacroReleaseKind[]; policyKinds: OfficialMacroPolicyKind[]; evidenceClasses: OfficialMacroEvidenceClass[]; assetRelevance: LaunchAsset[]; fixtureMode: OfficialMacroFixtureMode; activationStatus: OfficialMacroActivationStatus; liveBlockedByDefault: true; };
export type OfficialMacroReleaseDescriptor = { sourceId: OfficialMacroSourceId; releaseKind: OfficialMacroReleaseKind; title: string; frequency: OfficialMacroFrequency; region: OfficialMacroRegion; seriesId: string; };
export type OfficialMacroPolicyEventDescriptor = { sourceId: OfficialMacroSourceId; policyKind: OfficialMacroPolicyKind; title: string; observedAt: string; region: OfficialMacroRegion; };
export type OfficialMacroSeriesDescriptor = { sourceId: OfficialMacroSourceId; releaseKind: OfficialMacroReleaseKind; seriesId: string; title: string; frequency: OfficialMacroFrequency; region: OfficialMacroRegion; evidenceClass: OfficialMacroEvidenceClass; };
export type OfficialMacroFixturePayload = { fixtureId: string; sourceId: OfficialMacroSourceId; region: OfficialMacroRegion; observedAt: string; period: string; title: string; releaseKind?: OfficialMacroReleaseKind; policyKind?: OfficialMacroPolicyKind; headlineValue?: string; prior?: string; forecast?: string; actual?: string; surpriseDirection?: 'upside'|'downside'|'inline'; evidenceClass: OfficialMacroEvidenceClass; assetRelevance: LaunchAsset[]; narrativeSummary: string; freshnessState: 'fresh'|'stale'; };
export type OfficialMacroNormalizedEvidence = { evidenceId: string; sourceId: OfficialMacroSourceId; region: OfficialMacroRegion; releaseKind?: OfficialMacroReleaseKind; policyKind?: OfficialMacroPolicyKind; evidenceClass: OfficialMacroEvidenceClass; observedAt: string; freshnessState: 'fresh'|'stale'; assetRelevance: LaunchAsset[]; directionalPressure?: 'inflationary'|'disinflationary'|'hawkish'|'dovish'|'risk_on'|'risk_off'|'neutral'; qualityHints: string[]; narrative: string; rawFixtureId: string; };
export type OfficialMacroAdapterReadiness = { sourceId: OfficialMacroSourceId; providerSourceId: ProviderSourceId; status: OfficialMacroActivationStatus; fixtureMode: OfficialMacroFixtureMode; liveBlockedByDefault: true; notes: string[]; };
export type OfficialMacroCoverageReport = { generatedAt: string; sources: OfficialMacroSourceDescriptor[]; releases: OfficialMacroReleaseDescriptor[]; fixtures: { sourceId: OfficialMacroSourceId; fixtureCount: number }[]; allLiveBlockedByDefault: boolean; };
