import type {
  NotificationChannel,
  NotificationDecision,
  NotificationInboxRecord,
  NotificationMaterialityBand,
  NotificationPolicyRuleKey,
  NotificationSubscriptionRecord,
  NotificationSuppressionReason,
  NotificationSubjectKind,
  NotificationTargetChannelStatus,
  NotificationTargetKind,
  NotificationTargetRecord,
  NotificationTriggerContext,
  NotificationTriggerKind,
  NotificationTriggerRule
} from '@elceo/types';
import { validateCanonicalCognitionState } from './cognition.schema';
import { TIMEFRAMES } from './event.schema';
import {
  isBoolean,
  isEnumValue,
  isIsoDateString,
  isNonEmptyString,
  isObjectRecord,
  isStringArray,
  type SchemaValidationResult
} from './validation-utils';

const NOTIFICATION_CHANNELS: NotificationChannel[] = ['in_app', 'email', 'push', 'sms', 'webhook'];
const NOTIFICATION_TRIGGER_KINDS: NotificationTriggerKind[] = [
  'contradiction_spike',
  'invalidation_breach',
  'state_flip',
  'confidence_drop',
  'macro_event_imminent',
  'macro_event_live',
  'evidence_refresh',
  'freshness_decay',
  'watchlist_signal',
  'admin_source_failure',
  'admin_staleness',
  'admin_replay_ready',
  'reasoning_failure',
  'reasoning_degraded',
  'cognition_initialized',
  'bias_flip',
  'critical_drift',
  'major_drift',
  'invalidation_risk_upgrade',
  'confidence_breakdown'
];
const POLICY_RULE_KEYS: NotificationPolicyRuleKey[] = [
  'reasoning_failure',
  'reasoning_degraded',
  'cognition_initialized',
  'bias_flip',
  'critical_drift',
  'major_drift',
  'invalidation_risk_upgrade',
  'contradiction_spike',
  'confidence_breakdown',
  'freshness_decay'
];
const MATERIALITY_BANDS: NotificationMaterialityBand[] = ['low', 'medium', 'high', 'critical'];
const SUPPRESSION_REASONS: NotificationSuppressionReason[] = ['condition_not_met', 'below_materiality_threshold', 'cooldown_active', 'missing_required_context'];
const SUBJECT_KINDS: NotificationSubjectKind[] = ['user', 'workspace', 'ops'];
const TARGET_STATUSES: NotificationTargetChannelStatus[] = ['active', 'disabled', 'unverified'];
const TARGET_KINDS: NotificationTargetKind[] = ['in_app_user', 'email_address', 'push_endpoint'];

export function validateNotificationTriggerRule(input: unknown, pathPrefix = ''): SchemaValidationResult<NotificationTriggerRule> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}NotificationTriggerRule must be object`] };

  if (!isEnumValue(input.triggerKind, NOTIFICATION_TRIGGER_KINDS)) errors.push(`${pathPrefix}triggerKind is invalid`);
  if (!(input.asset === null || isNonEmptyString(input.asset))) errors.push(`${pathPrefix}asset must be non-empty string or null`);
  if (!(input.timeframe === null || isEnumValue(input.timeframe, TIMEFRAMES))) errors.push(`${pathPrefix}timeframe must be Timeframe or null`);
  if (!isBoolean(input.enabled)) errors.push(`${pathPrefix}enabled must be boolean`);
  if (!(input.threshold === null || (typeof input.threshold === 'number' && Number.isFinite(input.threshold)))) {
    errors.push(`${pathPrefix}threshold must be finite number or null`);
  }
  if (typeof input.cooldownMinutes !== 'number' || input.cooldownMinutes < 0) errors.push(`${pathPrefix}cooldownMinutes must be >= 0`);
  if (typeof input.suppressionWindowMinutes !== 'number' || input.suppressionWindowMinutes < 0) {
    errors.push(`${pathPrefix}suppressionWindowMinutes must be >= 0`);
  }
  if (!(input.entitlementRequired === null || isNonEmptyString(input.entitlementRequired))) {
    errors.push(`${pathPrefix}entitlementRequired must be non-empty string or null`);
  }

  if (!Array.isArray(input.channels) || !input.channels.every((channel) => isEnumValue(channel, NOTIFICATION_CHANNELS))) {
    errors.push(`${pathPrefix}channels must be NotificationChannel[]`);
  }
  if (!isNonEmptyString(input.version)) errors.push(`${pathPrefix}version must be non-empty string`);
  if (!(input.ruleKey === undefined || isEnumValue(input.ruleKey, POLICY_RULE_KEYS))) errors.push(`${pathPrefix}ruleKey is invalid`);
  if (!(input.minMaterialityScore === undefined || (typeof input.minMaterialityScore === 'number' && Number.isFinite(input.minMaterialityScore)))) {
    errors.push(`${pathPrefix}minMaterialityScore must be finite number`);
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as NotificationTriggerRule };
}

export function validateNotificationTriggerContext(input: unknown, pathPrefix = ''): SchemaValidationResult<NotificationTriggerContext> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}NotificationTriggerContext must be object`] };

  const cognitionValidation = validateCanonicalCognitionState(input.cognition, `${pathPrefix}cognition.`);
  if (cognitionValidation.ok === false) errors.push(...cognitionValidation.errors);

  if (!(input.previousCognition === null || validateCanonicalCognitionState(input.previousCognition).ok)) {
    errors.push(`${pathPrefix}previousCognition must be null or valid CanonicalCognitionState`);
  }
  if (!isIsoDateString(input.asOf)) errors.push(`${pathPrefix}asOf must be ISO date`);
  if (!(input.userId === null || isNonEmptyString(input.userId))) errors.push(`${pathPrefix}userId must be non-empty string or null`);
  if (!isBoolean(input.watchlistMatch)) errors.push(`${pathPrefix}watchlistMatch must be boolean`);
  if (!isBoolean(input.adminMode)) errors.push(`${pathPrefix}adminMode must be boolean`);

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as NotificationTriggerContext };
}

export function validateNotificationDecision(input: unknown, pathPrefix = ''): SchemaValidationResult<NotificationDecision> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}NotificationDecision must be object`] };

  if (!isBoolean(input.shouldFire)) errors.push(`${pathPrefix}shouldFire must be boolean`);
  if (!isNonEmptyString(input.reason)) errors.push(`${pathPrefix}reason must be non-empty string`);
  if (!isEnumValue(input.triggerKind, NOTIFICATION_TRIGGER_KINDS)) errors.push(`${pathPrefix}triggerKind is invalid`);
  if (!Array.isArray(input.channels) || !input.channels.every((channel) => isEnumValue(channel, NOTIFICATION_CHANNELS))) {
    errors.push(`${pathPrefix}channels must be NotificationChannel[]`);
  }
  if (!isBoolean(input.cooldownApplied)) errors.push(`${pathPrefix}cooldownApplied must be boolean`);
  if (!isBoolean(input.suppressionApplied)) errors.push(`${pathPrefix}suppressionApplied must be boolean`);
  if (!isStringArray(input.evidenceIds)) errors.push(`${pathPrefix}evidenceIds must be string[]`);
  if (!isIsoDateString(input.createdAt)) errors.push(`${pathPrefix}createdAt must be ISO date`);

  if (!(input.shouldNotify === undefined || isBoolean(input.shouldNotify))) errors.push(`${pathPrefix}shouldNotify must be boolean`);
  if (!(input.materialityScore === undefined || (typeof input.materialityScore === 'number' && Number.isFinite(input.materialityScore)))) {
    errors.push(`${pathPrefix}materialityScore must be finite number`);
  }
  if (!(input.materialityBand === undefined || isEnumValue(input.materialityBand, MATERIALITY_BANDS))) errors.push(`${pathPrefix}materialityBand is invalid`);
  if (!(input.ruleKey === undefined || isEnumValue(input.ruleKey, POLICY_RULE_KEYS))) errors.push(`${pathPrefix}ruleKey is invalid`);
  if (!(input.suppressionReason === undefined || input.suppressionReason === null || isEnumValue(input.suppressionReason, SUPPRESSION_REASONS))) {
    errors.push(`${pathPrefix}suppressionReason is invalid`);
  }
  if (!(input.cooldownUntil === undefined || input.cooldownUntil === null || isIsoDateString(input.cooldownUntil))) {
    errors.push(`${pathPrefix}cooldownUntil must be ISO date or null`);
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as NotificationDecision };
}

export function validateNotificationTargetRecord(input: unknown, pathPrefix = ''): SchemaValidationResult<NotificationTargetRecord> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}NotificationTargetRecord must be object`] };
  if (!isNonEmptyString(input.targetId)) errors.push(`${pathPrefix}targetId must be non-empty string`);
  if (!(input.targetKey === undefined || isNonEmptyString(input.targetKey))) errors.push(`${pathPrefix}targetKey must be non-empty string`);
  if (!isEnumValue(input.subjectKind, SUBJECT_KINDS)) errors.push(`${pathPrefix}subjectKind is invalid`);
  if (!isNonEmptyString(input.subjectId)) errors.push(`${pathPrefix}subjectId must be non-empty string`);
  if (!isEnumValue(input.channel, NOTIFICATION_CHANNELS)) errors.push(`${pathPrefix}channel is invalid`);
  if (!isEnumValue(input.targetKind, TARGET_KINDS)) errors.push(`${pathPrefix}targetKind is invalid`);
  if (!isEnumValue(input.status, TARGET_STATUSES)) errors.push(`${pathPrefix}status is invalid`);
  if (!(input.label === null || input.label === undefined || isNonEmptyString(input.label))) errors.push(`${pathPrefix}label must be non-empty string or null`);
  if (!isNonEmptyString(input.addressJson)) errors.push(`${pathPrefix}addressJson must be non-empty string`);
  if (!isIsoDateString(input.createdAt)) errors.push(`${pathPrefix}createdAt must be ISO date`);
  if (!isIsoDateString(input.updatedAt)) errors.push(`${pathPrefix}updatedAt must be ISO date`);
  if (!(input.verifiedAt === null || input.verifiedAt === undefined || isIsoDateString(input.verifiedAt))) errors.push(`${pathPrefix}verifiedAt must be ISO date or null`);
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as NotificationTargetRecord };
}

export function validateNotificationSubscriptionRecord(input: unknown, pathPrefix = ''): SchemaValidationResult<NotificationSubscriptionRecord> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}NotificationSubscriptionRecord must be object`] };
  if (!isNonEmptyString(input.subscriptionId)) errors.push(`${pathPrefix}subscriptionId must be non-empty string`);
  if (!(input.subscriptionKey === undefined || isNonEmptyString(input.subscriptionKey))) errors.push(`${pathPrefix}subscriptionKey must be non-empty string`);
  if (!isEnumValue(input.subjectKind, SUBJECT_KINDS)) errors.push(`${pathPrefix}subjectKind is invalid`);
  if (!isNonEmptyString(input.subjectId)) errors.push(`${pathPrefix}subjectId must be non-empty string`);
  if (!isEnumValue(input.channel, NOTIFICATION_CHANNELS)) errors.push(`${pathPrefix}channel is invalid`);
  if (!(input.asset === '*' || isNonEmptyString(input.asset))) errors.push(`${pathPrefix}asset must be non-empty string or *`);
  if (!(input.timeframe === '*' || isEnumValue(input.timeframe, TIMEFRAMES))) errors.push(`${pathPrefix}timeframe must be Timeframe or *`);
  if (!(input.ruleKey === '*' || isNonEmptyString(input.ruleKey))) errors.push(`${pathPrefix}ruleKey must be non-empty string or *`);
  if (!isBoolean(input.enabled)) errors.push(`${pathPrefix}enabled must be boolean`);
  if (!(input.minMaterialityScore === null || input.minMaterialityScore === undefined || (typeof input.minMaterialityScore === 'number' && Number.isFinite(input.minMaterialityScore)))) {
    errors.push(`${pathPrefix}minMaterialityScore must be finite number or null`);
  }
  if (!isIsoDateString(input.createdAt)) errors.push(`${pathPrefix}createdAt must be ISO date`);
  if (!isIsoDateString(input.updatedAt)) errors.push(`${pathPrefix}updatedAt must be ISO date`);
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as NotificationSubscriptionRecord };
}

export function validateNotificationInboxRecord(input: unknown, pathPrefix = ''): SchemaValidationResult<NotificationInboxRecord> {
  const errors: string[] = [];
  if (!isObjectRecord(input)) return { ok: false, errors: [`${pathPrefix}NotificationInboxRecord must be object`] };
  if (!isNonEmptyString(input.inboxId)) errors.push(`${pathPrefix}inboxId must be non-empty string`);
  if (!isNonEmptyString(input.targetId)) errors.push(`${pathPrefix}targetId must be non-empty string`);
  if (!(input.targetKey === undefined || isNonEmptyString(input.targetKey))) errors.push(`${pathPrefix}targetKey must be non-empty string`);
  if (!isNonEmptyString(input.decisionId)) errors.push(`${pathPrefix}decisionId must be non-empty string`);
  if (!isNonEmptyString(input.decisionKey)) errors.push(`${pathPrefix}decisionKey must be non-empty string`);
  if (!isNonEmptyString(input.asset)) errors.push(`${pathPrefix}asset must be non-empty string`);
  if (!isEnumValue(input.timeframe, TIMEFRAMES)) errors.push(`${pathPrefix}timeframe must be valid timeframe`);
  if (!isNonEmptyString(input.ruleKey)) errors.push(`${pathPrefix}ruleKey must be non-empty string`);
  if (!isNonEmptyString(input.headline)) errors.push(`${pathPrefix}headline must be non-empty string`);
  if (!isNonEmptyString(input.body)) errors.push(`${pathPrefix}body must be non-empty string`);
  if (!isIsoDateString(input.createdAt)) errors.push(`${pathPrefix}createdAt must be ISO date`);
  if (!(input.readAt === null || input.readAt === undefined || isIsoDateString(input.readAt))) errors.push(`${pathPrefix}readAt must be ISO date or null`);
  if (!(input.archivedAt === null || input.archivedAt === undefined || isIsoDateString(input.archivedAt))) errors.push(`${pathPrefix}archivedAt must be ISO date or null`);
  if (!isNonEmptyString(input.payloadJson)) errors.push(`${pathPrefix}payloadJson must be non-empty string`);
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as NotificationInboxRecord };
}
