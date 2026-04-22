import type { NotificationDecision, NotificationTriggerContext, NotificationTriggerRule } from '@elceo/types';
import type { SchemaValidationResult } from './event.schema';

export function validateNotificationTriggerRule(input: unknown): SchemaValidationResult<NotificationTriggerRule> {
  if (!input || typeof input !== 'object') return { ok: false, errors: ['NotificationTriggerRule must be object'] };
  const rule = input as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof rule.triggerKind !== 'string') errors.push('triggerKind required');
  if (typeof rule.enabled !== 'boolean') errors.push('enabled must be boolean');
  if (!Array.isArray(rule.channels)) errors.push('channels must be array');
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input as NotificationTriggerRule };
}

export function validateNotificationTriggerContext(input: unknown): SchemaValidationResult<NotificationTriggerContext> {
  if (!input || typeof input !== 'object') return { ok: false, errors: ['NotificationTriggerContext must be object'] };
  const ctx = input as Record<string, unknown>;
  if (typeof ctx.asOf !== 'string') return { ok: false, errors: ['asOf must be string'] };
  return { ok: true, value: input as NotificationTriggerContext };
}

export function validateNotificationDecision(input: unknown): SchemaValidationResult<NotificationDecision> {
  if (!input || typeof input !== 'object') return { ok: false, errors: ['NotificationDecision must be object'] };
  const decision = input as Record<string, unknown>;
  if (typeof decision.shouldFire !== 'boolean') return { ok: false, errors: ['shouldFire must be boolean'] };
  return { ok: true, value: input as NotificationDecision };
}
