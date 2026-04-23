import type { NotificationMaterialityBand, NotificationPolicyRuleKey } from '@elceo/types';
import type { NotificationPolicyContext } from './input-loader';

export type MaterialChangeAssessment = {
  initializationMateriality: number;
  driftSeverityBase: number;
  biasFlipCriticality: number;
  invalidationRiskUpgradeMagnitude: number;
  confidenceBreakMagnitude: number;
  contradictionSpikeMagnitude: number;
  freshnessDecayMagnitude: number;
  evidenceTurnoverMagnitude: number;
  chartChangeMagnitude: number;
  reasoningFailureMagnitude: number;
  reasoningDegradedMagnitude: number;
  driftDrivenMateriality: number;
};

function clampTo100(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

function mapDriftSeverityBase(severity: string | null): number {
  if (severity === 'minor') return 15;
  if (severity === 'moderate') return 35;
  if (severity === 'major') return 65;
  if (severity === 'critical') return 90;
  return 0;
}

function mapRiskUpgradeMagnitude(previous: string | null, current: string | null): number {
  const key = `${previous ?? 'null'}->${current ?? 'null'}`;
  if (key === 'guarded->warning') return 20;
  if (key === 'guarded->fragile') return 45;
  if (key === 'guarded->broken') return 75;
  if (key === 'warning->fragile') return 25;
  if (key === 'warning->broken') return 60;
  if (key === 'fragile->broken') return 35;
  return 0;
}

export function buildMaterialChangeAssessment(context: NotificationPolicyContext): MaterialChangeAssessment {
  const cognition = context.cognition;
  const drift = context.driftReport;

  const initializationMateriality = cognition && !drift
    ? clampTo100((0.5 * cognition.confidence.score) + (0.25 * (100 - cognition.contradiction.score)) + (0.25 * cognition.freshness.freshnessScore))
    : 0;

  const driftSeverityBase = mapDriftSeverityBase(drift?.severity ?? null);
  const biasFlipCriticality = drift?.biasDelta.flip ? 100 : drift?.biasDelta.changed ? 35 : 0;
  const invalidationRiskUpgradeMagnitude = drift
    ? mapRiskUpgradeMagnitude(drift.invalidationDelta.previousRiskLabel, drift.invalidationDelta.currentRiskLabel)
    : 0;
  const confidenceBreakMagnitude = drift && drift.confidenceDelta.direction === 'down' ? drift.confidenceDelta.absoluteDelta : 0;
  const contradictionSpikeMagnitude = drift && drift.contradictionDelta.direction === 'up' ? drift.contradictionDelta.absoluteDelta : 0;
  const freshnessDecayMagnitude = drift && drift.freshnessDelta.direction === 'down' ? drift.freshnessDelta.absoluteDelta : 0;
  const evidenceTurnoverMagnitude = drift
    ? clampTo100(
      (15 * drift.evidenceDelta.enteredEvidenceIds.length) +
      (15 * drift.evidenceDelta.exitedEvidenceIds.length) +
      (5 * drift.evidenceDelta.rerankedEvidenceIds.length)
    )
    : 0;
  const chartChangeMagnitude = drift
    ? clampTo100(
      (drift.chartProjectionDelta.contradictionMarkerVisibilityChanged ? 25 : 0) +
      Math.min(20, 5 * drift.chartProjectionDelta.enteredAnnotationIds.length) +
      (drift.chartProjectionDelta.emphasisLevelChanged ? 15 : 0)
    )
    : 0;

  const reasoningFailureMagnitude = context.reasoningRun.status === 'failed' ? 90 : 0;
  const reasoningDegradedMagnitude = context.reasoningRun.status === 'partial_success' && context.reasoningRun.failureReason ? 60 : 0;

  const driftDrivenMateriality = drift
    ? clampTo100(
      (0.25 * biasFlipCriticality) +
      (0.2 * driftSeverityBase) +
      (0.15 * invalidationRiskUpgradeMagnitude) +
      (0.1 * confidenceBreakMagnitude) +
      (0.1 * contradictionSpikeMagnitude) +
      (0.08 * freshnessDecayMagnitude) +
      (0.07 * evidenceTurnoverMagnitude) +
      (0.05 * chartChangeMagnitude)
    )
    : 0;

  return {
    initializationMateriality,
    driftSeverityBase,
    biasFlipCriticality,
    invalidationRiskUpgradeMagnitude,
    confidenceBreakMagnitude,
    contradictionSpikeMagnitude,
    freshnessDecayMagnitude,
    evidenceTurnoverMagnitude,
    chartChangeMagnitude,
    reasoningFailureMagnitude,
    reasoningDegradedMagnitude,
    driftDrivenMateriality
  };
}

export function buildMaterialityScoreForRule(ruleKey: NotificationPolicyRuleKey, assessment: MaterialChangeAssessment): number {
  if (ruleKey === 'reasoning_failure') return assessment.reasoningFailureMagnitude;
  if (ruleKey === 'reasoning_degraded') return assessment.reasoningDegradedMagnitude;
  if (ruleKey === 'cognition_initialized') return assessment.initializationMateriality;
  return assessment.driftDrivenMateriality;
}

export function mapMaterialityBand(score: number): NotificationMaterialityBand {
  if (score <= 24) return 'low';
  if (score <= 49) return 'medium';
  if (score <= 74) return 'high';
  return 'critical';
}
