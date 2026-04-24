import type { ReasoningInputFrame } from '@elceo/types';
import { validateCanonicalCognitionState } from './cognition.schema';
import { validateCanonicalEvent, validateRankedEvidenceItem, TIMEFRAMES } from './event.schema';
import { validateZoneSignificance } from './zones.schema';
import { validateJournalInfluenceSummary } from './journal-influence.schema';
import {
  isBoolean,
  isEnumValue,
  isIsoDateString,
  isNonEmptyString,
  isObjectRecord,
  isStringArray,
  type SchemaValidationResult
} from './validation-utils';

const JOURNAL_INFLUENCE_FLAGS = ['none', 'weak', 'medium', 'strong'] as const;

export function validateReasoningInputFrame(input: unknown, pathPrefix = ''): SchemaValidationResult<ReasoningInputFrame> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}ReasoningInputFrame must be object`] };

  if (!isNonEmptyString(input.asset)) errors.push(`${pathPrefix}asset must be non-empty string`);
  if (!isEnumValue(input.timeframe, TIMEFRAMES)) errors.push(`${pathPrefix}timeframe is invalid`);
  if (!isIsoDateString(input.asOf)) errors.push(`${pathPrefix}asOf must be ISO date`);

  if (!Array.isArray(input.events)) {
    errors.push(`${pathPrefix}events must be array`);
  } else {
    input.events.forEach((event, index) => {
      const eventValidation = validateCanonicalEvent(event, `${pathPrefix}events[${index}].`);
      if (eventValidation.ok === false) errors.push(...eventValidation.errors);
    });
  }

  if (!Array.isArray(input.evidenceCandidates)) {
    errors.push(`${pathPrefix}evidenceCandidates must be array`);
  } else {
    input.evidenceCandidates.forEach((item, index) => {
      const validation = validateRankedEvidenceItem(item, `${pathPrefix}evidenceCandidates[${index}].`);
      if (validation.ok === false) errors.push(...validation.errors);
    });
  }

  if (!Array.isArray(input.zones)) {
    errors.push(`${pathPrefix}zones must be array`);
  } else {
    input.zones.forEach((zone, index) => {
      const validation = validateZoneSignificance(zone, `${pathPrefix}zones[${index}].`);
      if (validation.ok === false) errors.push(...validation.errors);
    });
  }

  if (typeof input.latestPrice !== 'number' || !Number.isFinite(input.latestPrice)) errors.push(`${pathPrefix}latestPrice must be finite number`);

  if (!isObjectRecord(input.recentPriceRange)) {
    errors.push(`${pathPrefix}recentPriceRange must be object`);
  } else {
    if (typeof input.recentPriceRange.high !== 'number') errors.push(`${pathPrefix}recentPriceRange.high must be number`);
    if (typeof input.recentPriceRange.low !== 'number') errors.push(`${pathPrefix}recentPriceRange.low must be number`);
    if (typeof input.recentPriceRange.close !== 'number') errors.push(`${pathPrefix}recentPriceRange.close must be number`);
  }

  if (!(input.priorCognition === null || validateCanonicalCognitionState(input.priorCognition).ok)) {
    errors.push(`${pathPrefix}priorCognition must be null or valid CanonicalCognitionState`);
  }

  if (!isObjectRecord(input.userJournalInfluence)) {
    errors.push(`${pathPrefix}userJournalInfluence must be object`);
  } else {
    if (!isBoolean(input.userJournalInfluence.enabled)) errors.push(`${pathPrefix}userJournalInfluence.enabled must be boolean`);
    if (!isEnumValue(input.userJournalInfluence.influenceFlag, JOURNAL_INFLUENCE_FLAGS)) {
      errors.push(`${pathPrefix}userJournalInfluence.influenceFlag is invalid`);
    }
    if (!isStringArray(input.userJournalInfluence.linkedEntryIds)) {
      errors.push(`${pathPrefix}userJournalInfluence.linkedEntryIds must be string[]`);
    }
    if (!(input.userJournalInfluence.summary === null || isObjectRecord(input.userJournalInfluence.summary))) {
      errors.push(`${pathPrefix}userJournalInfluence.summary must be object or null`);
    } else if (input.userJournalInfluence.summary !== null) {
      const summaryValidation = validateJournalInfluenceSummary(input.userJournalInfluence.summary, `${pathPrefix}userJournalInfluence.summary.`);
      if (summaryValidation.ok === false) errors.push(...summaryValidation.errors);
    }
  }

  if (!isObjectRecord(input.config)) {
    errors.push(`${pathPrefix}config must be object`);
  } else {
    if (!isNonEmptyString(input.config.scoringVersion)) errors.push(`${pathPrefix}config.scoringVersion must be non-empty string`);
    if (!isNonEmptyString(input.config.reasoningVersion)) errors.push(`${pathPrefix}config.reasoningVersion must be non-empty string`);
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as ReasoningInputFrame };
}
