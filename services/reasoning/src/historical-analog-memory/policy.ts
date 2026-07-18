export const HISTORICAL_ANALOG_FEATURE_POLICY_VERSION = 'historical-analog-features-v1' as const;
export const HISTORICAL_ANALOG_RETRIEVAL_POLICY_VERSION = 'historical-analog-retrieval-v1' as const;
export const HISTORICAL_ANALOG_POLICY = Object.freeze({
  version: HISTORICAL_ANALOG_RETRIEVAL_POLICY_VERSION,
  weights: { eventContext: 15, surpriseRevision: 20, assetDirection: 15, pricePath: 20, relatedMarket: 10, volatility: 10, cognitionShift: 5, provenanceQuality: 5 },
  thresholds: { maxResults: 10, minimumReturnedSimilarity: 50, minimumFeatureCoverage: 0.75, strongAnalogSimilarity: 70, minimumUniqueComparableEvents: 10, minimumStrongAnalogs: 5 },
  bounds: { normalizedSurpriseSpan: 200, normalizedRevisionSpan: 200, volatilityAdjustedMove: 3, pathMovePct: 2, confidenceDelta: 100, contradictionDelta: 100 }
});
export type HistoricalAnalogComponent = keyof typeof HISTORICAL_ANALOG_POLICY.weights;

export const HISTORICAL_ANALOG_PAGE_LIMIT_POLICY = Object.freeze({ defaultLimit: 100, maxLimit: 1000 });
export function normalizeHistoricalAnalogPageLimit(limit?: number): number { if (limit === undefined) return HISTORICAL_ANALOG_PAGE_LIMIT_POLICY.defaultLimit; if (!Number.isFinite(limit) || limit < 1) return HISTORICAL_ANALOG_PAGE_LIMIT_POLICY.defaultLimit; return Math.min(Math.trunc(limit), HISTORICAL_ANALOG_PAGE_LIMIT_POLICY.maxLimit); }
export function normalizeHistoricalAnalogResultLimit(limit?: number): number { if (limit === undefined || !Number.isFinite(limit) || limit < 1) return HISTORICAL_ANALOG_POLICY.thresholds.maxResults; return Math.min(Math.trunc(limit), HISTORICAL_ANALOG_POLICY.thresholds.maxResults); }
export const HISTORICAL_ANALOG_COVERAGE_STRUCTURAL_POLICY_VERSION = 'historical-analog-coverage-structural-v1' as const;
export type HistoricalAnalogStructuralAvailabilityDecision = { asset: string; canonicalAssetFamily?: string; indicatorKind: string; indicatorCategory: string; queryStage: string; state: 'required' | 'structurally_unavailable'; policyVersion: string; reasonCode: string | null; structurallyUnavailable: boolean; reason: string | null };
export type HistoricalAnalogStructuralAvailabilityRule = { asset?: string; canonicalAssetFamily?: string; indicatorKind?: string; indicatorCategory?: string; queryStage?: string; structurallyUnavailable: true; reasonCode: string };
export type HistoricalAnalogStructuralAvailabilityPolicy = { version: string; rules: readonly HistoricalAnalogStructuralAvailabilityRule[] };
export const HISTORICAL_ANALOG_COVERAGE_STRUCTURAL_POLICY: HistoricalAnalogStructuralAvailabilityPolicy = Object.freeze({ version: HISTORICAL_ANALOG_COVERAGE_STRUCTURAL_POLICY_VERSION, rules: Object.freeze([]) });
export function resolveHistoricalAnalogStructuralAvailability(input: { asset: string; canonicalAssetFamily?: string; indicatorKind: string; indicatorCategory: string; queryStage: string }, policy: HistoricalAnalogStructuralAvailabilityPolicy = HISTORICAL_ANALOG_COVERAGE_STRUCTURAL_POLICY): HistoricalAnalogStructuralAvailabilityDecision { const rule=policy.rules.find((r)=>(!r.asset||r.asset===input.asset)&&(!r.canonicalAssetFamily||r.canonicalAssetFamily===input.canonicalAssetFamily)&&(!r.indicatorKind||r.indicatorKind===input.indicatorKind)&&(!r.indicatorCategory||r.indicatorCategory===input.indicatorCategory)&&(!r.queryStage||r.queryStage===input.queryStage)); return rule ? { ...input, state: 'structurally_unavailable', policyVersion: policy.version, reasonCode: rule.reasonCode, structurallyUnavailable: true, reason: rule.reasonCode } : { ...input, state: 'required', policyVersion: policy.version, reasonCode: null, structurallyUnavailable: false, reason: null }; }
