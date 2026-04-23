import { buildCooldownUntil, isCooldownActive } from '../policy/cooldown.js';
import type { PersistedNotificationDecisionRecord } from '../persistence/contracts.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function decision(overrides: Partial<PersistedNotificationDecisionRecord> = {}): PersistedNotificationDecisionRecord {
  return {
    decisionId: 'd1',
    decisionKey: 'k1',
    asset: 'XAU/USD',
    timeframe: 'H1',
    ruleKey: 'critical_drift',
    triggerKind: 'critical_drift',
    reasoningRunId: 'run-1',
    snapshotId: 'snap-1',
    driftId: 'drift-1',
    materialityScore: 90,
    shouldNotify: true,
    suppressionReason: null,
    channelsJson: '[]',
    cooldownUntil: '2026-01-15T10:30:00.000Z',
    headline: 'h',
    body: 'b',
    createdAt: '2026-01-15T10:00:00.000Z',
    decisionJson: '{}',
    ...overrides
  };
}

export function runCooldownTests(): void {
  assert(buildCooldownUntil('2026-01-15T10:00:00.000Z', 30) === '2026-01-15T10:30:00.000Z', 'cooldownUntil must add exact minutes');
  assert(isCooldownActive(null, '2026-01-15T10:10:00.000Z') === false, 'no prior decision => no cooldown');
  assert(isCooldownActive(decision(), '2026-01-15T10:10:00.000Z') === true, 'cooldown active while now < cooldownUntil');
  assert(isCooldownActive(decision({ shouldNotify: false }), '2026-01-15T10:10:00.000Z') === false, 'non-notifying prior decision does not activate cooldown');
}
