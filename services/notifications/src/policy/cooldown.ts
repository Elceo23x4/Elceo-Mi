import type { NotificationSuppressionReason } from '@elceo/types';
import type { PersistedNotificationDecisionRecord } from '../persistence/contracts';

export type NotificationDecisionSuppressionReason = NotificationSuppressionReason;

export function buildCooldownUntil(evaluatedAtIso: string, cooldownMinutes: number): string {
  return new Date(Date.parse(evaluatedAtIso) + (cooldownMinutes * 60_000)).toISOString();
}

export function isCooldownActive(previousDecision: PersistedNotificationDecisionRecord | null, evaluatedAtIso: string): boolean {
  if (!previousDecision) return false;
  if (!previousDecision.shouldNotify) return false;
  if (previousDecision.cooldownUntil === null) return false;
  return Date.parse(evaluatedAtIso) < Date.parse(previousDecision.cooldownUntil);
}
