import { matchSubscriptionsForDecision } from '../delivery/subscription-matcher.js';
import { MemoryNotificationSubscriptionRepository } from '../persistence/memory-notification-repository.js';
import { buildDecision, buildDecisionRecord } from './test-fixtures.js';

const assert = (condition: boolean, message: string): void => { if (!condition) throw new Error(message); };

export async function runSubscriptionMatcherTests(): Promise<void> {
  const subscriptionRepository = new MemoryNotificationSubscriptionRepository();
  await subscriptionRepository.saveSubscription({ subscriptionId: 's1', subjectKind: 'workspace', subjectId: 'w1', channel: 'email', asset: '*', timeframe: '*', ruleKey: '*', enabled: true, minMaterialityScore: 95, createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z' });
  await subscriptionRepository.saveSubscription({ subscriptionId: 's2', subjectKind: 'user', subjectId: 'u1', channel: 'in_app', asset: 'XAU/USD', timeframe: 'H1', ruleKey: 'critical_drift', enabled: true, minMaterialityScore: 80, createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z' });

  const decision = buildDecision({ channels: ['in_app', 'email'], materialityScore: 90 });
  const matches = await matchSubscriptionsForDecision(buildDecisionRecord(), decision, { subscriptionRepository });
  assert(matches.length === 1 && matches[0]?.subscriptionId === 's2', 'exact and materiality matching should work; wildcard+threshold failure filtered');
}
