import type { CanonicalAssetSymbol, CanonicalCognitionState, Timeframe } from '@elceo/types';
import type { CognitionDriftReport } from '../../../reasoning/src/delta/contracts';
import type { PersistedCognitionDriftRecord, PersistedCognitionSnapshot, PersistedReasoningRun } from '../../../reasoning/src/persistence/contracts';
import { deserializeCanonicalCognitionState, deserializeCognitionDriftReport } from '../../../reasoning/src/persistence/serialization';
import type { NotificationPolicyLoadRepositories } from '../persistence/contracts';

export type NotificationPolicyContext = {
  reasoningRun: PersistedReasoningRun;
  cognitionSnapshot: PersistedCognitionSnapshot | null;
  cognition: CanonicalCognitionState | null;
  driftRecord: PersistedCognitionDriftRecord | null;
  driftReport: CognitionDriftReport | null;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  evaluatedAt: string;
};

export type NotificationPolicyLoadErrorCode =
  | 'missing_reasoning_run'
  | 'missing_cognition_snapshot'
  | 'corrupt_cognition_snapshot'
  | 'corrupt_drift_report';

export class NotificationPolicyLoadError extends Error {
  constructor(public readonly code: NotificationPolicyLoadErrorCode, message: string) {
    super(message);
    this.name = 'NotificationPolicyLoadError';
  }
}

export async function loadNotificationPolicyContextForReasoningRun(
  reasoningRunId: string,
  repositories: NotificationPolicyLoadRepositories,
  evaluatedAt: string
): Promise<NotificationPolicyContext> {
  const reasoningRun = await repositories.runRepository.getReasoningRunById(reasoningRunId);
  if (!reasoningRun) {
    throw new NotificationPolicyLoadError('missing_reasoning_run', `missing reasoning run: ${reasoningRunId}`);
  }

  let cognitionSnapshot: PersistedCognitionSnapshot | null = null;
  let cognition: CanonicalCognitionState | null = null;
  if (reasoningRun.snapshotId) {
    cognitionSnapshot = await repositories.snapshotRepository.getSnapshotById(reasoningRun.snapshotId);
    if (!cognitionSnapshot) {
      throw new NotificationPolicyLoadError('missing_cognition_snapshot', `missing cognition snapshot: ${reasoningRun.snapshotId}`);
    }
    try {
      cognition = deserializeCanonicalCognitionState(cognitionSnapshot.cognitionJson);
    } catch {
      throw new NotificationPolicyLoadError('corrupt_cognition_snapshot', `corrupt cognition snapshot: ${cognitionSnapshot.snapshotId}`);
    }
  }

  let driftRecord: PersistedCognitionDriftRecord | null = null;
  let driftReport: CognitionDriftReport | null = null;
  if (reasoningRun.snapshotId) {
    const drifts = await repositories.driftRepository.listRecentDrifts({ limit: 1, asset: reasoningRun.asset, timeframe: reasoningRun.timeframe });
    const candidate = drifts[0] ?? null;
    if (candidate && candidate.currentSnapshotId === reasoningRun.snapshotId) {
      driftRecord = candidate;
      try {
        driftReport = deserializeCognitionDriftReport(candidate.driftJson);
      } catch {
        throw new NotificationPolicyLoadError('corrupt_drift_report', `corrupt drift report: ${candidate.driftId}`);
      }
    }
  }

  return {
    reasoningRun,
    cognitionSnapshot,
    cognition,
    driftRecord,
    driftReport,
    asset: reasoningRun.asset,
    timeframe: reasoningRun.timeframe,
    evaluatedAt
  };
}
