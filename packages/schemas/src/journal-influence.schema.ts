import type {
  JournalBehaviorPattern,
  JournalDirectionPattern,
  JournalInfluenceCaseEvidence,
  JournalInfluenceSnapshot,
  JournalInfluenceSummary,
  JournalSetupPattern
} from '@elceo/types';
import { TIMEFRAMES } from './event.schema';
import { JOURNAL_EXECUTION_QUALITY_LABELS, JOURNAL_OUTCOME_LABELS, JOURNAL_SUBJECT_KINDS, TRADE_DIRECTIONS } from './journal.schema';
import {
  isEnumValue,
  isFiniteNumber,
  isIsoDateString,
  isNonEmptyString,
  isObjectRecord,
  isScore0to100,
  isStringArray,
  type SchemaValidationResult
} from './validation-utils';

function validateNullableAverage(value: unknown, sampleCount: number, field: string, errors: string[], pathPrefix: string): void {
  if (value === null) {
    if (sampleCount > 0) errors.push(`${pathPrefix}${field} must be finite number when sampleCount > 0`);
    return;
  }
  if (!isFiniteNumber(value)) errors.push(`${pathPrefix}${field} must be finite number or null`);
}

function validateScore(value: unknown, field: string, errors: string[], pathPrefix: string): void {
  if (!isScore0to100(value)) errors.push(`${pathPrefix}${field} must be score between 0 and 100`);
}

function validateCount(value: unknown, field: string, errors: string[], pathPrefix: string): void {
  if (!(Number.isInteger(value) && (value as number) >= 0)) errors.push(`${pathPrefix}${field} must be integer >= 0`);
}

function validateUniqueStringArray(value: unknown, field: string, errors: string[], pathPrefix: string): void {
  if (!isStringArray(value)) {
    errors.push(`${pathPrefix}${field} must be string[]`);
    return;
  }
  const seen = new Set<string>();
  value.forEach((item, index) => {
    if (seen.has(item)) errors.push(`${pathPrefix}${field}[${index}] must be unique`);
    seen.add(item);
  });
}

export function validateJournalInfluenceCaseEvidence(input: unknown, pathPrefix = ''): SchemaValidationResult<JournalInfluenceCaseEvidence> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}JournalInfluenceCaseEvidence must be object`] };

  if (!isNonEmptyString(input.caseId)) errors.push(`${pathPrefix}caseId must be non-empty string`);
  if (!isNonEmptyString(input.asset)) errors.push(`${pathPrefix}asset must be non-empty string`);
  if (!isEnumValue(input.timeframe, TIMEFRAMES)) errors.push(`${pathPrefix}timeframe is invalid`);
  if (!isEnumValue(input.direction, TRADE_DIRECTIONS)) errors.push(`${pathPrefix}direction is invalid`);
  if (!isNonEmptyString(input.setupType)) errors.push(`${pathPrefix}setupType must be non-empty string`);
  if (!isEnumValue(input.outcome, JOURNAL_OUTCOME_LABELS)) errors.push(`${pathPrefix}outcome is invalid`);
  if (!(input.executionQuality === null || isEnumValue(input.executionQuality, JOURNAL_EXECUTION_QUALITY_LABELS))) {
    errors.push(`${pathPrefix}executionQuality is invalid`);
  }
  if (!(input.reviewedAt === null || isIsoDateString(input.reviewedAt))) errors.push(`${pathPrefix}reviewedAt must be ISO date string or null`);
  if (!(input.closedAt === null || isIsoDateString(input.closedAt))) errors.push(`${pathPrefix}closedAt must be ISO date string or null`);
  if (!(input.pnlPercent === null || isFiniteNumber(input.pnlPercent))) errors.push(`${pathPrefix}pnlPercent must be finite number or null`);
  if (!(input.rMultiple === null || isFiniteNumber(input.rMultiple))) errors.push(`${pathPrefix}rMultiple must be finite number or null`);
  if (!isStringArray(input.behaviorTags)) errors.push(`${pathPrefix}behaviorTags must be string[]`);
  if (!isStringArray(input.lessons)) errors.push(`${pathPrefix}lessons must be string[]`);
  if (!isFiniteNumber(input.recencyWeight) || input.recencyWeight <= 0 || input.recencyWeight > 1) {
    errors.push(`${pathPrefix}recencyWeight must be finite number > 0 and <= 1`);
  }

  return errors.length ? { ok: false, errors } : { ok: true, value: input as JournalInfluenceCaseEvidence };
}

export function validateJournalSetupPattern(input: unknown, pathPrefix = ''): SchemaValidationResult<JournalSetupPattern> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}JournalSetupPattern must be object`] };
  if (!isNonEmptyString(input.setupType)) errors.push(`${pathPrefix}setupType must be non-empty string`);
  validateCount(input.sampleCount, 'sampleCount', errors, pathPrefix);
  validateCount(input.winCount, 'winCount', errors, pathPrefix);
  validateCount(input.lossCount, 'lossCount', errors, pathPrefix);
  validateCount(input.breakevenCount, 'breakevenCount', errors, pathPrefix);
  validateCount(input.mixedCount, 'mixedCount', errors, pathPrefix);
  const sampleCount = Number.isInteger(input.sampleCount) ? Number(input.sampleCount) : 0;
  validateNullableAverage(input.avgRMultiple, sampleCount, 'avgRMultiple', errors, pathPrefix);
  validateNullableAverage(input.avgPnlPercent, sampleCount, 'avgPnlPercent', errors, pathPrefix);
  if (!isObjectRecord(input.executionQualityBreakdown)) {
    errors.push(`${pathPrefix}executionQualityBreakdown must be object record`);
  } else {
    for (const [key, value] of Object.entries(input.executionQualityBreakdown)) {
      if (!isNonEmptyString(key)) errors.push(`${pathPrefix}executionQualityBreakdown keys must be non-empty string`);
      const numericValue = typeof value === 'number' ? value : Number.NaN;
      if (!(Number.isInteger(numericValue) && numericValue >= 0)) errors.push(`${pathPrefix}executionQualityBreakdown.${key} must be integer >= 0`);
    }
  }
  validateScore(input.influenceScore, 'influenceScore', errors, pathPrefix);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as JournalSetupPattern };
}

export function validateJournalBehaviorPattern(input: unknown, pathPrefix = ''): SchemaValidationResult<JournalBehaviorPattern> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}JournalBehaviorPattern must be object`] };
  if (!isNonEmptyString(input.behaviorTag)) errors.push(`${pathPrefix}behaviorTag must be non-empty string`);
  validateCount(input.sampleCount, 'sampleCount', errors, pathPrefix);
  validateScore(input.negativeAssociationScore, 'negativeAssociationScore', errors, pathPrefix);
  validateScore(input.positiveAssociationScore, 'positiveAssociationScore', errors, pathPrefix);
  validateScore(input.influenceScore, 'influenceScore', errors, pathPrefix);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as JournalBehaviorPattern };
}

export function validateJournalDirectionPattern(input: unknown, pathPrefix = ''): SchemaValidationResult<JournalDirectionPattern> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}JournalDirectionPattern must be object`] };
  if (!isEnumValue(input.direction, TRADE_DIRECTIONS)) errors.push(`${pathPrefix}direction is invalid`);
  validateCount(input.sampleCount, 'sampleCount', errors, pathPrefix);
  const sampleCount = Number.isInteger(input.sampleCount) ? Number(input.sampleCount) : 0;
  validateNullableAverage(input.avgRMultiple, sampleCount, 'avgRMultiple', errors, pathPrefix);
  validateNullableAverage(input.avgPnlPercent, sampleCount, 'avgPnlPercent', errors, pathPrefix);
  const winRateValue = input.winRate;
  if (!(winRateValue === null || isFiniteNumber(winRateValue))) errors.push(`${pathPrefix}winRate must be finite number or null`);
  if (sampleCount === 0 && winRateValue !== null) errors.push(`${pathPrefix}winRate must be null when sampleCount is 0`);
  if (sampleCount > 0 && isFiniteNumber(winRateValue) && (winRateValue < 0 || winRateValue > 1)) {
    errors.push(`${pathPrefix}winRate must be between 0 and 1`);
  }
  validateScore(input.influenceScore, 'influenceScore', errors, pathPrefix);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as JournalDirectionPattern };
}

export function validateJournalInfluenceSummary(input: unknown, pathPrefix = ''): SchemaValidationResult<JournalInfluenceSummary> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}JournalInfluenceSummary must be object`] };

  if (!isEnumValue(input.subjectKind, JOURNAL_SUBJECT_KINDS)) errors.push(`${pathPrefix}subjectKind is invalid`);
  if (!isNonEmptyString(input.subjectId)) errors.push(`${pathPrefix}subjectId must be non-empty string`);
  if (!(input.asset === '*' || isNonEmptyString(input.asset))) errors.push(`${pathPrefix}asset must be non-empty string or '*'`);
  if (!(input.timeframe === '*' || isEnumValue(input.timeframe, TIMEFRAMES))) errors.push(`${pathPrefix}timeframe must be valid timeframe or '*'`);
  if (!isIsoDateString(input.generatedAt)) errors.push(`${pathPrefix}generatedAt must be ISO date string`);
  validateCount(input.reviewedCaseCount, 'reviewedCaseCount', errors, pathPrefix);
  validateCount(input.closedCaseCount, 'closedCaseCount', errors, pathPrefix);
  validateCount(input.recentCaseCount, 'recentCaseCount', errors, pathPrefix);

  if (!Array.isArray(input.setupPatterns)) {
    errors.push(`${pathPrefix}setupPatterns must be array`);
  } else {
    input.setupPatterns.forEach((item, index) => {
      const validated = validateJournalSetupPattern(item, `${pathPrefix}setupPatterns[${index}].`);
      if (validated.ok === false) errors.push(...validated.errors);
    });
  }

  if (!Array.isArray(input.behaviorPatterns)) {
    errors.push(`${pathPrefix}behaviorPatterns must be array`);
  } else {
    input.behaviorPatterns.forEach((item, index) => {
      const validated = validateJournalBehaviorPattern(item, `${pathPrefix}behaviorPatterns[${index}].`);
      if (validated.ok === false) errors.push(...validated.errors);
    });
  }

  if (!Array.isArray(input.directionPatterns)) {
    errors.push(`${pathPrefix}directionPatterns must be array`);
  } else {
    input.directionPatterns.forEach((item, index) => {
      const validated = validateJournalDirectionPattern(item, `${pathPrefix}directionPatterns[${index}].`);
      if (validated.ok === false) errors.push(...validated.errors);
    });
  }

  if (!isStringArray(input.repeatedMistakes)) errors.push(`${pathPrefix}repeatedMistakes must be string[]`);
  if (!isStringArray(input.repeatedStrengths)) errors.push(`${pathPrefix}repeatedStrengths must be string[]`);
  if (!isStringArray(input.cautionNotes)) errors.push(`${pathPrefix}cautionNotes must be string[]`);
  if (!isStringArray(input.confidenceBoostNotes)) errors.push(`${pathPrefix}confidenceBoostNotes must be string[]`);
  validateUniqueStringArray(input.supportingCaseIds, 'supportingCaseIds', errors, pathPrefix);

  return errors.length ? { ok: false, errors } : { ok: true, value: input as JournalInfluenceSummary };
}

export function validateJournalInfluenceSnapshot(input: unknown, pathPrefix = ''): SchemaValidationResult<JournalInfluenceSnapshot> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}JournalInfluenceSnapshot must be object`] };
  if (!isNonEmptyString(input.snapshotId)) errors.push(`${pathPrefix}snapshotId must be non-empty string`);
  if (!isIsoDateString(input.createdAt)) errors.push(`${pathPrefix}createdAt must be ISO date string`);
  const summaryValidated = validateJournalInfluenceSummary(input.summary, `${pathPrefix}summary.`);
  if (summaryValidated.ok === false) errors.push(...summaryValidated.errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as JournalInfluenceSnapshot };
}
