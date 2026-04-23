import { MemoryNotificationDecisionRepository } from '../persistence/memory-notification-repository.js';
import { getLatestNotifyingDecisionReplay, getNotificationDecisionReplayById, listDecisionReplaysForReasoningRun } from '../persistence/replay.js';
import { serializeNotificationDecision } from '../persistence/serialization.js';
import type { NotificationDecision } from '@elceo/types';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export async function runPersistenceReplayTests(): Promise<void> {
  const repo = new MemoryNotificationDecisionRepository();
  const decision: NotificationDecision = {
    decisionId: 'decision-1',
    decisionKey: 'decision|critical_drift|drift|drift-1',
    shouldFire: true,
    shouldNotify: true,
    reason: 'notify',
    triggerKind: 'critical_drift' as const,
    channels: ['in_app' as const],
    cooldownApplied: false,
    suppressionApplied: false,
    evidenceIds: ['e1'],
    createdAt: '2026-01-15T10:05:00.000Z',
    asset: 'XAU/USD' as const,
    timeframe: 'H1' as const,
    ruleKey: 'critical_drift' as const,
    reasoningRunId: 'run-1',
    snapshotId: 'snap-cur',
    driftId: 'drift-1',
    materialityScore: 90,
    materialityBand: 'critical' as const,
    minMaterialityScore: 70,
    suppressionReason: null,
    cooldownUntil: '2026-01-15T10:35:00.000Z',
    headline: 'h',
    body: 'b',
    evaluatedAt: '2026-01-15T10:05:00.000Z'
  };

  await repo.saveDecision({
    decisionId: decision.decisionId!,
    decisionKey: decision.decisionKey!,
    asset: decision.asset!,
    timeframe: decision.timeframe!,
    ruleKey: decision.ruleKey!,
    triggerKind: decision.triggerKind,
    reasoningRunId: decision.reasoningRunId ?? null,
    snapshotId: decision.snapshotId ?? null,
    driftId: decision.driftId ?? null,
    materialityScore: decision.materialityScore!,
    shouldNotify: true,
    suppressionReason: null,
    channelsJson: JSON.stringify(decision.channels),
    cooldownUntil: decision.cooldownUntil ?? null,
    headline: decision.headline!,
    body: decision.body!,
    createdAt: decision.createdAt,
    decisionJson: serializeNotificationDecision(decision)
  });

  const replay = await getNotificationDecisionReplayById('decision-1', repo);
  assert(replay?.decision.decisionId === 'decision-1', 'save/get replay should work');

  const latest = await getLatestNotifyingDecisionReplay('XAU/USD', 'H1', repo, 'critical_drift');
  assert(latest !== null, 'latest notifying replay should resolve');

  const listed = await listDecisionReplaysForReasoningRun('run-1', repo);
  assert(listed.length === 1, 'list decisions for reasoning run should work');

  await repo.saveDecision({
    decisionId: 'bad',
    decisionKey: 'bad-key',
    asset: 'XAU/USD',
    timeframe: 'H1',
    ruleKey: 'critical_drift',
    triggerKind: 'critical_drift',
    reasoningRunId: 'run-1',
    snapshotId: null,
    driftId: null,
    materialityScore: 1,
    shouldNotify: false,
    suppressionReason: 'condition_not_met',
    channelsJson: '[]',
    cooldownUntil: null,
    headline: 'h',
    body: 'b',
    createdAt: '2026-01-15T10:06:00.000Z',
    decisionJson: '{bad json'
  });

  let malformedFailed = false;
  try {
    await getNotificationDecisionReplayById('bad', repo);
  } catch {
    malformedFailed = true;
  }
  assert(malformedFailed, 'malformed decision JSON should fail deterministically');
}
