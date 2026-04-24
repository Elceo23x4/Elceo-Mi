import type { CanonicalJournalCase, JournalCaseRevisionRecord } from '@elceo/types';
import { TIMEFRAMES } from './event.schema';
import {
  isEnumValue,
  isFiniteNumber,
  isIsoDateString,
  isNonEmptyString,
  isObjectRecord,
  isStringArray,
  type SchemaValidationResult
} from './validation-utils';

export const JOURNAL_CASE_STATUSES = ['draft', 'planned', 'executed', 'partially_closed', 'closed', 'canceled', 'reviewed'] as const;
export const TRADE_DIRECTIONS = ['long', 'short'] as const;
export const JOURNAL_CONVICTION_LABELS = ['exploratory', 'standard', 'high_conviction'] as const;
export const JOURNAL_OUTCOME_LABELS = ['win', 'loss', 'breakeven', 'mixed', 'open'] as const;
export const JOURNAL_EXECUTION_QUALITY_LABELS = ['disciplined', 'acceptable', 'weak', 'impulsive'] as const;
export const JOURNAL_SUBJECT_KINDS = ['user', 'workspace', 'ops'] as const;
export const JOURNAL_ACTOR_KINDS = ['system', 'user', 'workspace', 'ops'] as const;
export const JOURNAL_REVISION_TYPES = ['created', 'planned', 'executed', 'adjusted', 'partially_closed', 'closed', 'canceled', 'reviewed'] as const;

function validateNullableNumber(value: unknown, field: string, errors: string[], pathPrefix = ''): void {
  if (!(value === null || isFiniteNumber(value))) {
    errors.push(`${pathPrefix}${field} must be finite number or null`);
  }
}

function validateNullableIso(value: unknown, field: string, errors: string[], pathPrefix = ''): void {
  if (!(value === null || isIsoDateString(value))) {
    errors.push(`${pathPrefix}${field} must be ISO date string or null`);
  }
}

function validateOrderedTakeProfits(value: unknown, pathPrefix: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${pathPrefix}takeProfitPlanned must be number[]`);
    return;
  }

  let last = Number.NEGATIVE_INFINITY;
  value.forEach((item, index) => {
    if (!isFiniteNumber(item)) {
      errors.push(`${pathPrefix}takeProfitPlanned[${index}] must be finite number`);
      return;
    }
    if (item < last) {
      errors.push(`${pathPrefix}takeProfitPlanned must be ordered ascending`);
    }
    last = item;
  });
}

export function validateCanonicalJournalCase(input: unknown, pathPrefix = ''): SchemaValidationResult<CanonicalJournalCase> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}CanonicalJournalCase must be object`] };

  const identity = input.identity;
  if (!isObjectRecord(identity)) {
    errors.push(`${pathPrefix}identity must be object`);
  } else {
    if (!isNonEmptyString(identity.caseId)) errors.push(`${pathPrefix}identity.caseId must be non-empty string`);
    if (!isEnumValue(identity.subjectKind, JOURNAL_SUBJECT_KINDS)) errors.push(`${pathPrefix}identity.subjectKind is invalid`);
    if (!isNonEmptyString(identity.subjectId)) errors.push(`${pathPrefix}identity.subjectId must be non-empty string`);
    if (!isNonEmptyString(identity.asset)) errors.push(`${pathPrefix}identity.asset must be non-empty string`);
    if (!isEnumValue(identity.timeframe, TIMEFRAMES)) errors.push(`${pathPrefix}identity.timeframe is invalid`);
    if (!isNonEmptyString(identity.title)) errors.push(`${pathPrefix}identity.title must be non-empty string`);
  }

  if (!isEnumValue(input.status, JOURNAL_CASE_STATUSES)) errors.push(`${pathPrefix}status is invalid`);

  const plan = input.plan;
  if (!isObjectRecord(plan)) {
    errors.push(`${pathPrefix}plan must be object`);
  } else {
    if (!isEnumValue(plan.direction, TRADE_DIRECTIONS)) errors.push(`${pathPrefix}plan.direction is invalid`);
    if (!isNonEmptyString(plan.thesis)) errors.push(`${pathPrefix}plan.thesis must be non-empty string`);
    if (!isNonEmptyString(plan.setupType)) errors.push(`${pathPrefix}plan.setupType must be non-empty string`);
    if (!isEnumValue(plan.conviction, JOURNAL_CONVICTION_LABELS)) errors.push(`${pathPrefix}plan.conviction is invalid`);
    validateNullableNumber(plan.entryPricePlanned, 'plan.entryPricePlanned', errors, pathPrefix);
    validateNullableNumber(plan.stopLossPlanned, 'plan.stopLossPlanned', errors, pathPrefix);
    validateOrderedTakeProfits(plan.takeProfitPlanned, `${pathPrefix}plan.`, errors);
    validateNullableNumber(plan.riskAmountPlanned, 'plan.riskAmountPlanned', errors, pathPrefix);
    validateNullableNumber(plan.riskPercentPlanned, 'plan.riskPercentPlanned', errors, pathPrefix);
    if (!(plan.invalidationNote === null || typeof plan.invalidationNote === 'string')) errors.push(`${pathPrefix}plan.invalidationNote must be string or null`);
    if (!isStringArray(plan.executionChecklist)) errors.push(`${pathPrefix}plan.executionChecklist must be string[]`);
    if (!(plan.createdFromReasoningRunId === null || isNonEmptyString(plan.createdFromReasoningRunId))) {
      errors.push(`${pathPrefix}plan.createdFromReasoningRunId must be non-empty string or null`);
    }
    if (!(plan.createdFromSnapshotId === null || isNonEmptyString(plan.createdFromSnapshotId))) {
      errors.push(`${pathPrefix}plan.createdFromSnapshotId must be non-empty string or null`);
    }
    if (!(plan.createdFromDriftId === null || isNonEmptyString(plan.createdFromDriftId))) {
      errors.push(`${pathPrefix}plan.createdFromDriftId must be non-empty string or null`);
    }
  }

  const execution = input.execution;
  if (!isObjectRecord(execution)) {
    errors.push(`${pathPrefix}execution must be object`);
  } else {
    validateNullableNumber(execution.entryPriceExecuted, 'execution.entryPriceExecuted', errors, pathPrefix);
    validateNullableNumber(execution.positionSize, 'execution.positionSize', errors, pathPrefix);
    validateNullableIso(execution.openedAt, 'execution.openedAt', errors, pathPrefix);
    validateNullableIso(execution.lastAdjustedAt, 'execution.lastAdjustedAt', errors, pathPrefix);
    if (!isStringArray(execution.notes)) errors.push(`${pathPrefix}execution.notes must be string[]`);
    if (!(execution.executionQuality === null || isEnumValue(execution.executionQuality, JOURNAL_EXECUTION_QUALITY_LABELS))) {
      errors.push(`${pathPrefix}execution.executionQuality is invalid`);
    }
  }

  const closure = input.closure;
  if (!isObjectRecord(closure)) {
    errors.push(`${pathPrefix}closure must be object`);
  } else {
    validateNullableNumber(closure.exitPrice, 'closure.exitPrice', errors, pathPrefix);
    validateNullableIso(closure.closedAt, 'closure.closedAt', errors, pathPrefix);
    validateNullableNumber(closure.pnlAmount, 'closure.pnlAmount', errors, pathPrefix);
    validateNullableNumber(closure.pnlPercent, 'closure.pnlPercent', errors, pathPrefix);
    validateNullableNumber(closure.rMultiple, 'closure.rMultiple', errors, pathPrefix);
    if (!isEnumValue(closure.outcome, JOURNAL_OUTCOME_LABELS)) errors.push(`${pathPrefix}closure.outcome is invalid`);
    if (!(closure.closureReason === null || typeof closure.closureReason === 'string')) errors.push(`${pathPrefix}closure.closureReason must be string or null`);
  }

  const review = input.review;
  if (!isObjectRecord(review)) {
    errors.push(`${pathPrefix}review must be object`);
  } else {
    validateNullableIso(review.reviewedAt, 'review.reviewedAt', errors, pathPrefix);
    if (!isStringArray(review.whatWentWell)) errors.push(`${pathPrefix}review.whatWentWell must be string[]`);
    if (!isStringArray(review.whatWentWrong)) errors.push(`${pathPrefix}review.whatWentWrong must be string[]`);
    if (!isStringArray(review.lessons)) errors.push(`${pathPrefix}review.lessons must be string[]`);
    if (!isStringArray(review.behaviorTags)) errors.push(`${pathPrefix}review.behaviorTags must be string[]`);
    if (!isStringArray(review.followUpActions)) errors.push(`${pathPrefix}review.followUpActions must be string[]`);
  }

  if (!isStringArray(input.tags)) errors.push(`${pathPrefix}tags must be string[]`);
  if (!isIsoDateString(input.createdAt)) errors.push(`${pathPrefix}createdAt must be ISO date string`);
  if (!isIsoDateString(input.updatedAt)) errors.push(`${pathPrefix}updatedAt must be ISO date string`);

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as CanonicalJournalCase };
}

export function validateJournalCaseRevisionRecord(input: unknown, pathPrefix = ''): SchemaValidationResult<JournalCaseRevisionRecord> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}JournalCaseRevisionRecord must be object`] };

  if (!isNonEmptyString(input.revisionId)) errors.push(`${pathPrefix}revisionId must be non-empty string`);
  if (!isNonEmptyString(input.caseId)) errors.push(`${pathPrefix}caseId must be non-empty string`);
  if (!isEnumValue(input.revisionType, JOURNAL_REVISION_TYPES)) errors.push(`${pathPrefix}revisionType is invalid`);
  if (!(input.previousStatus === null || isEnumValue(input.previousStatus, JOURNAL_CASE_STATUSES))) {
    errors.push(`${pathPrefix}previousStatus is invalid`);
  }
  if (!isEnumValue(input.nextStatus, JOURNAL_CASE_STATUSES)) errors.push(`${pathPrefix}nextStatus is invalid`);
  if (!isIsoDateString(input.changedAt)) errors.push(`${pathPrefix}changedAt must be ISO date string`);
  if (!isEnumValue(input.changedByKind, JOURNAL_ACTOR_KINDS)) errors.push(`${pathPrefix}changedByKind is invalid`);
  if (!isNonEmptyString(input.changedById)) errors.push(`${pathPrefix}changedById must be non-empty string`);
  if (!isNonEmptyString(input.summary)) errors.push(`${pathPrefix}summary must be non-empty string`);
  if (!isNonEmptyString(input.snapshotJson)) {
    errors.push(`${pathPrefix}snapshotJson must be non-empty string`);
  } else {
    try {
      JSON.parse(input.snapshotJson);
    } catch {
      errors.push(`${pathPrefix}snapshotJson must be valid JSON string`);
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as JournalCaseRevisionRecord };
}
