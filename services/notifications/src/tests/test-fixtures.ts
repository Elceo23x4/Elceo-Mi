import { buildCanonicalCognitionStateFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import { buildCognitionDriftReport } from '../../../reasoning/src/delta/cognition-drift.js';
import type { PersistedCognitionDriftRecord, PersistedCognitionSnapshot, PersistedReasoningRun } from '../../../reasoning/src/persistence/contracts.js';

export function buildReasoningRun(overrides: Partial<PersistedReasoningRun> = {}): PersistedReasoningRun {
  return {
    reasoningRunId: 'run-1',
    asset: 'XAU/USD',
    timeframe: 'H1',
    sourceIngestionRunId: null,
    sourceIngestionRequestKey: null,
    engineName: 'engine',
    reasoningVersion: 'r1',
    scoringVersion: 's1',
    startedAt: '2026-01-15T10:00:00.000Z',
    endedAt: '2026-01-15T10:00:01.000Z',
    durationMs: 1,
    status: 'success',
    inputEventCount: 1,
    inputZoneCount: 1,
    projectedEvidenceCount: 1,
    priorSnapshotId: 'snap-prev',
    snapshotId: 'snap-cur',
    failureReason: null,
    warningsJson: '[]',
    createdAt: '2026-01-15T10:00:01.000Z',
    ...overrides
  };
}

export function buildSnapshot(snapshotId: string, runId: string, evaluatedAt: string, overrides: Parameters<typeof buildCanonicalCognitionStateFixture>[0] = {}): PersistedCognitionSnapshot {
  const cognition = buildCanonicalCognitionStateFixture({
    asset: 'XAU/USD',
    timeframe: 'H1',
    evaluatedAt,
    ...overrides
  });

  return {
    snapshotId,
    reasoningRunId: runId,
    asset: cognition.asset,
    timeframe: cognition.timeframe,
    evaluatedAt: cognition.evaluatedAt,
    bias: cognition.bias,
    confidenceScore: cognition.confidence.score,
    contradictionScore: cognition.contradiction.score,
    freshnessScore: cognition.freshness.freshnessScore,
    sourceIngestionRunId: null,
    sourceIngestionRequestKey: null,
    reasoningVersion: cognition.audit.reasoningVersion,
    scoringVersion: cognition.audit.scoringVersion,
    cognitionJson: JSON.stringify(cognition),
    createdAt: evaluatedAt
  };
}

export function buildDriftRecord(previous: PersistedCognitionSnapshot, current: PersistedCognitionSnapshot): PersistedCognitionDriftRecord {
  const previousCognition = buildCanonicalCognitionStateFixture(JSON.parse(previous.cognitionJson) as never);
  const currentCognition = buildCanonicalCognitionStateFixture(JSON.parse(current.cognitionJson) as never);

  const previousRun = buildReasoningRun({ reasoningRunId: previous.reasoningRunId, snapshotId: previous.snapshotId, status: 'success' });
  const currentRun = buildReasoningRun({ reasoningRunId: current.reasoningRunId, priorSnapshotId: previous.snapshotId, snapshotId: current.snapshotId, status: 'success' });

  const report = buildCognitionDriftReport({
    previousSnapshot: previous,
    currentSnapshot: current,
    previousCognition,
    currentCognition,
    previousRun,
    currentRun,
    comparedAt: current.evaluatedAt
  });

  return {
    driftId: report.driftId,
    asset: report.asset,
    timeframe: report.timeframe,
    previousSnapshotId: report.previousSnapshotId,
    currentSnapshotId: report.currentSnapshotId,
    previousReasoningRunId: report.previousReasoningRunId,
    currentReasoningRunId: report.currentReasoningRunId,
    comparedAt: report.comparedAt,
    severity: report.severity,
    summary: report.summary,
    keyChangesJson: JSON.stringify(report.keyChanges),
    confidenceDelta: report.confidenceDelta.absoluteDelta,
    contradictionDelta: report.contradictionDelta.absoluteDelta,
    freshnessDelta: report.freshnessDelta.absoluteDelta,
    invalidationPriceDelta: report.invalidationDelta.absolutePriceDelta,
    createdAt: report.createdAt,
    driftJson: JSON.stringify(report)
  };
}
