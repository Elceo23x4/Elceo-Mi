import { evaluateNotificationPolicyForReasoningRun } from '../policy/decision-engine.js';
import { MemoryNotificationDecisionRepository } from '../persistence/memory-notification-repository.js';
import { MemoryReasoningPersistenceRepository } from '../../../reasoning/src/persistence/memory-reasoning-repository.js';
import { loadNotificationPolicyContextForReasoningRun } from '../policy/input-loader.js';
import { buildDriftRecord, buildReasoningRun, buildSnapshot } from './test-fixtures.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export async function runDecisionEngineTests(): Promise<void> {
  const reasoning = new MemoryReasoningPersistenceRepository();
  const decisions = new MemoryNotificationDecisionRepository();

  const previous = buildSnapshot('snap-prev', 'run-prev', '2026-01-15T10:00:00.000Z', {
    bias: 'bullish',
    contradiction: { score: 20, anatomy: { weightedScore: 20 } },
    confidence: { score: 76, anatomy: { weightedScore: 76 } },
    freshness: { freshnessScore: 80 }
  });
  const run = buildReasoningRun({ reasoningRunId: 'run-1', snapshotId: 'snap-cur', priorSnapshotId: 'snap-prev' });
  const current = buildSnapshot('snap-cur', run.reasoningRunId, '2026-01-15T10:05:00.000Z', {
    bias: 'bearish',
    contradiction: { score: 65, anatomy: { weightedScore: 65 } },
    confidence: { score: 40, anatomy: { weightedScore: 40 } },
    freshness: { freshnessScore: 35 },
    invalidation: { riskLabel: 'broken' }
  });

  await reasoning.runRepository.saveReasoningRun(buildReasoningRun({ reasoningRunId: 'run-prev', snapshotId: 'snap-prev', priorSnapshotId: null }));
  await reasoning.snapshotRepository.saveCognitionSnapshot(previous);
  await reasoning.runRepository.saveReasoningRun(run);
  await reasoning.snapshotRepository.saveCognitionSnapshot(current);
  await reasoning.driftRepository.saveDriftRecord(buildDriftRecord(previous, current));

  const context = await loadNotificationPolicyContextForReasoningRun(run.reasoningRunId, {
    runRepository: reasoning.runRepository,
    snapshotRepository: reasoning.snapshotRepository,
    driftRepository: reasoning.driftRepository,
    decisionRepository: decisions
  }, '2026-01-15T10:05:00.000Z');

  const report = await evaluateNotificationPolicyForReasoningRun(context, {
    runRepository: reasoning.runRepository,
    snapshotRepository: reasoning.snapshotRepository,
    driftRepository: reasoning.driftRepository,
    decisionRepository: decisions
  }, '2026-01-15T10:05:00.000Z');

  assert(report.evaluatedRuleCount === 10, 'all default rules should be evaluated');
  assert((await decisions.listDecisionsForReasoningRun(run.reasoningRunId)).length === 10, 'all decisions should persist');
  assert(report.decisions.some((decision) => decision.suppressionReason === 'condition_not_met'), 'suppressed reasons should be deterministic');
  assert(report.decisions.some((decision) => decision.channels.includes('in_app')), 'notifying decision should honor channel mapping');

  const firstRunSize = (await decisions.listDecisionsForReasoningRun(run.reasoningRunId)).length;
  await evaluateNotificationPolicyForReasoningRun(context, {
    runRepository: reasoning.runRepository,
    snapshotRepository: reasoning.snapshotRepository,
    driftRepository: reasoning.driftRepository,
    decisionRepository: decisions
  }, '2026-01-15T10:05:00.000Z');
  const secondRunSize = (await decisions.listDecisionsForReasoningRun(run.reasoningRunId)).length;
  assert(firstRunSize === secondRunSize, 'idempotent decision key should avoid duplicate rows on repeated eval');
}
