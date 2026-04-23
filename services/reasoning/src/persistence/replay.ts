import type { CanonicalAssetSymbol, CanonicalCognitionState, Timeframe } from '@elceo/types';
import type {
  CognitionDriftRepository,
  CognitionSnapshotRepository,
  PersistedCognitionDriftRecord,
  PersistedReasoningRun,
  ReasoningRunRepository
} from './contracts';
import { deserializeCanonicalCognitionState, deserializeCognitionDriftReport } from './serialization';
import type { CognitionDriftReport } from '../delta/contracts';

export type CognitionReplayBundle = {
  run: PersistedReasoningRun;
  snapshot: CanonicalCognitionState;
};

export type CognitionDriftReplayBundle = {
  record: PersistedCognitionDriftRecord;
  report: CognitionDriftReport;
};

export async function getCognitionReplayBundleByReasoningRunId(
  reasoningRunId: string,
  runRepository: ReasoningRunRepository,
  snapshotRepository: CognitionSnapshotRepository
): Promise<CognitionReplayBundle | null> {
  const run = await runRepository.getReasoningRunById(reasoningRunId);
  if (!run) return null;
  const persisted = await snapshotRepository.getSnapshotByReasoningRunId(reasoningRunId);
  if (!persisted) return null;
  const snapshot = deserializeCanonicalCognitionState(persisted.cognitionJson);
  return { run, snapshot };
}

export async function getLatestCognitionReplayBundle(
  asset: CanonicalAssetSymbol,
  timeframe: Timeframe,
  runRepository: ReasoningRunRepository,
  snapshotRepository: CognitionSnapshotRepository
): Promise<CognitionReplayBundle | null> {
  const run = await runRepository.getLatestReasoningRunForAssetTimeframe(asset, timeframe);
  if (!run) return null;
  const persisted = await snapshotRepository.getSnapshotByReasoningRunId(run.reasoningRunId);
  if (!persisted) return null;
  const snapshot = deserializeCanonicalCognitionState(persisted.cognitionJson);
  return { run, snapshot };
}

export async function getDriftReplayBundleById(
  driftId: string,
  driftRepository: CognitionDriftRepository
): Promise<CognitionDriftReplayBundle | null> {
  const record = await driftRepository.getDriftById(driftId);
  if (!record) return null;
  const report = deserializeCognitionDriftReport(record.driftJson);
  return { record, report };
}

export async function getLatestDriftReplayBundle(
  asset: CanonicalAssetSymbol,
  timeframe: Timeframe,
  driftRepository: CognitionDriftRepository
): Promise<CognitionDriftReplayBundle | null> {
  const record = await driftRepository.getLatestDriftForAssetTimeframe(asset, timeframe);
  if (!record) return null;
  const report = deserializeCognitionDriftReport(record.driftJson);
  return { record, report };
}
