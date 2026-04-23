import { clampTo100 } from '@elceo/domain';
import type { BiasState, CanonicalCognitionState } from '@elceo/types';
import type { PersistedCognitionSnapshot, PersistedReasoningRun } from '../persistence/contracts';
import type {
  BiasDelta,
  ChartProjectionDelta,
  CognitionDriftReport,
  CognitionDriftSeverity,
  EvidenceDelta,
  InvalidationDelta,
  NumericDelta
} from './contracts';
import { buildChartProjectionDelta } from './chart-projection-delta';
import { buildEvidenceDelta } from './evidence-delta';
import { buildInvalidationDelta } from './invalidation-delta';
import { buildNumericDelta } from './score-delta';

function riskShiftMagnitude(
  previous: InvalidationDelta['previousRiskLabel'],
  current: InvalidationDelta['currentRiskLabel']
): number {
  if (previous === current) return 0;
  if (previous === null || current === null) return 0;

  const pair = [previous, current].sort().join('|');
  if (pair === 'guarded|warning') return 20;
  if (pair === 'guarded|fragile') return 40;
  if (pair === 'broken|guarded') return 70;
  if (pair === 'fragile|warning') return 20;
  if (pair === 'broken|warning') return 50;
  if (pair === 'broken|fragile') return 30;
  return 0;
}

function buildDeltaDirectionText(delta: NumericDelta): string {
  if (delta.direction === 'flat') return 'unchanged';
  return `${delta.direction} ${delta.absoluteDelta}`;
}

export function buildBiasDelta(previousBias: BiasState, currentBias: BiasState): BiasDelta {
  const changed = previousBias !== currentBias;
  const flip =
    (previousBias === 'bullish' && currentBias === 'bearish') ||
    (previousBias === 'bearish' && currentBias === 'bullish');

  return {
    previousBias,
    currentBias,
    changed,
    flip
  };
}

export function mapDriftSeverity(score: number): CognitionDriftSeverity {
  if (score < 10) return 'none';
  if (score < 25) return 'minor';
  if (score < 45) return 'moderate';
  if (score < 70) return 'major';
  return 'critical';
}

export function computeDriftCompositeScore(params: {
  biasDelta: BiasDelta;
  confidenceDelta: NumericDelta;
  contradictionDelta: NumericDelta;
  freshnessDelta: NumericDelta;
  invalidationDelta: InvalidationDelta;
  evidenceDelta: EvidenceDelta;
  chartProjectionDelta: ChartProjectionDelta;
}): number {
  const biasFlipCriticality = params.biasDelta.flip ? 100 : params.biasDelta.changed ? 45 : 0;
  const confidenceMagnitude = params.confidenceDelta.absoluteDelta;
  const contradictionMagnitude = params.contradictionDelta.absoluteDelta;
  const freshnessMagnitude = params.freshnessDelta.absoluteDelta;
  const invalidationRiskShiftMagnitude = riskShiftMagnitude(params.invalidationDelta.previousRiskLabel, params.invalidationDelta.currentRiskLabel);

  const entered = params.evidenceDelta.enteredEvidenceIds.length;
  const exited = params.evidenceDelta.exitedEvidenceIds.length;
  const reranked = params.evidenceDelta.rerankedEvidenceIds.length;
  const evidenceChangeMagnitude = clampTo100(20 * entered + 20 * exited + 8 * reranked);

  const chartChangeMagnitude = clampTo100(
    (params.chartProjectionDelta.contradictionMarkerVisibilityChanged ? 25 : 0) +
      Math.min(20, 5 * params.chartProjectionDelta.enteredAnnotationIds.length) +
      (params.chartProjectionDelta.emphasisLevelChanged ? 15 : 0)
  );

  return clampTo100(
    0.25 * biasFlipCriticality +
      0.15 * confidenceMagnitude +
      0.15 * contradictionMagnitude +
      0.1 * freshnessMagnitude +
      0.15 * invalidationRiskShiftMagnitude +
      0.1 * evidenceChangeMagnitude +
      0.1 * chartChangeMagnitude
  );
}

export function buildCognitionDriftSummary(params: {
  asset: string;
  timeframe: string;
  severity: CognitionDriftSeverity;
  biasDelta: BiasDelta;
  confidenceDelta: NumericDelta;
  contradictionDelta: NumericDelta;
  freshnessDelta: NumericDelta;
}): string {
  return `${params.asset} ${params.timeframe} drift is ${params.severity}: bias ${params.biasDelta.previousBias}->${params.biasDelta.currentBias}, confidence ${buildDeltaDirectionText(params.confidenceDelta)}, contradiction ${buildDeltaDirectionText(params.contradictionDelta)}, freshness ${buildDeltaDirectionText(params.freshnessDelta)}.`;
}

export function buildCognitionDriftKeyChanges(params: {
  biasDelta: BiasDelta;
  confidenceDelta: NumericDelta;
  contradictionDelta: NumericDelta;
  freshnessDelta: NumericDelta;
  invalidationDelta: InvalidationDelta;
  evidenceDelta: EvidenceDelta;
  chartProjectionDelta: ChartProjectionDelta;
}): string[] {
  const changes: string[] = [];

  if (params.biasDelta.flip) {
    changes.push(`Bias flipped from ${params.biasDelta.previousBias} to ${params.biasDelta.currentBias}.`);
  } else if (params.biasDelta.changed) {
    changes.push(`Bias changed from ${params.biasDelta.previousBias} to ${params.biasDelta.currentBias}.`);
  }

  if (params.confidenceDelta.absoluteDelta >= 10) {
    changes.push(`Confidence moved ${params.confidenceDelta.direction} by ${params.confidenceDelta.absoluteDelta}.`);
  }
  if (params.contradictionDelta.absoluteDelta >= 10) {
    changes.push(`Contradiction moved ${params.contradictionDelta.direction} by ${params.contradictionDelta.absoluteDelta}.`);
  }
  if (params.freshnessDelta.absoluteDelta >= 10) {
    changes.push(`Freshness moved ${params.freshnessDelta.direction} by ${params.freshnessDelta.absoluteDelta}.`);
  }
  if (params.invalidationDelta.riskLabelChanged) {
    changes.push(`Invalidation risk changed from ${params.invalidationDelta.previousRiskLabel} to ${params.invalidationDelta.currentRiskLabel}.`);
  }
  if (params.invalidationDelta.priceChanged && params.invalidationDelta.absolutePriceDelta > 0) {
    changes.push(`Primary invalidation price changed by ${params.invalidationDelta.absolutePriceDelta}.`);
  }
  if (params.evidenceDelta.enteredEvidenceIds.length > 0) {
    changes.push(`Entered evidence: ${params.evidenceDelta.enteredEvidenceIds.slice(0, 3).join(', ')}.`);
  }
  if (params.evidenceDelta.exitedEvidenceIds.length > 0) {
    changes.push(`Exited evidence: ${params.evidenceDelta.exitedEvidenceIds.slice(0, 3).join(', ')}.`);
  }
  if (params.evidenceDelta.rerankedEvidenceIds.length > 0) {
    changes.push(`Reranked evidence: ${params.evidenceDelta.rerankedEvidenceIds.slice(0, 3).join(', ')}.`);
  }
  if (params.chartProjectionDelta.contradictionMarkerVisibilityChanged) {
    changes.push('Contradiction marker visibility changed.');
  }
  if (params.chartProjectionDelta.emphasisLevelChanged) {
    changes.push('Emphasis price levels changed.');
  }

  if (changes.length === 0) {
    return ['No material cognition drift detected.'];
  }

  return changes.slice(0, 6);
}

export function buildCognitionDriftReport(params: {
  previousSnapshot: PersistedCognitionSnapshot;
  currentSnapshot: PersistedCognitionSnapshot;
  previousCognition: CanonicalCognitionState;
  currentCognition: CanonicalCognitionState;
  previousRun: PersistedReasoningRun;
  currentRun: PersistedReasoningRun;
  comparedAt: string;
}): CognitionDriftReport {
  const biasDelta = buildBiasDelta(params.previousCognition.bias, params.currentCognition.bias);
  const confidenceDelta = buildNumericDelta(params.previousCognition.confidence.score, params.currentCognition.confidence.score);
  const contradictionDelta = buildNumericDelta(params.previousCognition.contradiction.score, params.currentCognition.contradiction.score);
  const freshnessDelta = buildNumericDelta(params.previousCognition.freshness.freshnessScore, params.currentCognition.freshness.freshnessScore);
  const invalidationDelta = buildInvalidationDelta(params.previousCognition, params.currentCognition);
  const evidenceDelta = buildEvidenceDelta(params.previousCognition, params.currentCognition);
  const chartProjectionDelta = buildChartProjectionDelta(params.previousCognition, params.currentCognition);

  const driftScore = computeDriftCompositeScore({
    biasDelta,
    confidenceDelta,
    contradictionDelta,
    freshnessDelta,
    invalidationDelta,
    evidenceDelta,
    chartProjectionDelta
  });
  const severity = mapDriftSeverity(driftScore);

  return {
    driftId: `drift|${params.previousSnapshot.snapshotId}|${params.currentSnapshot.snapshotId}`,
    asset: params.currentSnapshot.asset,
    timeframe: params.currentSnapshot.timeframe,
    previousSnapshotId: params.previousSnapshot.snapshotId,
    currentSnapshotId: params.currentSnapshot.snapshotId,
    previousReasoningRunId: params.previousRun.reasoningRunId,
    currentReasoningRunId: params.currentRun.reasoningRunId,
    comparedAt: params.comparedAt,
    biasDelta,
    confidenceDelta,
    contradictionDelta,
    freshnessDelta,
    invalidationDelta,
    evidenceDelta,
    chartProjectionDelta,
    severity,
    summary: buildCognitionDriftSummary({
      asset: params.currentSnapshot.asset,
      timeframe: params.currentSnapshot.timeframe,
      severity,
      biasDelta,
      confidenceDelta,
      contradictionDelta,
      freshnessDelta
    }),
    keyChanges: buildCognitionDriftKeyChanges({
      biasDelta,
      confidenceDelta,
      contradictionDelta,
      freshnessDelta,
      invalidationDelta,
      evidenceDelta,
      chartProjectionDelta
    }),
    createdAt: params.comparedAt
  };
}
