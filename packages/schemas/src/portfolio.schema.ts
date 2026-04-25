import type {
  CanonicalPortfolioSnapshot,
  PortfolioActionItem,
  PortfolioRevisionRecord,
  PositionRecord,
  WatchlistEntry
} from '@elceo/types';
import { TIMEFRAMES } from './event.schema';
import {
  isEnumValue,
  isFiniteNumber,
  isIsoDateString,
  isNonEmptyString,
  isObjectRecord,
  type SchemaValidationResult
} from './validation-utils';

export const PORTFOLIO_SUBJECT_KINDS = ['user', 'workspace', 'ops'] as const;
export const PORTFOLIO_RECORD_STATUSES = ['active', 'archived'] as const;
export const WATCHLIST_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;
export const WATCHLIST_ENTRY_STATUSES = ['watching', 'thesis_active', 'readiness_pending', 'archived'] as const;
export const THESIS_HEALTH_VALUES = ['strong', 'stable', 'weakening', 'invalidated'] as const;
export const POSITION_STATUSES = ['proposed', 'open', 'reducing', 'closed', 'canceled'] as const;
export const PORTFOLIO_ACTION_KINDS = [
  'review_thesis',
  'review_risk',
  'tighten_execution',
  'prepare_entry',
  'reduce_exposure',
  'close_position',
  'review_invalidated_thesis',
  'update_journal',
  'review_notification_signal'
] as const;
export const PORTFOLIO_ACTION_STATUSES = ['open', 'completed', 'dismissed'] as const;
export const PORTFOLIO_ENTITY_KINDS = ['watchlist_entry', 'position', 'action_item'] as const;
export const PORTFOLIO_ACTOR_KINDS = ['system', 'user', 'workspace', 'ops'] as const;
export const PORTFOLIO_REVISION_TYPES = [
  'created',
  'updated',
  'archived',
  'status_changed',
  'completed',
  'dismissed',
  'thesis_health_changed',
  'linked',
  'closed',
  'canceled'
] as const;

function validateNullableIso(value: unknown, field: string, errors: string[], pathPrefix = ''): void {
  if (!(value === null || isIsoDateString(value))) errors.push(`${pathPrefix}${field} must be ISO date string or null`);
}

function validateNullableString(value: unknown, field: string, errors: string[], pathPrefix = ''): void {
  if (!(value === null || isNonEmptyString(value))) errors.push(`${pathPrefix}${field} must be non-empty string or null`);
}

function validateTakeProfitLevels(levels: unknown, field: string, errors: string[], pathPrefix = ''): void {
  if (!Array.isArray(levels)) {
    errors.push(`${pathPrefix}${field} must be number[]`);
    return;
  }
  levels.forEach((item, index) => {
    if (!isFiniteNumber(item)) errors.push(`${pathPrefix}${field}[${index}] must be finite number`);
  });
}

function validateLinkageStrings<T extends Record<string, unknown>>(input: T, fields: string[], pathPrefix: string, errors: string[]): void {
  fields.forEach((field) => validateNullableString(input[field], field, errors, pathPrefix));
}

export function validateWatchlistEntry(input: unknown, pathPrefix = ''): SchemaValidationResult<WatchlistEntry> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}WatchlistEntry must be object`] };

  if (!isNonEmptyString(input.entryId)) errors.push(`${pathPrefix}entryId must be non-empty string`);
  if (!isEnumValue(input.subjectKind, PORTFOLIO_SUBJECT_KINDS)) errors.push(`${pathPrefix}subjectKind is invalid`);
  if (!isNonEmptyString(input.subjectId)) errors.push(`${pathPrefix}subjectId must be non-empty string`);
  if (!isNonEmptyString(input.asset)) errors.push(`${pathPrefix}asset must be non-empty string`);
  if (!isEnumValue(input.timeframe, TIMEFRAMES)) errors.push(`${pathPrefix}timeframe is invalid`);
  if (!isEnumValue(input.priority, WATCHLIST_PRIORITIES)) errors.push(`${pathPrefix}priority is invalid`);
  if (!isEnumValue(input.status, WATCHLIST_ENTRY_STATUSES)) errors.push(`${pathPrefix}status is invalid`);
  if (!isEnumValue(input.thesisHealth, THESIS_HEALTH_VALUES)) errors.push(`${pathPrefix}thesisHealth is invalid`);
  if (!(input.note === null || typeof input.note === 'string')) errors.push(`${pathPrefix}note must be string or null`);
  validateLinkageStrings(input, ['linkedReasoningRunId', 'linkedSnapshotId', 'linkedDriftId', 'linkedJournalCaseId'], pathPrefix, errors);
  if (!isIsoDateString(input.createdAt)) errors.push(`${pathPrefix}createdAt must be ISO date string`);
  if (!isIsoDateString(input.updatedAt)) errors.push(`${pathPrefix}updatedAt must be ISO date string`);

  return errors.length ? { ok: false, errors } : { ok: true, value: input as WatchlistEntry };
}

export function validatePositionRecord(input: unknown, pathPrefix = ''): SchemaValidationResult<PositionRecord> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}PositionRecord must be object`] };

  if (!isNonEmptyString(input.positionId)) errors.push(`${pathPrefix}positionId must be non-empty string`);
  if (!isEnumValue(input.subjectKind, PORTFOLIO_SUBJECT_KINDS)) errors.push(`${pathPrefix}subjectKind is invalid`);
  if (!isNonEmptyString(input.subjectId)) errors.push(`${pathPrefix}subjectId must be non-empty string`);
  if (!isNonEmptyString(input.asset)) errors.push(`${pathPrefix}asset must be non-empty string`);
  if (!isEnumValue(input.timeframe, TIMEFRAMES)) errors.push(`${pathPrefix}timeframe is invalid`);
  if (!isEnumValue(input.status, POSITION_STATUSES)) errors.push(`${pathPrefix}status is invalid`);
  if (!isEnumValue(input.direction, ['long', 'short'] as const)) errors.push(`${pathPrefix}direction is invalid`);
  if (!(input.entryPrice === null || isFiniteNumber(input.entryPrice))) errors.push(`${pathPrefix}entryPrice must be finite number or null`);
  if (!(input.stopLoss === null || isFiniteNumber(input.stopLoss))) errors.push(`${pathPrefix}stopLoss must be finite number or null`);
  validateTakeProfitLevels(input.takeProfitLevels, 'takeProfitLevels', errors, pathPrefix);
  if (!(input.size === null || isFiniteNumber(input.size))) errors.push(`${pathPrefix}size must be finite number or null`);
  validateNullableIso(input.openedAt, 'openedAt', errors, pathPrefix);
  if (!isIsoDateString(input.updatedAt)) errors.push(`${pathPrefix}updatedAt must be ISO date string`);
  validateNullableIso(input.closedAt, 'closedAt', errors, pathPrefix);
  if (!isEnumValue(input.thesisHealth, THESIS_HEALTH_VALUES)) errors.push(`${pathPrefix}thesisHealth is invalid`);
  validateLinkageStrings(input, ['linkedJournalCaseId', 'linkedReasoningRunId', 'linkedSnapshotId', 'linkedDriftId'], pathPrefix, errors);
  if (!(input.note === null || typeof input.note === 'string')) errors.push(`${pathPrefix}note must be string or null`);

  return errors.length ? { ok: false, errors } : { ok: true, value: input as PositionRecord };
}

export function validatePortfolioActionItem(input: unknown, pathPrefix = ''): SchemaValidationResult<PortfolioActionItem> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}PortfolioActionItem must be object`] };

  if (!isNonEmptyString(input.actionId)) errors.push(`${pathPrefix}actionId must be non-empty string`);
  if (!isEnumValue(input.subjectKind, PORTFOLIO_SUBJECT_KINDS)) errors.push(`${pathPrefix}subjectKind is invalid`);
  if (!isNonEmptyString(input.subjectId)) errors.push(`${pathPrefix}subjectId must be non-empty string`);
  if (!isEnumValue(input.kind, PORTFOLIO_ACTION_KINDS)) errors.push(`${pathPrefix}kind is invalid`);
  if (!isEnumValue(input.status, PORTFOLIO_ACTION_STATUSES)) errors.push(`${pathPrefix}status is invalid`);
  if (!isEnumValue(input.priority, WATCHLIST_PRIORITIES)) errors.push(`${pathPrefix}priority is invalid`);
  if (!(input.asset === null || isNonEmptyString(input.asset))) errors.push(`${pathPrefix}asset must be non-empty string or null`);
  if (!(input.timeframe === null || isEnumValue(input.timeframe, TIMEFRAMES))) errors.push(`${pathPrefix}timeframe is invalid`);
  if (!isNonEmptyString(input.headline)) errors.push(`${pathPrefix}headline must be non-empty string`);
  if (!isNonEmptyString(input.rationale)) errors.push(`${pathPrefix}rationale must be non-empty string`);
  validateLinkageStrings(
    input,
    ['linkedEntryId', 'linkedPositionId', 'linkedJournalCaseId', 'linkedReasoningRunId', 'linkedNotificationDecisionId'],
    pathPrefix,
    errors
  );
  if (!isIsoDateString(input.createdAt)) errors.push(`${pathPrefix}createdAt must be ISO date string`);
  if (!isIsoDateString(input.updatedAt)) errors.push(`${pathPrefix}updatedAt must be ISO date string`);
  validateNullableIso(input.completedAt, 'completedAt', errors, pathPrefix);
  validateNullableIso(input.dismissedAt, 'dismissedAt', errors, pathPrefix);

  return errors.length ? { ok: false, errors } : { ok: true, value: input as PortfolioActionItem };
}

export function validatePortfolioRevisionRecord(input: unknown, pathPrefix = ''): SchemaValidationResult<PortfolioRevisionRecord> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}PortfolioRevisionRecord must be object`] };

  if (!isNonEmptyString(input.revisionId)) errors.push(`${pathPrefix}revisionId must be non-empty string`);
  if (!isEnumValue(input.entityKind, PORTFOLIO_ENTITY_KINDS)) errors.push(`${pathPrefix}entityKind is invalid`);
  if (!isNonEmptyString(input.entityId)) errors.push(`${pathPrefix}entityId must be non-empty string`);
  if (!isEnumValue(input.revisionType, PORTFOLIO_REVISION_TYPES)) errors.push(`${pathPrefix}revisionType is invalid`);
  if (!isIsoDateString(input.changedAt)) errors.push(`${pathPrefix}changedAt must be ISO date string`);
  if (!isEnumValue(input.changedByKind, PORTFOLIO_ACTOR_KINDS)) errors.push(`${pathPrefix}changedByKind is invalid`);
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

  return errors.length ? { ok: false, errors } : { ok: true, value: input as PortfolioRevisionRecord };
}

export function validateCanonicalPortfolioSnapshot(input: unknown, pathPrefix = ''): SchemaValidationResult<CanonicalPortfolioSnapshot> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}CanonicalPortfolioSnapshot must be object`] };

  if (!isNonEmptyString(input.snapshotId)) errors.push(`${pathPrefix}snapshotId must be non-empty string`);
  if (!isEnumValue(input.subjectKind, PORTFOLIO_SUBJECT_KINDS)) errors.push(`${pathPrefix}subjectKind is invalid`);
  if (!isNonEmptyString(input.subjectId)) errors.push(`${pathPrefix}subjectId must be non-empty string`);
  if (!isIsoDateString(input.generatedAt)) errors.push(`${pathPrefix}generatedAt must be ISO date string`);

  const counters = [
    'activeWatchlistCount',
    'activePositionCount',
    'weakeningThesisCount',
    'invalidatedThesisCount',
    'openActionCount',
    'criticalActionCount'
  ] as const;
  counters.forEach((counter) => {
    if (!(typeof input[counter] === 'number' && Number.isInteger(input[counter]) && input[counter] >= 0)) {
      errors.push(`${pathPrefix}${counter} must be integer >= 0`);
    }
  });

  if (!Array.isArray(input.watchlistEntries)) {
    errors.push(`${pathPrefix}watchlistEntries must be array`);
  } else {
    input.watchlistEntries.forEach((entry, index) => {
      const result = validateWatchlistEntry(entry, `${pathPrefix}watchlistEntries[${index}].`);
      if (result.ok === false) errors.push(...result.errors);
    });
  }

  if (!Array.isArray(input.positions)) {
    errors.push(`${pathPrefix}positions must be array`);
  } else {
    input.positions.forEach((position, index) => {
      const result = validatePositionRecord(position, `${pathPrefix}positions[${index}].`);
      if (result.ok === false) errors.push(...result.errors);
    });
  }

  if (!Array.isArray(input.actionQueue)) {
    errors.push(`${pathPrefix}actionQueue must be array`);
  } else {
    input.actionQueue.forEach((action, index) => {
      const result = validatePortfolioActionItem(action, `${pathPrefix}actionQueue[${index}].`);
      if (result.ok === false) errors.push(...result.errors);
    });
  }

  if (!isIsoDateString(input.createdAt)) errors.push(`${pathPrefix}createdAt must be ISO date string`);

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as CanonicalPortfolioSnapshot };
}
