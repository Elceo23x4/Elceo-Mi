import { buildNotificationSubscriptionKey, buildNotificationTargetKey } from '../management/keys.js';
import { normalizeEmailAddress, normalizePushEndpoint } from '../management/normalization.js';

const assert = (condition: boolean, message: string): void => { if (!condition) throw new Error(message); };

export function runNotificationManagementKeyTests(): void {
  assert(normalizeEmailAddress('  USER@Example.COM  ') === 'user@example.com', 'email normalization must trim and lowercase');
  assert(normalizePushEndpoint('  token-1  ') === 'token-1', 'push normalization must trim only');

  const targetKeyA = buildNotificationTargetKey({ subjectKind: 'user', subjectId: 'u1', channel: 'email', targetKind: 'email_address', addressJson: '{"email":" User@Example.Com "}' });
  const targetKeyB = buildNotificationTargetKey({ subjectKind: 'user', subjectId: 'u1', channel: 'email', targetKind: 'email_address', addressJson: '{"email":"user@example.com"}' });
  assert(targetKeyA === targetKeyB, 'target key must be deterministic across normalized equivalents');

  const subscriptionKeyA = buildNotificationSubscriptionKey({ subjectKind: 'workspace', subjectId: 'w1', channel: 'in_app', assetScope: '*', timeframeScope: '*', ruleKeyScope: 'critical_drift' });
  const subscriptionKeyB = buildNotificationSubscriptionKey({ subjectKind: 'workspace', subjectId: 'w1', channel: 'in_app', assetScope: '*', timeframeScope: '*', ruleKeyScope: 'critical_drift' });
  assert(subscriptionKeyA === subscriptionKeyB, 'subscription key must be deterministic');
}
