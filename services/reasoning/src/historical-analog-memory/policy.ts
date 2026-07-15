export const HISTORICAL_ANALOG_FEATURE_POLICY_VERSION = 'historical-analog-features-v1' as const;
export const HISTORICAL_ANALOG_RETRIEVAL_POLICY_VERSION = 'historical-analog-retrieval-v1' as const;
export const HISTORICAL_ANALOG_POLICY = Object.freeze({
  version: HISTORICAL_ANALOG_RETRIEVAL_POLICY_VERSION,
  weights: { eventContext: 15, surpriseRevision: 20, assetDirection: 15, pricePath: 20, relatedMarket: 10, volatility: 10, cognitionShift: 5, provenanceQuality: 5 },
  thresholds: { maxResults: 10, minimumReturnedSimilarity: 50, minimumFeatureCoverage: 0.75, strongAnalogSimilarity: 70, minimumUniqueComparableEvents: 10, minimumStrongAnalogs: 5 },
  bounds: { normalizedSurpriseSpan: 200, normalizedRevisionSpan: 200, volatilityAdjustedMove: 3, pathMovePct: 2, confidenceDelta: 100, contradictionDelta: 100 }
});
export type HistoricalAnalogComponent = keyof typeof HISTORICAL_ANALOG_POLICY.weights;
