import { validateNotificationDecision, validateNotificationDeliveryReceipt, validateNotificationTargetHealthRecord } from '@elceo/schemas';
import type { NotificationDecision, NotificationDeliveryReceipt, NotificationTargetHealthRecord } from '@elceo/types';
import type { NotificationOrchestrationRunReport } from '../orchestration/contracts';

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error('malformed_json');
  }
}

export function serializeNotificationDecision(decision: NotificationDecision): string {
  return JSON.stringify(decision);
}

export function deserializeNotificationDecision(json: string): NotificationDecision {
  const parsed = parseJson(json);
  const validated = validateNotificationDecision(parsed);
  if (!validated.ok) {
    const errs = ('errors' in validated) ? validated.errors : [];
    throw new Error(`invalid_notification_decision:${errs.join('; ')}`);
  }
  return validated.value;
}

export function serializeNotificationOrchestrationRunReport(report: NotificationOrchestrationRunReport): string {
  return JSON.stringify(report);
}

export function deserializeNotificationOrchestrationRunReport(json: string): NotificationOrchestrationRunReport {
  const parsed = parseJson(json);
  if (!parsed || typeof parsed !== 'object') throw new Error('invalid_notification_orchestration_run_report:non_object');
  const candidate = parsed as Record<string, unknown>;
  const requiredString = (key: string): string => {
    const value = candidate[key];
    if (typeof value !== 'string') throw new Error(`invalid_notification_orchestration_run_report:${key}`);
    return value;
  };
  const requiredNumber = (key: string): number => {
    const value = candidate[key];
    if (typeof value !== 'number' || Number.isNaN(value)) throw new Error(`invalid_notification_orchestration_run_report:${key}`);
    return value;
  };
  const requiredNullableString = (key: string): string | null => {
    const value = candidate[key];
    if (value === null) return null;
    if (typeof value === 'string') return value;
    throw new Error(`invalid_notification_orchestration_run_report:${key}`);
  };
  const warningsCandidate = candidate.warnings;
  if (!Array.isArray(warningsCandidate) || warningsCandidate.some((entry) => typeof entry !== 'string')) throw new Error('invalid_notification_orchestration_run_report:warnings');
  const warnings = warningsCandidate as string[];
  const stage = requiredString('stage');
  const status = requiredString('status');
  if (!['policy_evaluation', 'delivery_staging', 'delivery_dispatch', 'verification_expiry', 'maintenance'].includes(stage)) {
    throw new Error('invalid_notification_orchestration_run_report:stage');
  }
  if (!['success', 'partial_success', 'failed'].includes(status)) {
    throw new Error('invalid_notification_orchestration_run_report:status');
  }
  return {
    orchestrationRunId: requiredString('orchestrationRunId'),
    stage: stage as NotificationOrchestrationRunReport['stage'],
    startedAt: requiredString('startedAt'),
    endedAt: requiredString('endedAt'),
    durationMs: requiredNumber('durationMs'),
    status: status as NotificationOrchestrationRunReport['status'],
    reasoningRunId: requiredNullableString('reasoningRunId'),
    policyEvaluationId: requiredNullableString('policyEvaluationId'),
    evaluatedDecisionCount: requiredNumber('evaluatedDecisionCount'),
    notifyingDecisionCount: requiredNumber('notifyingDecisionCount'),
    stagedOutboxCount: requiredNumber('stagedOutboxCount'),
    dispatchedOutboxCount: requiredNumber('dispatchedOutboxCount'),
    deliveredCount: requiredNumber('deliveredCount'),
    failedCount: requiredNumber('failedCount'),
    deadCount: requiredNumber('deadCount'),
    expiredVerificationCount: requiredNumber('expiredVerificationCount'),
    failureReason: requiredNullableString('failureReason'),
    warnings,
    createdAt: requiredString('createdAt')
  };
}

export function deserializeNotificationDeliveryReceipt(json: string): NotificationDeliveryReceipt {
  const parsed = parseJson(json);
  const validated = validateNotificationDeliveryReceipt(parsed);
  if (!validated.ok) throw new Error(`invalid_notification_delivery_receipt:${('errors' in validated ? validated.errors : []).join('; ')}`);
  return validated.value;
}

export function deserializeNotificationTargetHealthRecord(json: string): NotificationTargetHealthRecord {
  const parsed = parseJson(json);
  const validated = validateNotificationTargetHealthRecord(parsed);
  if (!validated.ok) throw new Error(`invalid_notification_target_health:${('errors' in validated ? validated.errors : []).join('; ')}`);
  return validated.value;
}
