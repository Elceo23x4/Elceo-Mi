import type {
  BiasState,
  CanonicalEvent,
  ContradictionAnatomy,
  ContradictionRegime,
  EventImpactLevel,
  EventStatus,
  EvidenceKind,
  FreshnessState,
  RankedEvidenceItem,
  SourceCategory,
  Timeframe
} from '@elceo/types';
import type { NormalizedProviderEvent } from './provider-normalized.schema';
import {
  isBoolean,
  isEnumValue,
  isIsoDateString,
  isNonEmptyString,
  isNullableIsoDateString,
  isObjectRecord,
  isScore0to100,
  isStringArray,
  validateRequiredFields,
  type SchemaValidationResult
} from './validation-utils';
import { validateCanonicalMarketCandleObservation } from './canonical-candle.schema';

export const SOURCE_CATEGORIES: SourceCategory[] = ['market_data', 'macro_calendar', 'news', 'geopolitics', 'macro_context', 'internal', 'user'];
export const EVIDENCE_KINDS: EvidenceKind[] = [
  'market_structure',
  'price_action',
  'macro_calendar',
  'macro_context',
  'news',
  'geopolitics',
  'sentiment',
  'volume',
  'volatility',
  'zone_reaction',
  'cross_asset',
  'journal_behavior',
  'system'
];
export const EVENT_STATUSES: EventStatus[] = ['scheduled', 'live', 'published', 'revised', 'stale', 'cancelled', 'resolved'];
export const EVENT_IMPACTS: EventImpactLevel[] = ['low', 'medium', 'high', 'critical'];
export const TIMEFRAMES: Timeframe[] = ['M5', 'M15', 'H1', 'H4', 'D1'];
export const BIAS_STATES: BiasState[] = ['bullish', 'bearish', 'neutral'];
export const CONTRADICTION_REGIMES: ContradictionRegime[] = ['none', 'low', 'moderate', 'high', 'critical'];

const EVIDENCE_DIRECTION_HINTS: Array<BiasState | 'mixed'> = ['bullish', 'bearish', 'neutral', 'mixed'];

export function validateCanonicalEvent(input: unknown, pathPrefix = ''): SchemaValidationResult<CanonicalEvent> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) {
    return { ok: false, errors: [`${pathPrefix}CanonicalEvent must be an object`] };
  }

  validateRequiredFields(
    input,
    ['id', 'sourceId', 'sourceName', 'title', 'summary', 'normalizedNarrative', 'occurredAt', 'detectedAt', 'dedupeKey'],
    errors,
    pathPrefix
  );

  if (!isEnumValue(input.sourceCategory, SOURCE_CATEGORIES)) errors.push(`${pathPrefix}sourceCategory is invalid`);
  if (!isEnumValue(input.eventKind, EVIDENCE_KINDS)) errors.push(`${pathPrefix}eventKind is invalid`);
  if (!isEnumValue(input.status, EVENT_STATUSES)) errors.push(`${pathPrefix}status is invalid`);
  if (!isEnumValue(input.impact, EVENT_IMPACTS)) errors.push(`${pathPrefix}impact is invalid`);

  if (!isIsoDateString(input.occurredAt)) errors.push(`${pathPrefix}occurredAt must be a valid ISO date`);
  if (!isIsoDateString(input.detectedAt)) errors.push(`${pathPrefix}detectedAt must be a valid ISO date`);
  if (!isNullableIsoDateString(input.effectiveUntil)) errors.push(`${pathPrefix}effectiveUntil must be ISO date or null`);

  if (!(input.region === null || isNonEmptyString(input.region))) errors.push(`${pathPrefix}region must be non-empty string or null`);
  if (!(input.country === null || isNonEmptyString(input.country))) errors.push(`${pathPrefix}country must be non-empty string or null`);
  if (!(input.currency === null || isNonEmptyString(input.currency))) errors.push(`${pathPrefix}currency must be non-empty string or null`);

  if (!isStringArray(input.relatedAssets)) errors.push(`${pathPrefix}relatedAssets must be string[]`);
  if (!Array.isArray(input.relatedTimeframes) || !input.relatedTimeframes.every((item) => isEnumValue(item, TIMEFRAMES))) {
    errors.push(`${pathPrefix}relatedTimeframes must be Timeframe[]`);
  }

  if (!isScore0to100(input.relevanceScore)) errors.push(`${pathPrefix}relevanceScore must be in 0..100`);
  if (!isScore0to100(input.sourceReliabilityScore)) errors.push(`${pathPrefix}sourceReliabilityScore must be in 0..100`);
  if (!isScore0to100(input.recencyScore)) errors.push(`${pathPrefix}recencyScore must be in 0..100`);

  if (typeof input.confirmationCount !== 'number' || !Number.isInteger(input.confirmationCount) || input.confirmationCount < 0) {
    errors.push(`${pathPrefix}confirmationCount must be an integer >= 0`);
  }

  if (!isStringArray(input.tags)) errors.push(`${pathPrefix}tags must be string[]`);
  if (input.observation !== undefined && input.observation !== null) {
    const observation = validateCanonicalMarketCandleObservation(input.observation);
    if (observation.ok === false) errors.push(...observation.errors.map((error) => `${pathPrefix}observation.${error}`));
  }
  if (!(input.rawUrl === null || isNonEmptyString(input.rawUrl))) errors.push(`${pathPrefix}rawUrl must be non-empty string or null`);
  if (!(input.revisionOfEventId === null || isNonEmptyString(input.revisionOfEventId))) errors.push(`${pathPrefix}revisionOfEventId must be non-empty string or null`);
  if (!isBoolean(input.stale)) errors.push(`${pathPrefix}stale must be boolean`);
  if (typeof input.freshnessHours !== 'number' || !Number.isFinite(input.freshnessHours) || input.freshnessHours < 0) {
    errors.push(`${pathPrefix}freshnessHours must be a number >= 0`);
  }

  if (!isObjectRecord(input.attribution)) {
    errors.push(`${pathPrefix}attribution must be an object`);
  } else {
    if (!isNonEmptyString(input.attribution.provider)) errors.push(`${pathPrefix}attribution.provider must be non-empty string`);
    if (!(input.attribution.publisher === null || isNonEmptyString(input.attribution.publisher))) {
      errors.push(`${pathPrefix}attribution.publisher must be non-empty string or null`);
    }
    if (!(input.attribution.author === null || isNonEmptyString(input.attribution.author))) {
      errors.push(`${pathPrefix}attribution.author must be non-empty string or null`);
    }
  }

  if (!isObjectRecord(input.audit)) {
    errors.push(`${pathPrefix}audit must be an object`);
  } else {
    validateRequiredFields(input.audit, ['normalizedBy', 'normalizationVersion', 'ingestedVia'], errors, `${pathPrefix}audit.`);
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as CanonicalEvent };
}

export function validateRankedEvidenceItem(input: unknown, pathPrefix = ''): SchemaValidationResult<RankedEvidenceItem> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}RankedEvidenceItem must be an object`] };

  validateRequiredFields(input, ['evidenceId', 'label', 'explanation', 'asset', 'occurredAt'], errors, pathPrefix);

  if (!(input.eventId === null || isNonEmptyString(input.eventId))) errors.push(`${pathPrefix}eventId must be non-empty string or null`);
  if (!isEnumValue(input.kind, EVIDENCE_KINDS)) errors.push(`${pathPrefix}kind is invalid`);
  if (!isEnumValue(input.timeframe, TIMEFRAMES)) errors.push(`${pathPrefix}timeframe is invalid`);
  if (!isEnumValue(input.directionHint, EVIDENCE_DIRECTION_HINTS)) errors.push(`${pathPrefix}directionHint is invalid`);

  const scoreFields = [
    'impactScore',
    'recencyScore',
    'sourceReliabilityScore',
    'priceProximityScore',
    'confirmationScore',
    'contradictionContributionScore',
    'confidenceContributionScore',
    'finalRankScore'
  ] as const;
  for (const scoreField of scoreFields) {
    if (!isScore0to100(input[scoreField])) errors.push(`${pathPrefix}${scoreField} must be in 0..100`);
  }

  if (!isStringArray(input.linkedZoneIds)) errors.push(`${pathPrefix}linkedZoneIds must be string[]`);
  if (!Array.isArray(input.linkedPriceLevels) || !input.linkedPriceLevels.every((item) => typeof item === 'number' && Number.isFinite(item))) {
    errors.push(`${pathPrefix}linkedPriceLevels must be number[]`);
  }
  if (!isStringArray(input.linkedCandleTimes) || !input.linkedCandleTimes.every((value) => isIsoDateString(value))) {
    errors.push(`${pathPrefix}linkedCandleTimes must be ISO string[]`);
  }
  if (!isStringArray(input.linkedNotes)) errors.push(`${pathPrefix}linkedNotes must be string[]`);
  if (!isBoolean(input.stale)) errors.push(`${pathPrefix}stale must be boolean`);
  if (!isIsoDateString(input.occurredAt)) errors.push(`${pathPrefix}occurredAt must be ISO date`);
  if (!isStringArray(input.tags)) errors.push(`${pathPrefix}tags must be string[]`);

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as RankedEvidenceItem };
}

export function validateContradictionAnatomy(input: unknown, pathPrefix = ''): SchemaValidationResult<ContradictionAnatomy> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}ContradictionAnatomy must be object`] };

  const componentFields = ['narrativeConflict', 'priceConflict', 'eventConflict', 'macroConflict', 'timeframeConflict', 'weightedScore'] as const;
  for (const field of componentFields) {
    if (!isScore0to100(input[field])) errors.push(`${pathPrefix}${field} must be in 0..100`);
  }
  if (!isEnumValue(input.regime, CONTRADICTION_REGIMES)) errors.push(`${pathPrefix}regime is invalid`);
  if (!isNonEmptyString(input.componentsVersion)) errors.push(`${pathPrefix}componentsVersion must be non-empty string`);

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as ContradictionAnatomy };
}

export function validateFreshnessState(input: unknown, pathPrefix = ''): SchemaValidationResult<FreshnessState> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}FreshnessState must be object`] };

  if (!isScore0to100(input.freshnessScore)) errors.push(`${pathPrefix}freshnessScore must be in 0..100`);
  if (typeof input.hoursSinceLastMaterialUpdate !== 'number' || input.hoursSinceLastMaterialUpdate < 0) {
    errors.push(`${pathPrefix}hoursSinceLastMaterialUpdate must be >= 0`);
  }
  if (!isIsoDateString(input.lastMaterialUpdateAt)) errors.push(`${pathPrefix}lastMaterialUpdateAt must be ISO date`);
  if (typeof input.decayRatePerHour !== 'number' || input.decayRatePerHour < 0) errors.push(`${pathPrefix}decayRatePerHour must be >= 0`);
  if (!isBoolean(input.stale)) errors.push(`${pathPrefix}stale must be boolean`);
  if (typeof input.staleThresholdHours !== 'number' || input.staleThresholdHours < 0) errors.push(`${pathPrefix}staleThresholdHours must be >= 0`);
  if (!isNonEmptyString(input.componentsVersion)) errors.push(`${pathPrefix}componentsVersion must be non-empty string`);

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as FreshnessState };
}

/**
 * @deprecated Legacy compatibility type. New code must use CanonicalEvent.
 */
export type InternalNormalizedEvent = {
  eventId: string;
  eventType: NormalizedProviderEvent['type'];
  sourceProvider: string;
  occurredAtUtc: string;
  dedupeKey: string;
  payload: NormalizedProviderEvent;
};
