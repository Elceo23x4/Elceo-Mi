import type { CanonicalAssetSymbol, CanonicalCognitionState, Timeframe } from '@elceo/types';
import type { CognitionSnapshotRepository, PersistedReasoningRun, ReasoningRunRepository } from './contracts';
import { deserializeCanonicalCognitionState } from './serialization';

export type CognitionReplayBundle = {
  run: PersistedReasoningRun;
  snapshot: CanonicalCognitionState;
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
