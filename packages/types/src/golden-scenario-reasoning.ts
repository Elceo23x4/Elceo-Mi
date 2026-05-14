import type { TradingAssetCoverage } from './market-evidence';

export type GoldenScenarioAssetId = TradingAssetCoverage | 'dxy' | 'vix';

export const GOLDEN_SCENARIO_FAMILIES = ['asset_specific', 'cross_asset', 'freshness'] as const;
export const GOLDEN_SCENARIO_ASSET_TIERS = ['tier_1a', 'tier_1b', 'cross_asset'] as const;
export const GOLDEN_SCENARIO_PRESSURES = ['bullish', 'bearish', 'mixed', 'mixed_positive', 'mixed_caution'] as const;
export const GOLDEN_SCENARIO_CONFIDENCE_BANDS = ['low', 'medium', 'high'] as const;
export const GOLDEN_SCENARIO_CONTRADICTION_EXPECTATIONS = ['required', 'not_required'] as const;
export const GOLDEN_SCENARIO_FRESHNESS_EXPECTATIONS = ['fresh', 'warning_required'] as const;
export const GOLDEN_SCENARIO_REASONING_STATUSES = ['pass', 'fail'] as const;
export const GOLDEN_SCENARIO_GUARDRAIL_STATUSES = ['pass', 'fail'] as const;

export type GoldenScenarioId = string;
export type GoldenScenarioFamily = (typeof GOLDEN_SCENARIO_FAMILIES)[number];
export type GoldenScenarioAssetTier = (typeof GOLDEN_SCENARIO_ASSET_TIERS)[number];
export type GoldenScenarioExpectedPressure = (typeof GOLDEN_SCENARIO_PRESSURES)[number];
export type GoldenScenarioConfidenceBand = (typeof GOLDEN_SCENARIO_CONFIDENCE_BANDS)[number];
export type GoldenScenarioContradictionExpectation = (typeof GOLDEN_SCENARIO_CONTRADICTION_EXPECTATIONS)[number];
export type GoldenScenarioFreshnessExpectation = (typeof GOLDEN_SCENARIO_FRESHNESS_EXPECTATIONS)[number];
export type GoldenScenarioReasoningStatus = (typeof GOLDEN_SCENARIO_REASONING_STATUSES)[number];
export type GoldenScenarioGuardrailStatus = (typeof GOLDEN_SCENARIO_GUARDRAIL_STATUSES)[number];

export type GoldenScenarioInputEvidence = { evidenceId: string; evidenceClass: string; observedAt: string; weight: number; note: string; sourceFixtureId: string; };
export type GoldenScenarioExpectedBehavior = { acceptedPressure: GoldenScenarioExpectedPressure[]; acceptedConfidenceBand: GoldenScenarioConfidenceBand[]; contradictionExpectation: GoldenScenarioContradictionExpectation; freshnessExpectation: GoldenScenarioFreshnessExpectation; requiredTopEvidenceClasses: string[]; requiredThemes: string[]; };
export type GoldenScenarioReasoningResult = { scenarioId: GoldenScenarioId; affectedAssets: GoldenScenarioAssetId[]; evaluatedAt: string; pressure: GoldenScenarioExpectedPressure; confidenceBand: GoldenScenarioConfidenceBand; contradictionDetected: boolean; freshnessWarning: boolean; topEvidenceClasses: string[]; cognitionThemes: string[]; reasoningNotes: string[]; uncertaintyFlags: string[]; guardrailStatus: GoldenScenarioGuardrailStatus; forbiddenTermsFound: string[]; sourceFixtureIds: string[]; };
export type GoldenScenarioAssertionResult = { scenarioId: GoldenScenarioId; status: GoldenScenarioReasoningStatus; checks: string[]; errors: string[]; result: GoldenScenarioReasoningResult; };
export type GoldenScenarioDefinition = { scenarioId: GoldenScenarioId; family: GoldenScenarioFamily; tier: GoldenScenarioAssetTier; title: string; affectedAssets: GoldenScenarioAssetId[]; inputEvidence: GoldenScenarioInputEvidence[]; expectedBehavior: GoldenScenarioExpectedBehavior; deterministicResult: Omit<GoldenScenarioReasoningResult, 'scenarioId'|'affectedAssets'>; };
export type GoldenScenarioPack = { version: string; generatedAt: string; scenarios: GoldenScenarioDefinition[]; };
export type GoldenScenarioCoverageReport = { totalScenarios: number; tier1AAssetsCovered: GoldenScenarioAssetId[]; tier1BAssetsCovered: GoldenScenarioAssetId[]; crossAssetScenarioIds: GoldenScenarioId[]; freshnessScenarioIds: GoldenScenarioId[]; };
