import { MemoryReasoningPersistenceRepository } from '../../../reasoning/src/persistence/memory-reasoning-repository.js';
import { CanonicalNotificationPolicyBoundaryService } from '../runtime/canonical-notification-policy-boundary.js';
import { MemoryNotificationDecisionRepository } from '../persistence/memory-notification-repository.js';
import { buildDriftRecord, buildReasoningRun, buildSnapshot } from './test-fixtures.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export async function runCanonicalNotificationPolicyBoundaryTests(): Promise<void> {
  const reasoning = new MemoryReasoningPersistenceRepository();
  const decisionRepository = new MemoryNotificationDecisionRepository();
  const service = new CanonicalNotificationPolicyBoundaryService({
    runRepository: reasoning.runRepository,
    snapshotRepository: reasoning.snapshotRepository,
    driftRepository: reasoning.driftRepository,
    decisionRepository
  });

  const previous = buildSnapshot('snap-prev', 'run-prev', '2026-01-15T09:00:00.000Z');
  const runPrev = buildReasoningRun({ reasoningRunId: 'run-prev', snapshotId: 'snap-prev', priorSnapshotId: null });
  await reasoning.runRepository.saveReasoningRun(runPrev);
  await reasoning.snapshotRepository.saveCognitionSnapshot(previous);

  const run = buildReasoningRun({ reasoningRunId: 'run-1', snapshotId: 'snap-cur', priorSnapshotId: 'snap-prev' });
  const current = buildSnapshot('snap-cur', 'run-1', '2026-01-15T10:00:00.000Z');
  await reasoning.runRepository.saveReasoningRun(run);
  await reasoning.snapshotRepository.saveCognitionSnapshot(current);
  await reasoning.driftRepository.saveDriftRecord(buildDriftRecord(previous, current));

  const report = await service.evaluateForReasoningRun({ reasoningRunId: 'run-1', evaluatedAt: '2026-01-15T10:00:00.000Z' });
  assert(report.reasoningRunId === 'run-1', 'evaluateForReasoningRun should return report for run');
  assert(report.decisions.length === 10, 'boundary should evaluate all rules');

  const initRun = buildReasoningRun({ reasoningRunId: 'run-init', snapshotId: 'snap-init', priorSnapshotId: null });
  const initSnapshot = buildSnapshot('snap-init', 'run-init', '2026-01-15T11:00:00.000Z');
  await reasoning.runRepository.saveReasoningRun(initRun);
  await reasoning.snapshotRepository.saveCognitionSnapshot(initSnapshot);
  const initReport = await service.evaluateForReasoningRun({ reasoningRunId: 'run-init', evaluatedAt: '2026-01-15T11:00:00.000Z' });
  assert(initReport.decisions.some((decision) => decision.ruleKey === 'cognition_initialized'), 'initialization path should evaluate cognition_initialized');

  const failedRun = buildReasoningRun({ reasoningRunId: 'run-failed', status: 'failed', snapshotId: null, priorSnapshotId: null, failureReason: 'missing_input' });
  await reasoning.runRepository.saveReasoningRun(failedRun);
  const failedReport = await service.evaluateForReasoningRun({ reasoningRunId: 'run-failed', evaluatedAt: '2026-01-15T12:00:00.000Z' });
  assert(failedReport.decisions.some((decision) => decision.ruleKey === 'reasoning_failure'), 'failed path should evaluate reasoning_failure');

  const latest = await service.evaluateLatestForAssetTimeframe('XAU/USD', 'H1', '2026-01-15T12:05:00.000Z');
  assert(latest.asset === 'XAU/USD' && latest.timeframe === 'H1', 'evaluateLatestForAssetTimeframe should work');
}
