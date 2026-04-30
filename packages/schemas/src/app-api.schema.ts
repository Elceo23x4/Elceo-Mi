import type {
  AccountAccessCheckRequest,
  AdminEntitlementOverrideRequest,
  AdminEntitlementPlanRequest,
  AdminEntitlementStateRequest,
  ActionCreateRequest,
  ActionUpdateRequest,
  JournalAdjustExecutionRequest,
  JournalCancelRequest,
  JournalCloseRequest,
  JournalCreateDraftRequest,
  JournalExecuteRequest,
  JournalPartialCloseRequest,
  JournalPlanRequest,
  JournalReviewRequest,
  PositionCancelRequest,
  PositionCloseRequest,
  PositionCreateRequest,
  PositionOpenRequest,
  PositionReduceRequest,
  PositionThesisHealthRequest,
  PositionUpdateRequest,
  SubscriptionCreateRequest,
  SubscriptionUpdateRequest,
  TargetCreateRequest,
  TargetStatusRequest,
  VerificationConsumeRequest,
  VerificationIssueRequest,
  WatchlistCreateRequest,
  WatchlistStatusRequest,
  WatchlistThesisHealthRequest,
  WatchlistUpdateRequest,
  WorkspaceRefreshRequest
} from '@elceo/types';
import { SNAPSHOT_REFRESH_TRIGGER_KINDS } from '@elceo/types';
import { JOURNAL_CONVICTION_LABELS, JOURNAL_EXECUTION_QUALITY_LABELS, JOURNAL_OUTCOME_LABELS, TRADE_DIRECTIONS } from './journal.schema';
import { THESIS_HEALTH_VALUES, WATCHLIST_ENTRY_STATUSES, WATCHLIST_PRIORITIES, PORTFOLIO_ACTION_KINDS } from './portfolio.schema';
import { TIMEFRAMES } from './event.schema';
import { isEnumValue, isFiniteNumber, isIsoDateString, isNonEmptyString, isObjectRecord, isStringArray, type SchemaValidationResult } from './validation-utils';

const NOTIFICATION_CHANNELS = ['in_app', 'email', 'push', 'sms', 'webhook'] as const;
const NOTIFICATION_TRIGGER_KINDS = [
  'contradiction_spike','invalidation_breach','state_flip','confidence_drop','macro_event_imminent','macro_event_live','evidence_refresh','freshness_decay','watchlist_signal','admin_source_failure','admin_staleness','admin_replay_ready','reasoning_failure','reasoning_degraded','cognition_initialized','bias_flip','critical_drift','major_drift','invalidation_risk_upgrade','confidence_breakdown'
] as const;

function validateObject(input: unknown): SchemaValidationResult<Record<string, unknown>> {
  if (!isObjectRecord(input)) return { ok: false, errors: ['body must be object'] };
  return { ok: true, value: input };
}
const isNullableString = (v: unknown): v is string | null => v === null || isNonEmptyString(v);
const isNullableNumber = (v: unknown): v is number | null => v === null || isFiniteNumber(v);
function validateNumberArray(value: unknown, field: string, errors: string[]): void {
  if (!Array.isArray(value)) { errors.push(`${field} must be number[]`); return; }
  value.forEach((item, index) => { if (!isFiniteNumber(item)) errors.push(`${field}[${index}] must be finite number`); });
}

function validateStringArray(value: unknown, field: string, errors: string[]): void {
  if (!isStringArray(value)) errors.push(`${field} must be string[]`);
}

export function validateWorkspaceRefreshRequest(input: unknown): SchemaValidationResult<WorkspaceRefreshRequest> {
  const parsed = validateObject(input); if (!parsed.ok) return { ok: false, errors: (parsed as { ok: false; errors: string[] }).errors };
  const errors: string[] = [];
  if (!isEnumValue(parsed.value.triggerKind, SNAPSHOT_REFRESH_TRIGGER_KINDS)) errors.push('triggerKind is invalid');
  return errors.length ? { ok: false, errors } : { ok: true, value: parsed.value as WorkspaceRefreshRequest };
}

export function validateJournalCreateDraftRequest(input: unknown): SchemaValidationResult<JournalCreateDraftRequest> {
  const parsed = validateObject(input); if (!parsed.ok) return { ok: false, errors: (parsed as { ok: false; errors: string[] }).errors };
  const v = parsed.value; const errors: string[] = [];
  if (!isNonEmptyString(v.asset)) errors.push('asset must be non-empty string');
  if (!isEnumValue(v.timeframe, TIMEFRAMES)) errors.push('timeframe is invalid');
  if (!isNonEmptyString(v.title)) errors.push('title must be non-empty string');
  if (!(v.direction === undefined || isEnumValue(v.direction, TRADE_DIRECTIONS))) errors.push('direction is invalid');
  if (!(v.setupType === undefined || isNonEmptyString(v.setupType))) errors.push('setupType must be non-empty string');
  if (!(v.conviction === undefined || isEnumValue(v.conviction, JOURNAL_CONVICTION_LABELS))) errors.push('conviction is invalid');
  if (!(v.thesis === undefined || isNonEmptyString(v.thesis))) errors.push('thesis must be non-empty string');
  ['linkedReasoningRunId', 'linkedSnapshotId', 'linkedDriftId'].forEach((field) => {
    const value = v[field]; if (!(value === undefined || value === null || isNonEmptyString(value))) errors.push(`${field} must be non-empty string | null`);
  });
  return errors.length ? { ok: false, errors } : { ok: true, value: v as JournalCreateDraftRequest };
}

function validateJournalPatchBody(input: unknown, allowClose = false): SchemaValidationResult<Record<string, unknown>> {
  const parsed = validateObject(input); if (!parsed.ok) return { ok: false, errors: (parsed as { ok: false; errors: string[] }).errors };
  const v = parsed.value; const errors: string[] = [];
  if (v.direction !== undefined && !isEnumValue(v.direction, TRADE_DIRECTIONS)) errors.push('direction is invalid');
  if (v.conviction !== undefined && !isEnumValue(v.conviction, JOURNAL_CONVICTION_LABELS)) errors.push('conviction is invalid');
  if (v.executionQuality !== undefined && !(v.executionQuality === null || isEnumValue(v.executionQuality, JOURNAL_EXECUTION_QUALITY_LABELS))) errors.push('executionQuality is invalid');
  if (v.outcome !== undefined && !isEnumValue(v.outcome, JOURNAL_OUTCOME_LABELS)) errors.push('outcome is invalid');
  ['title', 'thesis', 'setupType'].forEach((f) => { if (v[f] !== undefined && !isNonEmptyString(v[f])) errors.push(`${f} must be non-empty string`); });
  ['entryPricePlanned', 'stopLossPlanned', 'riskAmountPlanned', 'riskPercentPlanned', 'entryPriceExecuted', 'positionSize', 'exitPrice', 'pnlAmount', 'pnlPercent', 'rMultiple', 'size', 'entryPrice', 'stopLoss'].forEach((f) => {
    if (v[f] !== undefined && !isNullableNumber(v[f])) errors.push(`${f} must be finite number | null`);
  });
  ['openedAt', 'closedAt', 'reviewedAt', 'lastAdjustedAt', 'updatedAt'].forEach((f) => {
    if (v[f] !== undefined && !isIsoDateString(v[f])) errors.push(`${f} must be ISO timestamp`);
  });
  ['invalidationNote', 'closureReason', 'note'].forEach((f) => { if (v[f] !== undefined && !isNullableString(v[f])) errors.push(`${f} must be non-empty string | null`); });
  ['takeProfitPlanned', 'takeProfitLevels'].forEach((f) => { if (v[f] !== undefined) validateNumberArray(v[f], f, errors); });
  ['executionChecklist', 'notes', 'whatWentWell', 'whatWentWrong', 'lessons', 'behaviorTags', 'followUpActions'].forEach((f) => {
    if (v[f] !== undefined) validateStringArray(v[f], f, errors);
  });
  if (allowClose && !isIsoDateString(v.closedAt)) errors.push('closedAt must be ISO timestamp');
  return errors.length ? { ok: false, errors } : { ok: true, value: v };
}

export const validateJournalPlanRequest = (i: unknown): SchemaValidationResult<JournalPlanRequest> => validateJournalPatchBody(i) as SchemaValidationResult<JournalPlanRequest>;
export function validateJournalExecuteRequest(i: unknown): SchemaValidationResult<JournalExecuteRequest> { const r = validateJournalPatchBody(i); if (!r.ok) return { ok: false, errors: (r as { ok: false; errors: string[] }).errors }; if (!isIsoDateString(r.value.openedAt)) return { ok: false, errors: ['openedAt must be ISO timestamp'] }; return { ok: true, value: r.value as JournalExecuteRequest }; }
export const validateJournalAdjustExecutionRequest = (i: unknown): SchemaValidationResult<JournalAdjustExecutionRequest> => validateJournalPatchBody(i) as SchemaValidationResult<JournalAdjustExecutionRequest>;
export const validateJournalPartialCloseRequest = (i: unknown): SchemaValidationResult<JournalPartialCloseRequest> => validateJournalPatchBody(i) as SchemaValidationResult<JournalPartialCloseRequest>;
export function validateJournalCloseRequest(i: unknown): SchemaValidationResult<JournalCloseRequest> { const r = validateJournalPatchBody(i, true); if (!r.ok) return { ok: false, errors: (r as { ok: false; errors: string[] }).errors }; if (!isEnumValue(r.value.outcome, JOURNAL_OUTCOME_LABELS) || r.value.outcome === 'open') return { ok: false, errors: ['outcome must be closed outcome label'] }; return { ok: true, value: r.value as JournalCloseRequest }; }
export const validateJournalCancelRequest = (i: unknown): SchemaValidationResult<JournalCancelRequest> => validateJournalPatchBody(i) as SchemaValidationResult<JournalCancelRequest>;
export function validateJournalReviewRequest(i: unknown): SchemaValidationResult<JournalReviewRequest> { const r = validateJournalPatchBody(i); if (!r.ok) return { ok: false, errors: (r as { ok: false; errors: string[] }).errors }; if (!isIsoDateString(r.value.reviewedAt)) return { ok: false, errors: ['reviewedAt must be ISO timestamp'] }; return { ok: true, value: r.value as JournalReviewRequest }; }

export function validateWatchlistCreateRequest(i: unknown): SchemaValidationResult<WatchlistCreateRequest> {
  const r = validateObject(i); if (!r.ok) return { ok: false, errors: (r as { ok: false; errors: string[] }).errors }; const v = r.value; const errors: string[] = [];
  if (!isNonEmptyString(v.asset)) errors.push('asset must be non-empty string');
  if (!isEnumValue(v.timeframe, TIMEFRAMES)) errors.push('timeframe is invalid');
  if (!isEnumValue(v.priority, WATCHLIST_PRIORITIES)) errors.push('priority is invalid');
  if (!(v.status === undefined || isEnumValue(v.status, WATCHLIST_ENTRY_STATUSES))) errors.push('status is invalid');
  if (!(v.thesisHealth === undefined || isEnumValue(v.thesisHealth, THESIS_HEALTH_VALUES))) errors.push('thesisHealth is invalid');
  if (!(v.note === undefined || isNullableString(v.note))) errors.push('note must be non-empty string | null');
  return errors.length ? { ok: false, errors } : { ok: true, value: v as WatchlistCreateRequest };
}

export const validateWatchlistUpdateRequest = (i: unknown): SchemaValidationResult<WatchlistUpdateRequest> => validateJournalPatchBody(i) as SchemaValidationResult<WatchlistUpdateRequest>;
export function validateWatchlistStatusRequest(i: unknown): SchemaValidationResult<WatchlistStatusRequest> { const r = validateObject(i); if (!r.ok) return { ok: false, errors: (r as { ok: false; errors: string[] }).errors }; return isEnumValue(r.value.status, WATCHLIST_ENTRY_STATUSES) ? { ok: true, value: r.value as WatchlistStatusRequest } : { ok: false, errors: ['status is invalid'] }; }
export function validateWatchlistThesisHealthRequest(i: unknown): SchemaValidationResult<WatchlistThesisHealthRequest> { const r = validateObject(i); if (!r.ok) return { ok: false, errors: (r as { ok: false; errors: string[] }).errors }; return isEnumValue(r.value.thesisHealth, THESIS_HEALTH_VALUES) ? { ok: true, value: r.value as WatchlistThesisHealthRequest } : { ok: false, errors: ['thesisHealth is invalid'] }; }

export const validatePositionCreateRequest = (i: unknown): SchemaValidationResult<PositionCreateRequest> => validateJournalPatchBody(i) as SchemaValidationResult<PositionCreateRequest>;
export function validatePositionOpenRequest(i: unknown): SchemaValidationResult<PositionOpenRequest> { const r = validateJournalPatchBody(i); if (!r.ok) return { ok: false, errors: (r as { ok: false; errors: string[] }).errors }; if (!isIsoDateString(r.value.openedAt)) return { ok: false, errors: ['openedAt must be ISO timestamp'] }; return { ok: true, value: r.value as PositionOpenRequest }; }
export const validatePositionReduceRequest = (i: unknown): SchemaValidationResult<PositionReduceRequest> => validateJournalPatchBody(i) as SchemaValidationResult<PositionReduceRequest>;
export function validatePositionCloseRequest(i: unknown): SchemaValidationResult<PositionCloseRequest> { const r = validateJournalPatchBody(i); if (!r.ok) return { ok: false, errors: (r as { ok: false; errors: string[] }).errors }; if (!isIsoDateString(r.value.closedAt)) return { ok: false, errors: ['closedAt must be ISO timestamp'] }; return { ok: true, value: r.value as PositionCloseRequest }; }
export const validatePositionCancelRequest = (i: unknown): SchemaValidationResult<PositionCancelRequest> => validateJournalPatchBody(i) as SchemaValidationResult<PositionCancelRequest>;
export const validatePositionUpdateRequest = (i: unknown): SchemaValidationResult<PositionUpdateRequest> => validateJournalPatchBody(i) as SchemaValidationResult<PositionUpdateRequest>;
export function validatePositionThesisHealthRequest(i: unknown): SchemaValidationResult<PositionThesisHealthRequest> { return validateWatchlistThesisHealthRequest(i) as SchemaValidationResult<PositionThesisHealthRequest>; }

export function validateActionCreateRequest(i: unknown): SchemaValidationResult<ActionCreateRequest> {
  const r = validateObject(i); if (!r.ok) return { ok: false, errors: (r as { ok: false; errors: string[] }).errors }; const v = r.value; const errors: string[] = [];
  if (!isEnumValue(v.kind, PORTFOLIO_ACTION_KINDS)) errors.push('kind is invalid');
  if (!isEnumValue(v.priority, WATCHLIST_PRIORITIES)) errors.push('priority is invalid');
  if (!(v.asset === undefined || v.asset === null || isNonEmptyString(v.asset))) errors.push('asset must be non-empty string | null');
  if (!(v.timeframe === undefined || v.timeframe === null || isEnumValue(v.timeframe, TIMEFRAMES))) errors.push('timeframe is invalid');
  if (!isNonEmptyString(v.headline)) errors.push('headline must be non-empty string');
  if (!isNonEmptyString(v.rationale)) errors.push('rationale must be non-empty string');
  return errors.length ? { ok: false, errors } : { ok: true, value: v as ActionCreateRequest };
}
export const validateActionUpdateRequest = (i: unknown): SchemaValidationResult<ActionUpdateRequest> => validateJournalPatchBody(i) as SchemaValidationResult<ActionUpdateRequest>;

export function validateTargetCreateRequest(i: unknown): SchemaValidationResult<TargetCreateRequest> {
  const r = validateObject(i); if (!r.ok) return { ok: false, errors: (r as { ok: false; errors: string[] }).errors }; const v = r.value; const errors: string[] = [];
  if (!isEnumValue(v.channel, NOTIFICATION_CHANNELS)) errors.push('channel is invalid');
  if (!isNonEmptyString(v.value)) errors.push('value must be non-empty string');
  if (!(v.label === undefined || isNullableString(v.label))) errors.push('label must be non-empty string | null');
  return errors.length ? { ok: false, errors } : { ok: true, value: v as TargetCreateRequest };
}
export function validateTargetStatusRequest(i: unknown): SchemaValidationResult<TargetStatusRequest> { const r = validateObject(i); if (!r.ok) return { ok: false, errors: (r as { ok: false; errors: string[] }).errors }; return typeof r.value.isEnabled === 'boolean' ? { ok: true, value: r.value as TargetStatusRequest } : { ok: false, errors: ['isEnabled must be boolean'] }; }
export function validateSubscriptionCreateRequest(i: unknown): SchemaValidationResult<SubscriptionCreateRequest> {
  const r = validateObject(i); if (!r.ok) return { ok: false, errors: (r as { ok: false; errors: string[] }).errors }; const v = r.value; const errors: string[] = [];
  if (!isEnumValue(v.channel, NOTIFICATION_CHANNELS)) errors.push('channel is invalid');
  if (!(v.decisionKind === undefined || v.decisionKind === null || isEnumValue(v.decisionKind, NOTIFICATION_TRIGGER_KINDS))) errors.push('decisionKind is invalid');
  if (!(v.minimumPriority === undefined || isNullableString(v.minimumPriority))) errors.push('minimumPriority must be non-empty string | null');
  if (!(v.minimumMaterialityScore === undefined || isNullableNumber(v.minimumMaterialityScore))) errors.push('minimumMaterialityScore must be finite number | null');
  if (!(v.isEnabled === undefined || typeof v.isEnabled === 'boolean')) errors.push('isEnabled must be boolean');
  return errors.length ? { ok: false, errors } : { ok: true, value: v as SubscriptionCreateRequest };
}
export const validateSubscriptionUpdateRequest = (i: unknown): SchemaValidationResult<SubscriptionUpdateRequest> => validateSubscriptionCreateRequest(i) as SchemaValidationResult<SubscriptionUpdateRequest>;
export function validateVerificationIssueRequest(i: unknown): SchemaValidationResult<VerificationIssueRequest> { const r = validateObject(i); if (!r.ok) return { ok: false, errors: (r as { ok: false; errors: string[] }).errors }; return isNonEmptyString(r.value.targetId) ? { ok: true, value: r.value as VerificationIssueRequest } : { ok: false, errors: ['targetId must be non-empty string'] }; }
export function validateVerificationConsumeRequest(i: unknown): SchemaValidationResult<VerificationConsumeRequest> { const r = validateObject(i); if (!r.ok) return { ok: false, errors: (r as { ok: false; errors: string[] }).errors }; const errors: string[] = []; if (!isNonEmptyString(r.value.targetId)) errors.push('targetId must be non-empty string'); if (!isNonEmptyString(r.value.token)) errors.push('token must be non-empty string'); return errors.length ? { ok: false, errors } : { ok: true, value: r.value as VerificationConsumeRequest }; }

export function validateAccountAccessCheckRequest(i: unknown): SchemaValidationResult<AccountAccessCheckRequest> {
  const r = validateObject(i); if (!r.ok) return { ok: false, errors: (r as { ok: false; errors: string[] }).errors };
  return isNonEmptyString(r.value.feature) ? { ok: true, value: r.value as AccountAccessCheckRequest } : { ok: false, errors: ['feature is invalid'] };
}

export function validateAdminEntitlementPlanRequest(i: unknown): SchemaValidationResult<AdminEntitlementPlanRequest> {
  const r = validateObject(i); if (!r.ok) return { ok: false, errors: (r as { ok: false; errors: string[] }).errors }; const v = r.value; const errors: string[] = [];
  if (!isNonEmptyString(v.subjectId)) errors.push('subjectId must be non-empty string');
  if (!(v.planKind === 'free' || v.planKind === 'premium' || v.planKind === 'admin_internal')) errors.push('planKind is invalid');
  ['planStartedAt','planEndsAt','trialEndsAt'].forEach((f)=>{ const x=v[f]; if (!(x===undefined || x===null || isIsoDateString(x))) errors.push(`${f} must be ISO timestamp | null`); });
  return errors.length ? { ok: false, errors } : { ok: true, value: v as AdminEntitlementPlanRequest };
}

export function validateAdminEntitlementStateRequest(i: unknown): SchemaValidationResult<AdminEntitlementStateRequest> {
  const r = validateObject(i); if (!r.ok) return { ok: false, errors: (r as { ok: false; errors: string[] }).errors };
  const validState = r.value.accountState === 'active' || r.value.accountState === 'suspended' || r.value.accountState === 'restricted' || r.value.accountState === 'canceled';
  if (!isNonEmptyString(r.value.subjectId) || !validState) return { ok: false, errors: ['subjectId or accountState is invalid'] };
  return { ok: true, value: r.value as AdminEntitlementStateRequest };
}

export function validateAdminEntitlementOverrideRequest(i: unknown): SchemaValidationResult<AdminEntitlementOverrideRequest> {
  const r = validateObject(i); if (!r.ok) return { ok: false, errors: (r as { ok: false; errors: string[] }).errors };
  if (!isNonEmptyString(r.value.subjectId) || typeof r.value.internalOverride !== 'boolean') return { ok: false, errors: ['subjectId or internalOverride is invalid'] };
  return { ok: true, value: r.value as AdminEntitlementOverrideRequest };
}
