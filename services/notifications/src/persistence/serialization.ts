import { validateNotificationDecision } from '@elceo/schemas';
import type { NotificationDecision } from '@elceo/types';

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
