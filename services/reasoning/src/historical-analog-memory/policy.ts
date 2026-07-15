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
export const HISTORICAL_ANALOG_COVERAGE_STRUCTURAL_POLICY_VERSION = 'historical-analog-coverage-structural-v1' as const;
export function resolveHistoricalAnalogStructuralAvailability(_input: { asset: string; indicatorKind: string; indicatorCategory: string; queryStage: string }): { structurallyUnavailable: boolean; reason: string | null; policyVersion: typeof HISTORICAL_ANALOG_COVERAGE_STRUCTURAL_POLICY_VERSION } { return { structurallyUnavailable: false, reason: null, policyVersion: HISTORICAL_ANALOG_COVERAGE_STRUCTURAL_POLICY_VERSION }; }
