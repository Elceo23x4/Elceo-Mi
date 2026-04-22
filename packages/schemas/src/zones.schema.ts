import type { InvalidationLevel, InvalidationState, InvalidationSide, InvalidationRiskLabel, ZoneSide, ZoneSignificance } from '@elceo/types';
import { TIMEFRAMES } from './event.schema';
import {
  isBoolean,
  isEnumValue,
  isIsoDateString,
  isNonEmptyString,
  isNullableIsoDateString,
  isObjectRecord,
  isScore0to100,
  isStringArray,
  type SchemaValidationResult
} from './validation-utils';

const ZONE_SIDES: ZoneSide[] = ['demand', 'supply', 'neutral'];
const INVALIDATION_SIDES: InvalidationSide[] = ['bullish_invalidation', 'bearish_invalidation', 'neutral_break'];
const INVALIDATION_RISK_LABELS: InvalidationRiskLabel[] = ['guarded', 'warning', 'fragile', 'broken'];

export function validateZoneSignificance(input: unknown, pathPrefix = ''): SchemaValidationResult<ZoneSignificance> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}ZoneSignificance must be object`] };

  if (!isNonEmptyString(input.zoneId)) errors.push(`${pathPrefix}zoneId must be non-empty string`);
  if (!isNonEmptyString(input.asset)) errors.push(`${pathPrefix}asset must be non-empty string`);
  if (!isEnumValue(input.timeframe, TIMEFRAMES)) errors.push(`${pathPrefix}timeframe is invalid`);
  if (!isEnumValue(input.side, ZONE_SIDES)) errors.push(`${pathPrefix}side is invalid`);

  const numericFields = ['lowerBound', 'upperBound', 'midpoint', 'derivedFromCandleCount'] as const;
  for (const field of numericFields) {
    if (typeof input[field] !== 'number' || !Number.isFinite(input[field])) errors.push(`${pathPrefix}${field} must be finite number`);
  }
  if (typeof input.touchCount !== 'number' || !Number.isInteger(input.touchCount) || input.touchCount < 0) {
    errors.push(`${pathPrefix}touchCount must be integer >= 0`);
  }

  const scoreFields = ['reactionMagnitudeScore', 'recencyScore', 'wickBodyRespectScore', 'multiTimeframeConfluenceScore', 'finalStrengthScore'] as const;
  for (const field of scoreFields) {
    if (!isScore0to100(input[field])) errors.push(`${pathPrefix}${field} must be in 0..100`);
  }

  if (!isNullableIsoDateString(input.lastInteractionAt)) errors.push(`${pathPrefix}lastInteractionAt must be ISO date or null`);
  if (!isStringArray(input.notes)) errors.push(`${pathPrefix}notes must be string[]`);
  if (!isNonEmptyString(input.componentsVersion)) errors.push(`${pathPrefix}componentsVersion must be non-empty string`);

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as ZoneSignificance };
}

export function validateInvalidationLevel(input: unknown, pathPrefix = ''): SchemaValidationResult<InvalidationLevel> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}InvalidationLevel must be object`] };

  const requiredStringFields = ['invalidationId', 'asset', 'reason'] as const;
  for (const field of requiredStringFields) {
    if (!isNonEmptyString(input[field])) errors.push(`${pathPrefix}${field} must be non-empty string`);
  }
  if (!isEnumValue(input.timeframe, TIMEFRAMES)) errors.push(`${pathPrefix}timeframe is invalid`);
  if (!isEnumValue(input.side, INVALIDATION_SIDES)) errors.push(`${pathPrefix}side is invalid`);
  if (typeof input.price !== 'number' || !Number.isFinite(input.price)) errors.push(`${pathPrefix}price must be finite number`);
  if (!isScore0to100(input.severityScore)) errors.push(`${pathPrefix}severityScore must be in 0..100`);

  if (!isStringArray(input.linkedEvidenceIds)) errors.push(`${pathPrefix}linkedEvidenceIds must be string[]`);
  if (!isStringArray(input.linkedZoneIds)) errors.push(`${pathPrefix}linkedZoneIds must be string[]`);
  if (!isStringArray(input.triggeredBy)) errors.push(`${pathPrefix}triggeredBy must be string[]`);
  if (!isBoolean(input.confirmed)) errors.push(`${pathPrefix}confirmed must be boolean`);
  if (!isNullableIsoDateString(input.confirmedAt)) errors.push(`${pathPrefix}confirmedAt must be ISO date or null`);

  if (input.confirmed === true && input.confirmedAt === null) {
    errors.push(`${pathPrefix}confirmedAt must be provided when confirmed is true`);
  }
  if (input.confirmed === false && input.confirmedAt !== null) {
    errors.push(`${pathPrefix}confirmedAt must be null when confirmed is false`);
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as InvalidationLevel };
}

export function validateInvalidationState(input: unknown, pathPrefix = ''): SchemaValidationResult<InvalidationState> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}InvalidationState must be object`] };

  if (!(input.primary === null || isObjectRecord(input.primary))) {
    errors.push(`${pathPrefix}primary must be object or null`);
  } else if (input.primary !== null) {
    const primaryValidation = validateInvalidationLevel(input.primary, `${pathPrefix}primary.`);
    if (primaryValidation.ok === false) errors.push(...primaryValidation.errors);
  }

  if (!Array.isArray(input.secondary)) {
    errors.push(`${pathPrefix}secondary must be array`);
  } else {
    input.secondary.forEach((entry, index) => {
      const validation = validateInvalidationLevel(entry, `${pathPrefix}secondary[${index}].`);
      if (validation.ok === false) errors.push(...validation.errors);
    });
  }

  if (!isNonEmptyString(input.summary)) errors.push(`${pathPrefix}summary must be non-empty string`);
  if (!isEnumValue(input.riskLabel, INVALIDATION_RISK_LABELS)) errors.push(`${pathPrefix}riskLabel is invalid`);

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as InvalidationState };
}
