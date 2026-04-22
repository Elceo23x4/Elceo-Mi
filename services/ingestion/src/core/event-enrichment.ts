import { validateCanonicalEvent } from '@elceo/schemas';
import type { CanonicalAssetSymbol, CanonicalEvent, Timeframe } from '@elceo/types';
import { buildCanonicalEventDedupeKey } from './event-dedupe';
import { computeEventRecencyAndRelevance } from './event-scoring';
import { getEffectiveSourceReliabilityScore } from './source-reliability';

export type EnrichCanonicalEventError = {
  ok: false;
  message: string;
  fieldPath: string | null;
  eventId: string | null;
};

export type EnrichCanonicalEventSuccess = {
  ok: true;
  value: CanonicalEvent;
};

export type EnrichCanonicalEventResult = EnrichCanonicalEventSuccess | EnrichCanonicalEventError;

export function enrichCanonicalEvent(event: CanonicalEvent, targetAsset: CanonicalAssetSymbol, targetTimeframe: Timeframe, asOf: string): CanonicalEvent {
  const result = tryEnrichCanonicalEvent(event, targetAsset, targetTimeframe, asOf);
  if ('value' in result) return result.value;
  throw new Error(result.message);
}

export function tryEnrichCanonicalEvent(event: unknown, targetAsset: CanonicalAssetSymbol, targetTimeframe: Timeframe, asOf: string): EnrichCanonicalEventResult {
  const validated = validateCanonicalEvent(event);
  if ('errors' in validated) {
    const firstError = validated.errors[0] ?? 'Invalid canonical event';
    const eventIdCandidate = (event as { id?: unknown })?.id;
    return {
      ok: false,
      message: firstError,
      fieldPath: firstError.includes(' ') ? (firstError.split(' ')[0] ?? null) : null,
      eventId: typeof eventIdCandidate === 'string' ? eventIdCandidate : null
    };
  }

  const sourceReliabilityScore = getEffectiveSourceReliabilityScore(validated.value);
  const dedupeKey = buildCanonicalEventDedupeKey(validated.value);

  const enrichedBase: CanonicalEvent = {
    ...validated.value,
    sourceReliabilityScore,
    dedupeKey
  };

  const enriched = computeEventRecencyAndRelevance(enrichedBase, targetAsset, targetTimeframe, asOf);
  return { ok: true, value: enriched };
}
