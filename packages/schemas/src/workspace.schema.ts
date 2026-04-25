import type {
  RecentReasoningSignal,
  WorkspaceAgendaItem,
  WorkspaceAnalyticsSummary,
  WorkspaceAttentionDetail,
  WorkspaceCoachingSummary,
  WorkspaceDependencyStatus,
  WorkspaceNotificationSummary,
  WorkspacePortfolioSummary,
  WorkspaceSnapshot,
  WorkspaceSummary
} from '@elceo/types';
import { BIAS_STATES, TIMEFRAMES } from './event.schema';
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

export const WORKSPACE_HEALTH_STATES = ['stable', 'attention_needed', 'critical'] as const;
export const WORKSPACE_ATTENTION_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export const WORKSPACE_SOURCE_STATUSES = ['loaded', 'missing', 'stale', 'failed'] as const;
export const WORKSPACE_AGENDA_SOURCE_KINDS = ['portfolio_action', 'coaching_focus', 'notification', 'reasoning', 'thesis_health'] as const;
const COACHING_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;

function isNonNegativeInteger(value: unknown): boolean {
  return Number.isInteger(value) && Number(value) >= 0;
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

function validateNullableScore(value: unknown, field: string, errors: string[], pathPrefix: string): void {
  if (value === null) return;
  if (!isScore0to100(value)) errors.push(`${pathPrefix}${field} must be number in range 0..100 or null`);
}

export function validateRecentReasoningSignal(input: unknown, pathPrefix = ''): SchemaValidationResult<RecentReasoningSignal> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}RecentReasoningSignal must be object`] };
  if (!isNonEmptyString(input.reasoningRunId)) errors.push(`${pathPrefix}reasoningRunId must be non-empty string`);
  if (!(input.snapshotId === null || isNonEmptyString(input.snapshotId))) errors.push(`${pathPrefix}snapshotId must be non-empty string or null`);
  if (!isNonEmptyString(input.asset)) errors.push(`${pathPrefix}asset must be non-empty string`);
  if (!isEnumValue(input.timeframe, TIMEFRAMES)) errors.push(`${pathPrefix}timeframe is invalid`);
  if (!isEnumValue(input.bias, BIAS_STATES)) errors.push(`${pathPrefix}bias is invalid`);
  if (!isScore0to100(input.confidenceScore)) errors.push(`${pathPrefix}confidenceScore must be number in range 0..100`);
  if (!isScore0to100(input.contradictionScore)) errors.push(`${pathPrefix}contradictionScore must be number in range 0..100`);
  validateNullableScore(input.freshnessScore, 'freshnessScore', errors, pathPrefix);
  if (!isIsoDateString(input.evaluatedAt)) errors.push(`${pathPrefix}evaluatedAt must be ISO date string`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as RecentReasoningSignal };
}

export function validateWorkspacePortfolioSummary(input: unknown, pathPrefix = ''): SchemaValidationResult<WorkspacePortfolioSummary> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}WorkspacePortfolioSummary must be object`] };
  if (!(input.portfolioSnapshotId === null || isNonEmptyString(input.portfolioSnapshotId))) errors.push(`${pathPrefix}portfolioSnapshotId must be non-empty string or null`);
  for (const key of ['activeWatchlistCount', 'activePositionCount', 'weakeningThesisCount', 'invalidatedThesisCount', 'openActionCount', 'criticalActionCount'] as const) {
    if (!isNonNegativeInteger(input[key])) errors.push(`${pathPrefix}${key} must be integer >= 0`);
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: input as WorkspacePortfolioSummary };
}

export function validateWorkspaceCoachingSummary(input: unknown, pathPrefix = ''): SchemaValidationResult<WorkspaceCoachingSummary> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}WorkspaceCoachingSummary must be object`] };
  if (!(input.coachingSnapshotId === null || isNonEmptyString(input.coachingSnapshotId))) errors.push(`${pathPrefix}coachingSnapshotId must be non-empty string or null`);
  for (const key of ['focusAreaCount', 'strengthCount', 'actionPlanCount'] as const) {
    if (!isNonNegativeInteger(input[key])) errors.push(`${pathPrefix}${key} must be integer >= 0`);
  }
  if (!(input.topFocusHeadline === null || isNonEmptyString(input.topFocusHeadline))) errors.push(`${pathPrefix}topFocusHeadline must be non-empty string or null`);
  if (!(input.topFocusPriority === null || isEnumValue(input.topFocusPriority, COACHING_PRIORITIES))) errors.push(`${pathPrefix}topFocusPriority is invalid`);
  if (!(input.topStrengthHeadline === null || isNonEmptyString(input.topStrengthHeadline))) errors.push(`${pathPrefix}topStrengthHeadline must be non-empty string or null`);
  validateUniqueStringArray(input.supportingCaseIds, 'supportingCaseIds', errors, pathPrefix);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as WorkspaceCoachingSummary };
}

export function validateWorkspaceAnalyticsSummary(input: unknown, pathPrefix = ''): SchemaValidationResult<WorkspaceAnalyticsSummary> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}WorkspaceAnalyticsSummary must be object`] };
  if (!(input.analyticsSnapshotId === null || isNonEmptyString(input.analyticsSnapshotId))) errors.push(`${pathPrefix}analyticsSnapshotId must be non-empty string or null`);
  if (!isNonNegativeInteger(input.closedCaseCount)) errors.push(`${pathPrefix}closedCaseCount must be integer >= 0`);
  if (!isNonNegativeInteger(input.reviewedCaseCount)) errors.push(`${pathPrefix}reviewedCaseCount must be integer >= 0`);
  validateNullableScore(input.disciplineScore, 'disciplineScore', errors, pathPrefix);
  validateNullableScore(input.adherenceScore, 'adherenceScore', errors, pathPrefix);
  if (!(input.topSetupType === null || isNonEmptyString(input.topSetupType))) errors.push(`${pathPrefix}topSetupType must be non-empty string or null`);
  if (!(input.topBehaviorTag === null || isNonEmptyString(input.topBehaviorTag))) errors.push(`${pathPrefix}topBehaviorTag must be non-empty string or null`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as WorkspaceAnalyticsSummary };
}

export function validateWorkspaceNotificationSummary(input: unknown, pathPrefix = ''): SchemaValidationResult<WorkspaceNotificationSummary> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}WorkspaceNotificationSummary must be object`] };
  if (!isNonNegativeInteger(input.unreadInboxCount)) errors.push(`${pathPrefix}unreadInboxCount must be integer >= 0`);
  if (!isNonNegativeInteger(input.degradedTargetCount)) errors.push(`${pathPrefix}degradedTargetCount must be integer >= 0`);
  if (!isNonNegativeInteger(input.criticalReceiptCount)) errors.push(`${pathPrefix}criticalReceiptCount must be integer >= 0`);
  if (!isEnumValue(input.providerHealthAttention, WORKSPACE_ATTENTION_LEVELS)) errors.push(`${pathPrefix}providerHealthAttention is invalid`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as WorkspaceNotificationSummary };
}

export function validateWorkspaceAgendaItem(input: unknown, pathPrefix = ''): SchemaValidationResult<WorkspaceAgendaItem> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}WorkspaceAgendaItem must be object`] };
  if (!isNonEmptyString(input.agendaId)) errors.push(`${pathPrefix}agendaId must be non-empty string`);
  if (!isEnumValue(input.sourceKind, WORKSPACE_AGENDA_SOURCE_KINDS)) errors.push(`${pathPrefix}sourceKind is invalid`);
  if (!isEnumValue(input.priority, WORKSPACE_ATTENTION_LEVELS)) errors.push(`${pathPrefix}priority is invalid`);
  if (!isNonEmptyString(input.headline)) errors.push(`${pathPrefix}headline must be non-empty string`);
  if (!isNonEmptyString(input.rationale)) errors.push(`${pathPrefix}rationale must be non-empty string`);
  for (const key of ['linkedActionId', 'linkedFocusId', 'linkedNotificationDecisionId', 'linkedReasoningRunId', 'linkedPositionId', 'linkedWatchlistEntryId'] as const) {
    if (!(input[key] === null || isNonEmptyString(input[key]))) errors.push(`${pathPrefix}${key} must be non-empty string or null`);
  }
  validateUniqueStringArray(input.supportingCaseIds, 'supportingCaseIds', errors, pathPrefix);
  if (!isScore0to100(input.score)) errors.push(`${pathPrefix}score must be number in range 0..100`);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as WorkspaceAgendaItem };
}

export function validateWorkspaceDependencyStatus(input: unknown, pathPrefix = ''): SchemaValidationResult<WorkspaceDependencyStatus> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}WorkspaceDependencyStatus must be object`] };
  for (const key of ['portfolio', 'coaching', 'analytics', 'reasoning', 'notifications'] as const) {
    if (!isEnumValue(input[key], WORKSPACE_SOURCE_STATUSES)) errors.push(`${pathPrefix}${key} is invalid`);
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: input as WorkspaceDependencyStatus };
}

export function validateWorkspaceAttentionDetail(input: unknown, pathPrefix = ''): SchemaValidationResult<WorkspaceAttentionDetail> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}WorkspaceAttentionDetail must be object`] };
  for (const key of ['portfolioAttentionScore', 'coachingAttentionScore', 'notificationAttentionScore', 'reasoningAttentionScore'] as const) {
    if (!isScore0to100(input[key])) errors.push(`${pathPrefix}${key} must be number in range 0..100`);
  }
  if (!isFiniteNumber(input.dependencyPenaltyApplied) || Number(input.dependencyPenaltyApplied) < 0 || Number(input.dependencyPenaltyApplied) > 20) {
    errors.push(`${pathPrefix}dependencyPenaltyApplied must be number in range 0..20`);
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: input as WorkspaceAttentionDetail };
}

export function validateWorkspaceSummary(input: unknown, pathPrefix = ''): SchemaValidationResult<WorkspaceSummary> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}WorkspaceSummary must be object`] };
  if (!(input.subjectKind === 'user' || input.subjectKind === 'workspace' || input.subjectKind === 'ops')) errors.push(`${pathPrefix}subjectKind is invalid`);
  if (!isNonEmptyString(input.subjectId)) errors.push(`${pathPrefix}subjectId must be non-empty string`);
  if (!isIsoDateString(input.generatedAt)) errors.push(`${pathPrefix}generatedAt must be ISO date string`);
  if (!isEnumValue(input.healthState, WORKSPACE_HEALTH_STATES)) errors.push(`${pathPrefix}healthState is invalid`);
  if (!isEnumValue(input.attentionLevel, WORKSPACE_ATTENTION_LEVELS)) errors.push(`${pathPrefix}attentionLevel is invalid`);

  const dep = validateWorkspaceDependencyStatus(input.dependencyStatus, `${pathPrefix}dependencyStatus.`);
  if (dep.ok === false) errors.push(...dep.errors);
  const portfolio = validateWorkspacePortfolioSummary(input.portfolio, `${pathPrefix}portfolio.`);
  if (portfolio.ok === false) errors.push(...portfolio.errors);
  const coaching = validateWorkspaceCoachingSummary(input.coaching, `${pathPrefix}coaching.`);
  if (coaching.ok === false) errors.push(...coaching.errors);
  const analytics = validateWorkspaceAnalyticsSummary(input.analytics, `${pathPrefix}analytics.`);
  if (analytics.ok === false) errors.push(...analytics.errors);
  const notifications = validateWorkspaceNotificationSummary(input.notifications, `${pathPrefix}notifications.`);
  if (notifications.ok === false) errors.push(...notifications.errors);
  const detail = validateWorkspaceAttentionDetail(input.attentionDetail, `${pathPrefix}attentionDetail.`);
  if (detail.ok === false) errors.push(...detail.errors);

  if (!Array.isArray(input.recentReasoningSignals)) errors.push(`${pathPrefix}recentReasoningSignals must be array`);
  else {
    input.recentReasoningSignals.forEach((signal, index) => {
      const validated = validateRecentReasoningSignal(signal, `${pathPrefix}recentReasoningSignals[${index}].`);
      if (validated.ok === false) errors.push(...validated.errors);
    });
  }

  if (!Array.isArray(input.agenda)) errors.push(`${pathPrefix}agenda must be array`);
  else {
    input.agenda.forEach((item, index) => {
      const validated = validateWorkspaceAgendaItem(item, `${pathPrefix}agenda[${index}].`);
      if (validated.ok === false) errors.push(...validated.errors);
    });
  }

  validateUniqueStringArray(input.supportingCaseIds, 'supportingCaseIds', errors, pathPrefix);

  return errors.length ? { ok: false, errors } : { ok: true, value: input as WorkspaceSummary };
}

export function validateWorkspaceSnapshot(input: unknown, pathPrefix = ''): SchemaValidationResult<WorkspaceSnapshot> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}WorkspaceSnapshot must be object`] };
  if (!isNonEmptyString(input.snapshotId)) errors.push(`${pathPrefix}snapshotId must be non-empty string`);
  if (!isIsoDateString(input.createdAt)) errors.push(`${pathPrefix}createdAt must be ISO date string`);
  const summary = validateWorkspaceSummary(input.summary, `${pathPrefix}summary.`);
  if (summary.ok === false) errors.push(...summary.errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: input as WorkspaceSnapshot };
}
