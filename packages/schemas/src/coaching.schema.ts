import type {
  CoachingActionItem,
  CoachingFocusArea,
  CoachingPriority,
  CoachingSignalSource,
  CoachingSnapshot,
  CoachingStrengthItem,
  CoachingSummary,
  CoachingTheme
} from '@elceo/types';
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

const COACHING_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const satisfies readonly CoachingPriority[];
const COACHING_THEMES = ['discipline', 'setup_selection', 'risk_management', 'execution_precision', 'behavior_control', 'review_quality', 'reasoning_alignment'] as const satisfies readonly CoachingTheme[];
const COACHING_SIGNAL_SOURCES = ['analytics', 'journal_influence', 'journal_review', 'reasoning_linkage'] as const satisfies readonly CoachingSignalSource[];

function isScore(value: unknown): boolean {
  return isFiniteNumber(value) && value >= 0 && value <= 100;
}

function validateUniqueStringArray(value: unknown, field: string, errors: string[], pathPrefix: string): string[] | null {
  if (!isStringArray(value)) {
    errors.push(`${pathPrefix}${field} must be string[]`);
    return null;
  }
  const seen = new Set<string>();
  value.forEach((item, index) => {
    if (seen.has(item)) errors.push(`${pathPrefix}${field}[${index}] must be unique`);
    seen.add(item);
  });
  return value;
}

function validateSupportingMetrics(value: unknown, errors: string[], pathPrefix: string): void {
  if (!isObjectRecord(value)) {
    errors.push(`${pathPrefix}supportingMetrics must be object`);
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if (!isNonEmptyString(key)) errors.push(`${pathPrefix}supportingMetrics keys must be non-empty strings`);
    if (!(item === null || isFiniteNumber(item))) errors.push(`${pathPrefix}supportingMetrics.${key} must be finite number or null`);
  }
}

function validateSourceKinds(value: unknown, errors: string[], pathPrefix: string): void {
  if (!Array.isArray(value)) {
    errors.push(`${pathPrefix}sourceKinds must be array`);
    return;
  }
  const seen = new Set<string>();
  value.forEach((item, index) => {
    if (!isEnumValue(item, COACHING_SIGNAL_SOURCES)) errors.push(`${pathPrefix}sourceKinds[${index}] is invalid`);
    if (typeof item === 'string') {
      if (seen.has(item)) errors.push(`${pathPrefix}sourceKinds[${index}] must be unique`);
      seen.add(item);
    }
  });
}

export function validateCoachingFocusArea(input: unknown, pathPrefix = ''): SchemaValidationResult<CoachingFocusArea> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}CoachingFocusArea must be object`] };
  if (!isNonEmptyString(input.focusId)) errors.push(`${pathPrefix}focusId must be non-empty string`);
  if (!isEnumValue(input.theme, COACHING_THEMES)) errors.push(`${pathPrefix}theme is invalid`);
  if (!isEnumValue(input.priority, COACHING_PRIORITIES)) errors.push(`${pathPrefix}priority is invalid`);
  if (!isNonEmptyString(input.headline)) errors.push(`${pathPrefix}headline must be non-empty string`);
  if (!isNonEmptyString(input.explanation)) errors.push(`${pathPrefix}explanation must be non-empty string`);
  validateSupportingMetrics(input.supportingMetrics, errors, `${pathPrefix}`);
  validateUniqueStringArray(input.supportingCaseIds, 'supportingCaseIds', errors, pathPrefix);
  validateSourceKinds(input.sourceKinds, errors, `${pathPrefix}`);
  if (!isScore(input.score)) errors.push(`${pathPrefix}score must be number in range 0..100`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as CoachingFocusArea };
}

export function validateCoachingActionItem(input: unknown, pathPrefix = ''): SchemaValidationResult<CoachingActionItem> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}CoachingActionItem must be object`] };
  if (!isNonEmptyString(input.actionId)) errors.push(`${pathPrefix}actionId must be non-empty string`);
  if (!isEnumValue(input.theme, COACHING_THEMES)) errors.push(`${pathPrefix}theme is invalid`);
  if (!isEnumValue(input.priority, COACHING_PRIORITIES)) errors.push(`${pathPrefix}priority is invalid`);
  if (!isNonEmptyString(input.instruction)) errors.push(`${pathPrefix}instruction must be non-empty string`);
  if (!isNonEmptyString(input.successMetric)) errors.push(`${pathPrefix}successMetric must be non-empty string`);
  validateUniqueStringArray(input.supportingFocusIds, 'supportingFocusIds', errors, pathPrefix);
  if (!isScore(input.score)) errors.push(`${pathPrefix}score must be number in range 0..100`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as CoachingActionItem };
}

export function validateCoachingStrengthItem(input: unknown, pathPrefix = ''): SchemaValidationResult<CoachingStrengthItem> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}CoachingStrengthItem must be object`] };
  if (!isNonEmptyString(input.strengthId)) errors.push(`${pathPrefix}strengthId must be non-empty string`);
  if (!isEnumValue(input.theme, COACHING_THEMES)) errors.push(`${pathPrefix}theme is invalid`);
  if (!isNonEmptyString(input.headline)) errors.push(`${pathPrefix}headline must be non-empty string`);
  if (!isNonEmptyString(input.explanation)) errors.push(`${pathPrefix}explanation must be non-empty string`);
  validateUniqueStringArray(input.supportingCaseIds, 'supportingCaseIds', errors, pathPrefix);
  if (!isScore(input.score)) errors.push(`${pathPrefix}score must be number in range 0..100`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as CoachingStrengthItem };
}

export function validateCoachingSummary(input: unknown, pathPrefix = ''): SchemaValidationResult<CoachingSummary> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}CoachingSummary must be object`] };
  if (!(input.subjectKind === 'user' || input.subjectKind === 'workspace' || input.subjectKind === 'ops')) errors.push(`${pathPrefix}subjectKind is invalid`);
  if (!isNonEmptyString(input.subjectId)) errors.push(`${pathPrefix}subjectId must be non-empty string`);
  if (!(input.assetScope === '*' || isNonEmptyString(input.assetScope))) errors.push(`${pathPrefix}assetScope must be non-empty string or '*'`);
  if (!(input.timeframeScope === '*' || isEnumValue(input.timeframeScope, TIMEFRAMES))) errors.push(`${pathPrefix}timeframeScope must be valid timeframe or '*'`);
  if (!isIsoDateString(input.generatedAt)) errors.push(`${pathPrefix}generatedAt must be ISO date string`);
  if (!(input.analyticsSnapshotId === null || isNonEmptyString(input.analyticsSnapshotId))) errors.push(`${pathPrefix}analyticsSnapshotId must be non-empty string or null`);
  if (!(input.journalInfluenceSnapshotId === null || isNonEmptyString(input.journalInfluenceSnapshotId))) errors.push(`${pathPrefix}journalInfluenceSnapshotId must be non-empty string or null`);
  if (!(Number.isInteger(input.totalSignalsConsidered) && Number(input.totalSignalsConsidered) >= 0)) errors.push(`${pathPrefix}totalSignalsConsidered must be integer >= 0`);

  if (!Array.isArray(input.focusAreas)) errors.push(`${pathPrefix}focusAreas must be array`);
  else {
    input.focusAreas.forEach((item, index) => {
      const validated = validateCoachingFocusArea(item, `${pathPrefix}focusAreas[${index}].`);
      if (validated.ok === false) errors.push(...validated.errors);
    });
  }

  if (!Array.isArray(input.strengths)) errors.push(`${pathPrefix}strengths must be array`);
  else {
    input.strengths.forEach((item, index) => {
      const validated = validateCoachingStrengthItem(item, `${pathPrefix}strengths[${index}].`);
      if (validated.ok === false) errors.push(...validated.errors);
    });
  }

  if (!Array.isArray(input.actionPlan)) errors.push(`${pathPrefix}actionPlan must be array`);
  else {
    input.actionPlan.forEach((item, index) => {
      const validated = validateCoachingActionItem(item, `${pathPrefix}actionPlan[${index}].`);
      if (validated.ok === false) errors.push(...validated.errors);
    });
  }

  if (!isStringArray(input.summaryNotes)) errors.push(`${pathPrefix}summaryNotes must be string[]`);
  validateUniqueStringArray(input.supportingCaseIds, 'supportingCaseIds', errors, pathPrefix);

  if (Array.isArray(input.actionPlan) && Array.isArray(input.focusAreas)) {
    const focusIds = new Set<string>();
    input.focusAreas.forEach((item) => {
      if (isObjectRecord(item) && typeof item.focusId === 'string') focusIds.add(item.focusId);
    });
    input.actionPlan.forEach((action, index) => {
      if (!isObjectRecord(action) || !Array.isArray(action.supportingFocusIds)) return;
      action.supportingFocusIds.forEach((focusId, focusIndex) => {
        if (typeof focusId === 'string' && !focusIds.has(focusId)) {
          errors.push(`${pathPrefix}actionPlan[${index}].supportingFocusIds[${focusIndex}] must reference existing focusId`);
        }
      });
    });
  }

  return errors.length ? { ok: false, errors } : { ok: true, value: input as CoachingSummary };
}

export function validateCoachingSnapshot(input: unknown, pathPrefix = ''): SchemaValidationResult<CoachingSnapshot> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}CoachingSnapshot must be object`] };
  if (!isNonEmptyString(input.snapshotId)) errors.push(`${pathPrefix}snapshotId must be non-empty string`);
  if (!isIsoDateString(input.createdAt)) errors.push(`${pathPrefix}createdAt must be ISO date string`);
  const summaryValidated = validateCoachingSummary(input.summary, `${pathPrefix}summary.`);
  if (summaryValidated.ok === false) errors.push(...summaryValidated.errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as CoachingSnapshot };
}
