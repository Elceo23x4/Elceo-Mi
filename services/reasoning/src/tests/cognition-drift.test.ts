import { buildCanonicalCognitionStateFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import {
  buildBiasDelta,
  buildCognitionDriftKeyChanges,
  buildCognitionDriftReport,
  buildCognitionDriftSummary,
  computeDriftCompositeScore,
  mapDriftSeverity
} from '../delta/cognition-drift.js';
import { buildChartProjectionDelta } from '../delta/chart-projection-delta.js';
import { buildEvidenceDelta } from '../delta/evidence-delta.js';
import { buildInvalidationDelta } from '../delta/invalidation-delta.js';
import { buildNumericDelta } from '../delta/score-delta.js';
import type { PersistedCognitionSnapshot, PersistedReasoningRun } from '../persistence/contracts.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function buildRun(reasoningRunId: string, snapshotId: string): PersistedReasoningRun {
  return {
    reasoningRunId,
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
    priorSnapshotId: null,
    snapshotId,
    failureReason: null,
    warningsJson: '[]',
    createdAt: '2026-01-15T10:00:01.000Z'
  };
}

function buildSnapshot(snapshotId: string, reasoningRunId: string, cognition: ReturnType<typeof buildCanonicalCognitionStateFixture>): PersistedCognitionSnapshot {
  return {
    snapshotId,
    reasoningRunId,
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
    createdAt: cognition.evaluatedAt
  };
}

export function runCognitionDriftTests(): void {
  const flat = buildNumericDelta(10, 10);
  const up = buildNumericDelta(10, 22);
  const down = buildNumericDelta(22, 10);
  assert(flat.direction === 'flat', 'numeric delta direction should be flat when unchanged');
  assert(up.direction === 'up', 'numeric delta direction should be up when current > previous');
  assert(down.direction === 'down', 'numeric delta direction should be down when current < previous');

  const changed = buildBiasDelta('bullish', 'neutral');
  const flipped = buildBiasDelta('bullish', 'bearish');
  assert(changed.changed === true && changed.flip === false, 'neutral transitions should be changes but not flips');
  assert(flipped.changed === true && flipped.flip === true, 'bullish<->bearish should be flip true');

  const previous = buildCanonicalCognitionStateFixture({
    bias: 'bullish',
    confidence: { ...buildCanonicalCognitionStateFixture().confidence, score: 75 },
    contradiction: { ...buildCanonicalCognitionStateFixture().contradiction, score: 20 },
    freshness: { ...buildCanonicalCognitionStateFixture().freshness, freshnessScore: 88 },
    evidence: { ranked: [], topEvidenceIds: ['e1', 'e2', 'e3'], evidenceCount: 3 },
    invalidation: {
      ...buildCanonicalCognitionStateFixture().invalidation,
      primary: { ...buildCanonicalCognitionStateFixture().invalidation.primary!, price: 100 },
      riskLabel: 'guarded'
    },
    chartProjection: {
      annotationIds: ['ann-1'],
      markerLabels: ['a'],
      emphasisPriceLevels: [100],
      contradictionMarkerVisible: false
    }
  });

  const current = buildCanonicalCognitionStateFixture({
    bias: 'bearish',
    confidence: { ...buildCanonicalCognitionStateFixture().confidence, score: 50 },
    contradiction: { ...buildCanonicalCognitionStateFixture().contradiction, score: 45 },
    freshness: { ...buildCanonicalCognitionStateFixture().freshness, freshnessScore: 70 },
    evidence: { ranked: [], topEvidenceIds: ['e2', 'e4', 'e1'], evidenceCount: 3 },
    invalidation: {
      ...buildCanonicalCognitionStateFixture().invalidation,
      primary: { ...buildCanonicalCognitionStateFixture().invalidation.primary!, price: 118 },
      riskLabel: 'broken'
    },
    chartProjection: {
      annotationIds: ['ann-1', 'ann-2'],
      markerLabels: ['a', 'b'],
      emphasisPriceLevels: [100, 118],
      contradictionMarkerVisible: true
    }
  });

  const biasDelta = buildBiasDelta(previous.bias, current.bias);
  const confidenceDelta = buildNumericDelta(previous.confidence.score, current.confidence.score);
  const contradictionDelta = buildNumericDelta(previous.contradiction.score, current.contradiction.score);
  const freshnessDelta = buildNumericDelta(previous.freshness.freshnessScore, current.freshness.freshnessScore);
  const invalidationDelta = buildInvalidationDelta(previous, current);
  const evidenceDelta = buildEvidenceDelta(previous, current);
  const chartProjectionDelta = buildChartProjectionDelta(previous, current);

  const score = computeDriftCompositeScore({
    biasDelta,
    confidenceDelta,
    contradictionDelta,
    freshnessDelta,
    invalidationDelta,
    evidenceDelta,
    chartProjectionDelta
  });
  assert(score >= 45, 'bias flip with large shifts should classify as high composite score');
  assert(['major', 'critical'].includes(mapDriftSeverity(score)), 'high composite drift score should map to major or critical');

  const summary = buildCognitionDriftSummary({
    asset: 'XAU/USD',
    timeframe: 'H1',
    severity: 'major',
    biasDelta: buildBiasDelta('bullish', 'neutral'),
    confidenceDelta: buildNumericDelta(70, 52),
    contradictionDelta: buildNumericDelta(25, 49),
    freshnessDelta: buildNumericDelta(80, 71)
  });
  assert(summary === 'XAU/USD H1 drift is major: bias bullish->neutral, confidence down 18, contradiction up 24, freshness down 9.', 'summary template should be exact and deterministic');

  const keyChanges = buildCognitionDriftKeyChanges({
    biasDelta,
    confidenceDelta,
    contradictionDelta,
    freshnessDelta,
    invalidationDelta,
    evidenceDelta,
    chartProjectionDelta
  });
  assert(keyChanges[0] === 'Bias flipped from bullish to bearish.', 'key changes should start with bias flip when applicable');
  assert(keyChanges.length <= 6, 'key changes should be capped to 6');

  const noChange = buildCognitionDriftKeyChanges({
    biasDelta: buildBiasDelta('neutral', 'neutral'),
    confidenceDelta: buildNumericDelta(50, 50),
    contradictionDelta: buildNumericDelta(20, 20),
    freshnessDelta: buildNumericDelta(80, 80),
    invalidationDelta: buildInvalidationDelta(
      buildCanonicalCognitionStateFixture(),
      buildCanonicalCognitionStateFixture()
    ),
    evidenceDelta: buildEvidenceDelta(
      buildCanonicalCognitionStateFixture({ evidence: { ranked: [], topEvidenceIds: ['e1'], evidenceCount: 1 } }),
      buildCanonicalCognitionStateFixture({ evidence: { ranked: [], topEvidenceIds: ['e1'], evidenceCount: 1 } })
    ),
    chartProjectionDelta: buildChartProjectionDelta(
      buildCanonicalCognitionStateFixture(),
      buildCanonicalCognitionStateFixture()
    )
  });
  assert(noChange[0] === 'No material cognition drift detected.', 'no change fallback should be deterministic');

  const previousRun = buildRun('run-prev', 'snap-prev');
  const currentRun = buildRun('run-cur', 'snap-cur');
  const report1 = buildCognitionDriftReport({
    previousSnapshot: buildSnapshot('snap-prev', 'run-prev', previous),
    currentSnapshot: buildSnapshot('snap-cur', 'run-cur', current),
    previousCognition: previous,
    currentCognition: current,
    previousRun,
    currentRun,
    comparedAt: '2026-01-15T10:05:00.000Z'
  });
  const report2 = buildCognitionDriftReport({
    previousSnapshot: buildSnapshot('snap-prev', 'run-prev', previous),
    currentSnapshot: buildSnapshot('snap-cur', 'run-cur', current),
    previousCognition: previous,
    currentCognition: current,
    previousRun,
    currentRun,
    comparedAt: '2026-01-15T10:05:00.000Z'
  });

  assert(report1.driftId === 'drift|snap-prev|snap-cur', 'drift id should be deterministic from snapshot ids');
  assert(JSON.stringify(report1) === JSON.stringify(report2), 'same snapshot pair should produce identical drift report');
}
