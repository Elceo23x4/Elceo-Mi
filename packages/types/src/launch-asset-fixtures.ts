import type { LaunchAsset, ProviderSourceCapabilityKind, ProviderSourceFamily, ProviderSourceId } from './provider-source-registry';

export const LAUNCH_ASSET_FIXTURE_SCENARIO_KINDS = ['normal_market','macro_event','conflicting_evidence','stale_evidence','high_volatility','liquidity_pressure','risk_off_shock','central_bank_surprise','positioning_shift','news_geopolitical_shock'] as const;
export type LaunchAssetFixtureScenarioKind = typeof LAUNCH_ASSET_FIXTURE_SCENARIO_KINDS[number];
export const LAUNCH_ASSET_FIXTURE_SEVERITIES = ['low','medium','high','extreme'] as const;
export type LaunchAssetFixtureSeverity = typeof LAUNCH_ASSET_FIXTURE_SEVERITIES[number];
export const LAUNCH_ASSET_FIXTURE_REGIMES = ['calm','trending','event_risk','stressed','dislocated'] as const;
export type LaunchAssetFixtureRegime = typeof LAUNCH_ASSET_FIXTURE_REGIMES[number];
export const LAUNCH_ASSET_FIXTURE_EXPECTED_PRESSURES = ['bullish','bearish','neutral','mixed','unknown'] as const;
export type LaunchAssetFixtureExpectedPressure = typeof LAUNCH_ASSET_FIXTURE_EXPECTED_PRESSURES[number];
export const LAUNCH_ASSET_FIXTURE_EXPECTED_CONFIDENCE_BANDS = ['low','medium','high'] as const;
export type LaunchAssetFixtureExpectedConfidenceBand = typeof LAUNCH_ASSET_FIXTURE_EXPECTED_CONFIDENCE_BANDS[number];
export type LaunchAssetFixtureScenarioId = `${LaunchAsset}:${string}`;

export type LaunchAssetFixtureEvidenceItem = {
  evidenceId: string; asset: LaunchAsset; sourceId: ProviderSourceId; providerFamily: ProviderSourceFamily; sourceFamily: ProviderSourceFamily; capabilityKind: ProviderSourceCapabilityKind;
  evidenceClass: string; observedAt: string; freshnessState: 'fresh'|'aging'|'stale'; qualityHints: string[]; directionalPressure: LaunchAssetFixtureExpectedPressure;
  narrative: string; expectedRole: 'primary'|'secondary'|'context'; expectedImportance: number; scenarioTags: string[];
};
export type LaunchAssetFixtureExpectedOutput = {
  scenarioId: LaunchAssetFixtureScenarioId; expectedPressure: LaunchAssetFixtureExpectedPressure; expectedConfidenceBand: LaunchAssetFixtureExpectedConfidenceBand;
  expectedContradiction: boolean; expectedFreshnessWarnings: boolean; expectedTopEvidenceClasses: string[]; expectedCognitionThemes: string[];
};
export type LaunchAssetFixtureScenario = {
  scenarioId: LaunchAssetFixtureScenarioId; asset: LaunchAsset; title: string; kind: LaunchAssetFixtureScenarioKind; severity: LaunchAssetFixtureSeverity; regime: LaunchAssetFixtureRegime;
  tags: string[]; evidence: LaunchAssetFixtureEvidenceItem[]; expectedOutput: LaunchAssetFixtureExpectedOutput;
};
export type LaunchAssetFixtureAssetPack = { asset: LaunchAsset; scenarios: LaunchAssetFixtureScenario[]; };
export type LaunchAssetFixtureLibrary = { generatedAt: string; assets: LaunchAssetFixtureAssetPack[]; scenarios: LaunchAssetFixtureScenario[]; };
export type LaunchAssetFixtureCoverageReport = { generatedAt: string; assetScenarioCounts: Record<LaunchAsset, number>; totalScenarioCount: number; totalEvidenceCount: number; staleScenarioCount: number; conflictingScenarioCount: number; dxyComplete: boolean; vixComplete: boolean; };
