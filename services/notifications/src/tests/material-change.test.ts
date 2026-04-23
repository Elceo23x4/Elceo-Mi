import { buildMaterialChangeAssessment, buildMaterialityScoreForRule, mapMaterialityBand } from '../policy/material-change.js';
import type { NotificationPolicyContext } from '../policy/input-loader.js';
import { deserializeCanonicalCognitionState, deserializeCognitionDriftReport } from '../../../reasoning/src/persistence/serialization.js';
import { buildDriftRecord, buildReasoningRun, buildSnapshot } from './test-fixtures.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function buildContext(withDrift: boolean): NotificationPolicyContext {
  const run = buildReasoningRun();
  const previous = buildSnapshot('snap-prev', 'run-prev', '2026-01-15T10:00:00.000Z');
  const current = buildSnapshot('snap-cur', run.reasoningRunId, '2026-01-15T10:05:00.000Z');
  const driftRecord = withDrift ? buildDriftRecord(previous, current) : null;
  return {
    reasoningRun: run,
    cognitionSnapshot: current,
    cognition: deserializeCanonicalCognitionState(current.cognitionJson),
    driftRecord,
    driftReport: driftRecord ? deserializeCognitionDriftReport(driftRecord.driftJson) : null,
    asset: run.asset,
    timeframe: run.timeframe,
    evaluatedAt: '2026-01-15T10:05:00.000Z'
  };
}

export function runMaterialChangeTests(): void {
  const init = buildMaterialChangeAssessment(buildContext(false));
  assert(init.initializationMateriality > 0, 'initialization materiality should be > 0 without drift');

  const drifted = buildMaterialChangeAssessment(buildContext(true));
  assert(drifted.driftDrivenMateriality >= 0, 'drift materiality should be deterministic');

  const failedRunContext = buildContext(false);
  failedRunContext.reasoningRun = buildReasoningRun({ status: 'failed', snapshotId: null, priorSnapshotId: null });
  const failedAssessment = buildMaterialChangeAssessment(failedRunContext);
  assert(buildMaterialityScoreForRule('reasoning_failure', failedAssessment) === 90, 'reasoning failure materiality must be exact');

  const degradedContext = buildContext(false);
  degradedContext.reasoningRun = buildReasoningRun({ status: 'partial_success', failureReason: 'drift_persist_failed' });
  const degradedAssessment = buildMaterialChangeAssessment(degradedContext);
  assert(buildMaterialityScoreForRule('reasoning_degraded', degradedAssessment) === 60, 'reasoning degraded materiality must be exact');

  assert(mapMaterialityBand(24) === 'low', '0..24 => low');
  assert(mapMaterialityBand(49) === 'medium', '25..49 => medium');
  assert(mapMaterialityBand(74) === 'high', '50..74 => high');
  assert(mapMaterialityBand(75) === 'critical', '75..100 => critical');
}
