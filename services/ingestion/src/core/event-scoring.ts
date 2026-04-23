import type { CanonicalAssetSymbol, CanonicalEvent, Timeframe } from '@elceo/types';
import { computeEventTemporalState } from './event-recency';
import { computeEventRelevanceScore } from './event-relevance';

export function computeEventRecencyAndRelevance(event: CanonicalEvent, targetAsset: CanonicalAssetSymbol, targetTimeframe: Timeframe, asOf: string): CanonicalEvent {
  const temporal = computeEventTemporalState(event, asOf);
  const withTemporal: CanonicalEvent = {
    ...event,
    recencyScore: temporal.recencyScore,
    freshnessHours: temporal.freshnessHours,
    stale: temporal.stale
  };

  return {
    ...withTemporal,
    relevanceScore: computeEventRelevanceScore(withTemporal, targetAsset, targetTimeframe, asOf)
  };
}
