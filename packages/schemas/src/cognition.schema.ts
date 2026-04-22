import type { CanonicalCognitionState, ConfidenceAnatomy } from '@elceo/types';
import {
  validateContradictionAnatomy,
  validateFreshnessState,
  validateRankedEvidenceItem,
  validateCanonicalEvent,
  BIAS_STATES,
  CONTRADICTION_REGIMES,
  TIMEFRAMES
} from './event.schema';
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
import { validateInvalidationState, validateZoneSignificance } from './zones.schema';

export function validateConfidenceAnatomy(input: unknown, pathPrefix = ''): SchemaValidationResult<ConfidenceAnatomy> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}ConfidenceAnatomy must be object`] };

  const scoreFields = ['sourceIntegrity', 'eventAlignment', 'priceAcceptance', 'contradictionPenalty', 'stalenessPenalty', 'weightedScore'] as const;
  for (const field of scoreFields) {
    if (!isScore0to100(input[field])) errors.push(`${pathPrefix}${field} must be in 0..100`);
  }
  if (!isNonEmptyString(input.componentsVersion)) errors.push(`${pathPrefix}componentsVersion must be non-empty string`);

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as ConfidenceAnatomy };
}

export function validateCanonicalCognitionState(input: unknown, pathPrefix = ''): SchemaValidationResult<CanonicalCognitionState> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}CanonicalCognitionState must be an object`] };

  validateRequiredFields(input, ['cognitionId', 'asset', 'evaluatedAt', 'biasLabel', 'thesis', 'narrativeSummary'], errors, pathPrefix);

  if (!isEnumValue(input.timeframe, TIMEFRAMES)) errors.push(`${pathPrefix}timeframe is invalid`);
  if (!isEnumValue(input.bias, BIAS_STATES)) errors.push(`${pathPrefix}bias is invalid`);
  if (!isIsoDateString(input.evaluatedAt)) errors.push(`${pathPrefix}evaluatedAt must be ISO date`);
  if (!isNullableIsoDateString(input.evaluationWindowStart)) errors.push(`${pathPrefix}evaluationWindowStart must be ISO date or null`);
  if (!isNullableIsoDateString(input.evaluationWindowEnd)) errors.push(`${pathPrefix}evaluationWindowEnd must be ISO date or null`);

  if (!isObjectRecord(input.confidence)) {
    errors.push(`${pathPrefix}confidence must be object`);
  } else {
    if (!isScore0to100(input.confidence.score)) errors.push(`${pathPrefix}confidence.score must be in 0..100`);
    const confidenceAnatomy = validateConfidenceAnatomy(input.confidence.anatomy, `${pathPrefix}confidence.anatomy.`);
    if (confidenceAnatomy.ok === false) errors.push(...confidenceAnatomy.errors);
  }

  if (!isObjectRecord(input.contradiction)) {
    errors.push(`${pathPrefix}contradiction must be object`);
  } else {
    if (!isScore0to100(input.contradiction.score)) errors.push(`${pathPrefix}contradiction.score must be in 0..100`);
    if (!isEnumValue(input.contradiction.regime, CONTRADICTION_REGIMES)) errors.push(`${pathPrefix}contradiction.regime is invalid`);
    if (!isNonEmptyString(input.contradiction.summary)) errors.push(`${pathPrefix}contradiction.summary must be non-empty string`);

    const contradictionAnatomy = validateContradictionAnatomy(input.contradiction.anatomy, `${pathPrefix}contradiction.anatomy.`);
    if (contradictionAnatomy.ok === false) errors.push(...contradictionAnatomy.errors);
  }

  const freshness = validateFreshnessState(input.freshness, `${pathPrefix}freshness.`);
  if (freshness.ok === false) errors.push(...freshness.errors);

  const invalidation = validateInvalidationState(input.invalidation, `${pathPrefix}invalidation.`);
  if (invalidation.ok === false) errors.push(...invalidation.errors);

  if (!isObjectRecord(input.evidence)) {
    errors.push(`${pathPrefix}evidence must be object`);
  } else {
    if (!Array.isArray(input.evidence.ranked)) {
      errors.push(`${pathPrefix}evidence.ranked must be array`);
    } else {
      input.evidence.ranked.forEach((item, index) => {
        const validated = validateRankedEvidenceItem(item, `${pathPrefix}evidence.ranked[${index}].`);
        if (validated.ok === false) errors.push(...validated.errors);
      });
    }
    if (!isStringArray(input.evidence.topEvidenceIds)) errors.push(`${pathPrefix}evidence.topEvidenceIds must be string[]`);
    if (typeof input.evidence.evidenceCount !== 'number' || input.evidence.evidenceCount < 0) {
      errors.push(`${pathPrefix}evidence.evidenceCount must be >= 0`);
    }
  }

  if (!isObjectRecord(input.zones)) {
    errors.push(`${pathPrefix}zones must be object`);
  } else {
    if (!Array.isArray(input.zones.primary)) {
      errors.push(`${pathPrefix}zones.primary must be array`);
    } else {
      input.zones.primary.forEach((zone, index) => {
        const validated = validateZoneSignificance(zone, `${pathPrefix}zones.primary[${index}].`);
        if (validated.ok === false) errors.push(...validated.errors);
      });
    }
    if (!Array.isArray(input.zones.secondary)) {
      errors.push(`${pathPrefix}zones.secondary must be array`);
    } else {
      input.zones.secondary.forEach((zone, index) => {
        const validated = validateZoneSignificance(zone, `${pathPrefix}zones.secondary[${index}].`);
        if (validated.ok === false) errors.push(...validated.errors);
      });
    }
    if (!isStringArray(input.zones.activeZoneIds)) errors.push(`${pathPrefix}zones.activeZoneIds must be string[]`);
  }

  if (!isObjectRecord(input.explanation)) {
    errors.push(`${pathPrefix}explanation must be object`);
  } else {
    validateRequiredFields(input.explanation, ['concise', 'expanded'], errors, `${pathPrefix}explanation.`);
    const explanationArrayFields = ['bulletReasons', 'supportingReasons', 'contradictoryReasons', 'whatWouldChangeState'] as const;
    for (const field of explanationArrayFields) {
      if (!isStringArray(input.explanation[field])) errors.push(`${pathPrefix}explanation.${field} must be string[]`);
    }
  }

  if (!isObjectRecord(input.supportEvents)) {
    errors.push(`${pathPrefix}supportEvents must be object`);
  } else {
    const supportArrayFields = ['linkedEventIds', 'macroEventIds', 'newsEventIds', 'geopoliticsEventIds'] as const;
    for (const field of supportArrayFields) {
      if (!isStringArray(input.supportEvents[field])) errors.push(`${pathPrefix}supportEvents.${field} must be string[]`);
    }
    if (typeof input.supportEvents.catalystCount !== 'number' || input.supportEvents.catalystCount < 0) {
      errors.push(`${pathPrefix}supportEvents.catalystCount must be >= 0`);
    }
  }

  if (!isObjectRecord(input.chartProjection)) {
    errors.push(`${pathPrefix}chartProjection must be object`);
  } else {
    if (!isStringArray(input.chartProjection.annotationIds)) errors.push(`${pathPrefix}chartProjection.annotationIds must be string[]`);
    if (!isStringArray(input.chartProjection.markerLabels)) errors.push(`${pathPrefix}chartProjection.markerLabels must be string[]`);
    if (!Array.isArray(input.chartProjection.emphasisPriceLevels) || !input.chartProjection.emphasisPriceLevels.every((item) => typeof item === 'number')) {
      errors.push(`${pathPrefix}chartProjection.emphasisPriceLevels must be number[]`);
    }
    if (!isBoolean(input.chartProjection.contradictionMarkerVisible)) errors.push(`${pathPrefix}chartProjection.contradictionMarkerVisible must be boolean`);
  }

  if (!isObjectRecord(input.audit)) {
    errors.push(`${pathPrefix}audit must be object`);
  } else {
    validateRequiredFields(input.audit, ['reasoningVersion', 'scoringVersion', 'evaluatedBy', 'dataCutoffAt'], errors, `${pathPrefix}audit.`);
    if (!isIsoDateString(input.audit.dataCutoffAt)) errors.push(`${pathPrefix}audit.dataCutoffAt must be ISO date`);
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as CanonicalCognitionState };
}

export function validateEventCollection(events: unknown[]): SchemaValidationResult<true> {
  const errors: string[] = [];
  events.forEach((event, idx) => {
    const result = validateCanonicalEvent(event, `events[${idx}].`);
    if (result.ok === false) errors.push(...result.errors);
  });
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: true };
}
