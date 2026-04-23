import { buildNotificationMessage } from '../policy/message-builder.js';
import { deserializeCanonicalCognitionState, deserializeCognitionDriftReport } from '../../../reasoning/src/persistence/serialization.js';
import type { NotificationPolicyContext } from '../policy/input-loader.js';
import { buildDriftRecord, buildReasoningRun, buildSnapshot } from './test-fixtures.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function buildContext(): NotificationPolicyContext {
  const previous = buildSnapshot('snap-prev', 'run-prev', '2026-01-15T10:00:00.000Z');
  const run = buildReasoningRun({ reasoningRunId: 'run-1', snapshotId: 'snap-cur', priorSnapshotId: 'snap-prev', failureReason: 'deterministic_error' });
  const current = buildSnapshot('snap-cur', 'run-1', '2026-01-15T10:05:00.000Z');
  const drift = buildDriftRecord(previous, current);
  const driftReport = deserializeCognitionDriftReport(drift.driftJson);
  return {
    reasoningRun: run,
    cognitionSnapshot: current,
    cognition: deserializeCanonicalCognitionState(current.cognitionJson),
    driftRecord: drift,
    driftReport,
    asset: run.asset,
    timeframe: run.timeframe,
    evaluatedAt: '2026-01-15T10:05:00.000Z'
  };
}

export function runMessageBuilderTests(): void {
  const context = buildContext();
  assert(buildNotificationMessage('reasoning_failure', { ...context, reasoningRun: { ...context.reasoningRun, status: 'failed' } }).headline === 'XAU/USD H1: reasoning failed', 'reasoning_failure headline exact');
  assert(buildNotificationMessage('reasoning_degraded', { ...context, reasoningRun: { ...context.reasoningRun, status: 'partial_success' } }).headline === 'XAU/USD H1: reasoning degraded', 'reasoning_degraded headline exact');
  assert(buildNotificationMessage('cognition_initialized', { ...context, driftReport: null, driftRecord: null }).headline === 'XAU/USD H1: cognition initialized', 'cognition_initialized headline exact');
  assert(buildNotificationMessage('bias_flip', context).headline.includes('bias flipped'), 'bias_flip headline template exact');
  assert(buildNotificationMessage('critical_drift', context).headline === 'XAU/USD H1: critical cognition drift', 'critical_drift headline exact');
  assert(buildNotificationMessage('major_drift', context).headline === 'XAU/USD H1: major cognition drift', 'major_drift headline exact');
  assert(buildNotificationMessage('invalidation_risk_upgrade', context).headline.includes('invalidation risk moved to'), 'invalidation_risk_upgrade headline exact');
  assert(buildNotificationMessage('contradiction_spike', context).headline === 'XAU/USD H1: contradiction increased', 'contradiction_spike headline exact');
  assert(buildNotificationMessage('confidence_breakdown', context).headline === 'XAU/USD H1: confidence weakened', 'confidence_breakdown headline exact');
  assert(buildNotificationMessage('freshness_decay', context).headline === 'XAU/USD H1: evidence freshness decayed', 'freshness_decay headline exact');
}
