import type {
  AnalyticsSnapshot,
  AnalyticsSnapshotSummary,
  AnalyticsWindow,
  BehaviorAnalyticsPattern,
  DirectionPerformancePattern,
  ExecutionQualitySummary,
  PerformanceTotals,
  PlanAdherenceSummary,
  ReasoningLinkSummary,
  ReviewInsightSummary,
  SetupPerformancePattern
} from '@elceo/types';
import { TIMEFRAMES } from './event.schema';
import { TRADE_DIRECTIONS } from './journal.schema';
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

function isValidScope(value: unknown): boolean {
  return value === '*' || isNonEmptyString(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function validateRate(value: unknown, field: string, errors: string[], pathPrefix: string): void {
  if (value === null) return;
  if (!isFiniteNumber(value) || value < 0 || value > 1) errors.push(`${pathPrefix}${field} must be between 0 and 1 or null`);
}

function validateNullableNumber(value: unknown, field: string, errors: string[], pathPrefix: string): void {
  if (value === null) return;
  if (!isFiniteNumber(value)) errors.push(`${pathPrefix}${field} must be finite number or null`);
}

function validateStringArray(value: unknown, field: string, errors: string[], pathPrefix: string): void {
  if (!isStringArray(value)) errors.push(`${pathPrefix}${field} must be string[]`);
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

export function validateAnalyticsWindow(input: unknown, pathPrefix = ''): SchemaValidationResult<AnalyticsWindow> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}AnalyticsWindow must be object`] };
  if (!(input.subjectKind === 'user' || input.subjectKind === 'workspace' || input.subjectKind === 'ops')) errors.push(`${pathPrefix}subjectKind is invalid`);
  if (!isNonEmptyString(input.subjectId)) errors.push(`${pathPrefix}subjectId must be non-empty string`);
  if (!isValidScope(input.assetScope)) errors.push(`${pathPrefix}assetScope must be non-empty string or '*'`);
  if (!(input.timeframeScope === '*' || isEnumValue(input.timeframeScope, TIMEFRAMES))) errors.push(`${pathPrefix}timeframeScope must be valid timeframe or '*'`);
  if (!isNonNegativeInteger(input.lookbackDays)) errors.push(`${pathPrefix}lookbackDays must be integer >= 0`);
  if (!isIsoDateString(input.generatedAt)) errors.push(`${pathPrefix}generatedAt must be ISO date string`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as AnalyticsWindow };
}

export function validatePerformanceTotals(input: unknown, pathPrefix = ''): SchemaValidationResult<PerformanceTotals> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}PerformanceTotals must be object`] };
  for (const key of ['closedCaseCount', 'reviewedCaseCount', 'winCount', 'lossCount', 'breakevenCount', 'mixedCount', 'openCount', 'linkedReasoningCount', 'linkedDriftCount'] as const) {
    if (!isNonNegativeInteger(input[key])) errors.push(`${pathPrefix}${key} must be integer >= 0`);
  }
  validateNullableNumber(input.avgRMultiple, 'avgRMultiple', errors, pathPrefix);
  validateNullableNumber(input.avgPnlPercent, 'avgPnlPercent', errors, pathPrefix);
  validateNullableNumber(input.medianRMultiple, 'medianRMultiple', errors, pathPrefix);
  validateNullableNumber(input.medianPnlPercent, 'medianPnlPercent', errors, pathPrefix);
  validateRate(input.winRate, 'winRate', errors, pathPrefix);
  validateRate(input.lossRate, 'lossRate', errors, pathPrefix);
  validateNullableNumber(input.expectancyR, 'expectancyR', errors, pathPrefix);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as PerformanceTotals };
}

export function validateSetupPerformancePattern(input: unknown, pathPrefix = ''): SchemaValidationResult<SetupPerformancePattern> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}SetupPerformancePattern must be object`] };
  if (!isNonEmptyString(input.setupType)) errors.push(`${pathPrefix}setupType must be non-empty string`);
  for (const key of ['sampleCount', 'winCount', 'lossCount', 'breakevenCount', 'mixedCount'] as const) {
    if (!isNonNegativeInteger(input[key])) errors.push(`${pathPrefix}${key} must be integer >= 0`);
  }
  validateNullableNumber(input.avgRMultiple, 'avgRMultiple', errors, pathPrefix);
  validateNullableNumber(input.avgPnlPercent, 'avgPnlPercent', errors, pathPrefix);
  validateRate(input.winRate, 'winRate', errors, pathPrefix);
  validateNullableNumber(input.expectancyR, 'expectancyR', errors, pathPrefix);
  if (!isScore0to100(input.disciplineScore)) errors.push(`${pathPrefix}disciplineScore must be 0..100`);
  if (!isScore0to100(input.performanceScore)) errors.push(`${pathPrefix}performanceScore must be 0..100`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as SetupPerformancePattern };
}

export function validateDirectionPerformancePattern(input: unknown, pathPrefix = ''): SchemaValidationResult<DirectionPerformancePattern> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}DirectionPerformancePattern must be object`] };
  if (!isEnumValue(input.direction, TRADE_DIRECTIONS)) errors.push(`${pathPrefix}direction is invalid`);
  if (!isNonNegativeInteger(input.sampleCount)) errors.push(`${pathPrefix}sampleCount must be integer >= 0`);
  validateNullableNumber(input.avgRMultiple, 'avgRMultiple', errors, pathPrefix);
  validateNullableNumber(input.avgPnlPercent, 'avgPnlPercent', errors, pathPrefix);
  validateRate(input.winRate, 'winRate', errors, pathPrefix);
  if (!isScore0to100(input.performanceScore)) errors.push(`${pathPrefix}performanceScore must be 0..100`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as DirectionPerformancePattern };
}

export function validateExecutionQualitySummary(input: unknown, pathPrefix = ''): SchemaValidationResult<ExecutionQualitySummary> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}ExecutionQualitySummary must be object`] };
  for (const key of ['disciplinedCount', 'acceptableCount', 'weakCount', 'impulsiveCount', 'missingQualityCount'] as const) {
    if (!isNonNegativeInteger(input[key])) errors.push(`${pathPrefix}${key} must be integer >= 0`);
  }
  if (!isScore0to100(input.disciplineScore)) errors.push(`${pathPrefix}disciplineScore must be 0..100`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as ExecutionQualitySummary };
}

export function validatePlanAdherenceSummary(input: unknown, pathPrefix = ''): SchemaValidationResult<PlanAdherenceSummary> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}PlanAdherenceSummary must be object`] };
  if (!isNonNegativeInteger(input.comparableEntryCount)) errors.push(`${pathPrefix}comparableEntryCount must be integer >= 0`);
  validateNullableNumber(input.avgEntryDeviationPercent, 'avgEntryDeviationPercent', errors, pathPrefix);
  validateNullableNumber(input.maxEntryDeviationPercent, 'maxEntryDeviationPercent', errors, pathPrefix);
  if (!(input.adherenceScore === null || isScore0to100(input.adherenceScore))) errors.push(`${pathPrefix}adherenceScore must be 0..100 or null`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as PlanAdherenceSummary };
}

export function validateBehaviorAnalyticsPattern(input: unknown, pathPrefix = ''): SchemaValidationResult<BehaviorAnalyticsPattern> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}BehaviorAnalyticsPattern must be object`] };
  if (!isNonEmptyString(input.behaviorTag)) errors.push(`${pathPrefix}behaviorTag must be non-empty string`);
  if (!isNonNegativeInteger(input.sampleCount)) errors.push(`${pathPrefix}sampleCount must be integer >= 0`);
  for (const key of ['winAssociationScore', 'lossAssociationScore', 'impulsiveAssociationScore', 'importanceScore'] as const) {
    if (!isScore0to100(input[key])) errors.push(`${pathPrefix}${key} must be 0..100`);
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: input as BehaviorAnalyticsPattern };
}

export function validateReviewInsightSummary(input: unknown, pathPrefix = ''): SchemaValidationResult<ReviewInsightSummary> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}ReviewInsightSummary must be object`] };
  validateStringArray(input.repeatedMistakes, 'repeatedMistakes', errors, pathPrefix);
  validateStringArray(input.repeatedStrengths, 'repeatedStrengths', errors, pathPrefix);
  validateStringArray(input.cautionNotes, 'cautionNotes', errors, pathPrefix);
  validateStringArray(input.confidenceNotes, 'confidenceNotes', errors, pathPrefix);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as ReviewInsightSummary };
}

export function validateReasoningLinkSummary(input: unknown, pathPrefix = ''): SchemaValidationResult<ReasoningLinkSummary> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}ReasoningLinkSummary must be object`] };
  if (!isNonNegativeInteger(input.linkedCaseCount)) errors.push(`${pathPrefix}linkedCaseCount must be integer >= 0`);
  validateRate(input.linkedWinRate, 'linkedWinRate', errors, pathPrefix);
  validateNullableNumber(input.linkedAvgRMultiple, 'linkedAvgRMultiple', errors, pathPrefix);
  validateNullableNumber(input.linkedAvgPnlPercent, 'linkedAvgPnlPercent', errors, pathPrefix);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as ReasoningLinkSummary };
}

export function validateAnalyticsSnapshotSummary(input: unknown, pathPrefix = ''): SchemaValidationResult<AnalyticsSnapshotSummary> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}AnalyticsSnapshotSummary must be object`] };

  const windowValid = validateAnalyticsWindow(input.window, `${pathPrefix}window.`);
  if (windowValid.ok === false) errors.push(...windowValid.errors);
  const totalsValid = validatePerformanceTotals(input.totals, `${pathPrefix}totals.`);
  if (totalsValid.ok === false) errors.push(...totalsValid.errors);

  if (!Array.isArray(input.setupPatterns)) errors.push(`${pathPrefix}setupPatterns must be array`);
  else input.setupPatterns.forEach((item, index) => {
    const validated = validateSetupPerformancePattern(item, `${pathPrefix}setupPatterns[${index}].`);
    if (validated.ok === false) errors.push(...validated.errors);
  });

  if (!Array.isArray(input.directionPatterns)) errors.push(`${pathPrefix}directionPatterns must be array`);
  else input.directionPatterns.forEach((item, index) => {
    const validated = validateDirectionPerformancePattern(item, `${pathPrefix}directionPatterns[${index}].`);
    if (validated.ok === false) errors.push(...validated.errors);
  });

  const qualityValid = validateExecutionQualitySummary(input.executionQuality, `${pathPrefix}executionQuality.`);
  if (qualityValid.ok === false) errors.push(...qualityValid.errors);

  const adherenceValid = validatePlanAdherenceSummary(input.planAdherence, `${pathPrefix}planAdherence.`);
  if (adherenceValid.ok === false) errors.push(...adherenceValid.errors);

  if (!Array.isArray(input.behaviorPatterns)) errors.push(`${pathPrefix}behaviorPatterns must be array`);
  else input.behaviorPatterns.forEach((item, index) => {
    const validated = validateBehaviorAnalyticsPattern(item, `${pathPrefix}behaviorPatterns[${index}].`);
    if (validated.ok === false) errors.push(...validated.errors);
  });

  const insightsValid = validateReviewInsightSummary(input.reviewInsights, `${pathPrefix}reviewInsights.`);
  if (insightsValid.ok === false) errors.push(...insightsValid.errors);

  const reasoningValid = validateReasoningLinkSummary(input.reasoningLinkSummary, `${pathPrefix}reasoningLinkSummary.`);
  if (reasoningValid.ok === false) errors.push(...reasoningValid.errors);

  validateUniqueStringArray(input.supportingCaseIds, 'supportingCaseIds', errors, pathPrefix);

  return errors.length ? { ok: false, errors } : { ok: true, value: input as AnalyticsSnapshotSummary };
}

export function validateAnalyticsSnapshot(input: unknown, pathPrefix = ''): SchemaValidationResult<AnalyticsSnapshot> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}AnalyticsSnapshot must be object`] };
  if (!isNonEmptyString(input.snapshotId)) errors.push(`${pathPrefix}snapshotId must be non-empty string`);
  const summaryValidated = validateAnalyticsSnapshotSummary(input.summary, `${pathPrefix}summary.`);
  if (summaryValidated.ok === false) errors.push(...summaryValidated.errors);
  if (!isIsoDateString(input.createdAt)) errors.push(`${pathPrefix}createdAt must be ISO date string`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as AnalyticsSnapshot };
}
