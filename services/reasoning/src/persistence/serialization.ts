import { validateCanonicalCognitionState } from '@elceo/schemas';
import type { CanonicalCognitionState } from '@elceo/types';
import type { CognitionDriftReport } from '../delta/contracts';

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error('malformed_json');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertString(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new Error(`invalid_cognition_drift_report:${field} must be string`);
  return value;
}

function assertNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || Number.isFinite(value) === false) throw new Error(`invalid_cognition_drift_report:${field} must be finite number`);
  return value;
}

function assertBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`invalid_cognition_drift_report:${field} must be boolean`);
  return value;
}

function assertStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`invalid_cognition_drift_report:${field} must be string[]`);
  }
  return [...value];
}

function assertNumberArray(value: unknown, field: string): number[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'number' || Number.isFinite(item) === false)) {
    throw new Error(`invalid_cognition_drift_report:${field} must be number[]`);
  }
  return [...value];
}

export function serializeCanonicalCognitionState(cognition: CanonicalCognitionState): string {
  return JSON.stringify(cognition);
}

export function deserializeCanonicalCognitionState(json: string): CanonicalCognitionState {
  const parsed = parseJson(json);
  const validated = validateCanonicalCognitionState(parsed);
  if (validated.ok === false) {
    throw new Error(`invalid_canonical_cognition_state:${validated.errors.join('; ')}`);
  }
  return validated.value;
}

export function serializeCognitionDriftReport(report: CognitionDriftReport): string {
  return JSON.stringify(report);
}

export function deserializeCognitionDriftReport(json: string): CognitionDriftReport {
  const parsed = parseJson(json);
  if (!isRecord(parsed)) {
    throw new Error('invalid_cognition_drift_report:root must be object');
  }

  const biasDelta = parsed.biasDelta;
  const confidenceDelta = parsed.confidenceDelta;
  const contradictionDelta = parsed.contradictionDelta;
  const freshnessDelta = parsed.freshnessDelta;
  const invalidationDelta = parsed.invalidationDelta;
  const evidenceDelta = parsed.evidenceDelta;
  const chartProjectionDelta = parsed.chartProjectionDelta;

  if (!isRecord(biasDelta)) throw new Error('invalid_cognition_drift_report:biasDelta must be object');
  if (!isRecord(confidenceDelta)) throw new Error('invalid_cognition_drift_report:confidenceDelta must be object');
  if (!isRecord(contradictionDelta)) throw new Error('invalid_cognition_drift_report:contradictionDelta must be object');
  if (!isRecord(freshnessDelta)) throw new Error('invalid_cognition_drift_report:freshnessDelta must be object');
  if (!isRecord(invalidationDelta)) throw new Error('invalid_cognition_drift_report:invalidationDelta must be object');
  if (!isRecord(evidenceDelta)) throw new Error('invalid_cognition_drift_report:evidenceDelta must be object');
  if (!isRecord(chartProjectionDelta)) throw new Error('invalid_cognition_drift_report:chartProjectionDelta must be object');

  return {
    driftId: assertString(parsed.driftId, 'driftId'),
    asset: assertString(parsed.asset, 'asset'),
    timeframe: assertString(parsed.timeframe, 'timeframe') as CognitionDriftReport['timeframe'],
    previousSnapshotId: assertString(parsed.previousSnapshotId, 'previousSnapshotId'),
    currentSnapshotId: assertString(parsed.currentSnapshotId, 'currentSnapshotId'),
    previousReasoningRunId: assertString(parsed.previousReasoningRunId, 'previousReasoningRunId'),
    currentReasoningRunId: assertString(parsed.currentReasoningRunId, 'currentReasoningRunId'),
    comparedAt: assertString(parsed.comparedAt, 'comparedAt'),
    biasDelta: {
      previousBias: assertString(biasDelta.previousBias, 'biasDelta.previousBias') as CognitionDriftReport['biasDelta']['previousBias'],
      currentBias: assertString(biasDelta.currentBias, 'biasDelta.currentBias') as CognitionDriftReport['biasDelta']['currentBias'],
      changed: assertBoolean(biasDelta.changed, 'biasDelta.changed'),
      flip: assertBoolean(biasDelta.flip, 'biasDelta.flip')
    },
    confidenceDelta: {
      previous: assertNumber(confidenceDelta.previous, 'confidenceDelta.previous'),
      current: assertNumber(confidenceDelta.current, 'confidenceDelta.current'),
      absoluteDelta: assertNumber(confidenceDelta.absoluteDelta, 'confidenceDelta.absoluteDelta'),
      direction: assertString(confidenceDelta.direction, 'confidenceDelta.direction') as CognitionDriftReport['confidenceDelta']['direction']
    },
    contradictionDelta: {
      previous: assertNumber(contradictionDelta.previous, 'contradictionDelta.previous'),
      current: assertNumber(contradictionDelta.current, 'contradictionDelta.current'),
      absoluteDelta: assertNumber(contradictionDelta.absoluteDelta, 'contradictionDelta.absoluteDelta'),
      direction: assertString(contradictionDelta.direction, 'contradictionDelta.direction') as CognitionDriftReport['contradictionDelta']['direction']
    },
    freshnessDelta: {
      previous: assertNumber(freshnessDelta.previous, 'freshnessDelta.previous'),
      current: assertNumber(freshnessDelta.current, 'freshnessDelta.current'),
      absoluteDelta: assertNumber(freshnessDelta.absoluteDelta, 'freshnessDelta.absoluteDelta'),
      direction: assertString(freshnessDelta.direction, 'freshnessDelta.direction') as CognitionDriftReport['freshnessDelta']['direction']
    },
    invalidationDelta: {
      previousPrimaryPrice: invalidationDelta.previousPrimaryPrice === null ? null : assertNumber(invalidationDelta.previousPrimaryPrice, 'invalidationDelta.previousPrimaryPrice'),
      currentPrimaryPrice: invalidationDelta.currentPrimaryPrice === null ? null : assertNumber(invalidationDelta.currentPrimaryPrice, 'invalidationDelta.currentPrimaryPrice'),
      priceChanged: assertBoolean(invalidationDelta.priceChanged, 'invalidationDelta.priceChanged'),
      absolutePriceDelta: assertNumber(invalidationDelta.absolutePriceDelta, 'invalidationDelta.absolutePriceDelta'),
      previousRiskLabel: invalidationDelta.previousRiskLabel === null ? null : assertString(invalidationDelta.previousRiskLabel, 'invalidationDelta.previousRiskLabel') as CognitionDriftReport['invalidationDelta']['previousRiskLabel'],
      currentRiskLabel: invalidationDelta.currentRiskLabel === null ? null : assertString(invalidationDelta.currentRiskLabel, 'invalidationDelta.currentRiskLabel') as CognitionDriftReport['invalidationDelta']['currentRiskLabel'],
      riskLabelChanged: assertBoolean(invalidationDelta.riskLabelChanged, 'invalidationDelta.riskLabelChanged')
    },
    evidenceDelta: {
      previousTopEvidenceIds: assertStringArray(evidenceDelta.previousTopEvidenceIds, 'evidenceDelta.previousTopEvidenceIds'),
      currentTopEvidenceIds: assertStringArray(evidenceDelta.currentTopEvidenceIds, 'evidenceDelta.currentTopEvidenceIds'),
      enteredEvidenceIds: assertStringArray(evidenceDelta.enteredEvidenceIds, 'evidenceDelta.enteredEvidenceIds'),
      exitedEvidenceIds: assertStringArray(evidenceDelta.exitedEvidenceIds, 'evidenceDelta.exitedEvidenceIds'),
      retainedEvidenceIds: assertStringArray(evidenceDelta.retainedEvidenceIds, 'evidenceDelta.retainedEvidenceIds'),
      rerankedEvidenceIds: assertStringArray(evidenceDelta.rerankedEvidenceIds, 'evidenceDelta.rerankedEvidenceIds'),
      previousTopCount: assertNumber(evidenceDelta.previousTopCount, 'evidenceDelta.previousTopCount'),
      currentTopCount: assertNumber(evidenceDelta.currentTopCount, 'evidenceDelta.currentTopCount')
    },
    chartProjectionDelta: {
      previousAnnotationIds: assertStringArray(chartProjectionDelta.previousAnnotationIds, 'chartProjectionDelta.previousAnnotationIds'),
      currentAnnotationIds: assertStringArray(chartProjectionDelta.currentAnnotationIds, 'chartProjectionDelta.currentAnnotationIds'),
      enteredAnnotationIds: assertStringArray(chartProjectionDelta.enteredAnnotationIds, 'chartProjectionDelta.enteredAnnotationIds'),
      exitedAnnotationIds: assertStringArray(chartProjectionDelta.exitedAnnotationIds, 'chartProjectionDelta.exitedAnnotationIds'),
      previousEmphasisLevels: assertNumberArray(chartProjectionDelta.previousEmphasisLevels, 'chartProjectionDelta.previousEmphasisLevels'),
      currentEmphasisLevels: assertNumberArray(chartProjectionDelta.currentEmphasisLevels, 'chartProjectionDelta.currentEmphasisLevels'),
      emphasisLevelChanged: assertBoolean(chartProjectionDelta.emphasisLevelChanged, 'chartProjectionDelta.emphasisLevelChanged'),
      contradictionMarkerVisibilityChanged: assertBoolean(chartProjectionDelta.contradictionMarkerVisibilityChanged, 'chartProjectionDelta.contradictionMarkerVisibilityChanged')
    },
    severity: assertString(parsed.severity, 'severity') as CognitionDriftReport['severity'],
    summary: assertString(parsed.summary, 'summary'),
    keyChanges: assertStringArray(parsed.keyChanges, 'keyChanges'),
    createdAt: assertString(parsed.createdAt, 'createdAt')
  };
}
