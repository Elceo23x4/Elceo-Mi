import type { CanonicalAssetSymbol, CanonicalEvent, Timeframe } from '@elceo/types';
import type { IngestionEventSnapshotRepository, IngestionRunRepository, PersistedIngestionRun } from './contracts';

export type IngestionReplayBundle = {
  run: PersistedIngestionRun;
  events: CanonicalEvent[];
};

export async function getReplayBundleByRunId(
  runId: string,
  runRepository: IngestionRunRepository,
  eventSnapshotRepository: IngestionEventSnapshotRepository
): Promise<IngestionReplayBundle | null> {
  const run = await runRepository.getRunById(runId);
  if (!run) return null;

  const events = await eventSnapshotRepository.getEventsByRunId(runId);
  return { run, events };
}

export async function getLatestReplayBundleForAssetTimeframe(
  asset: CanonicalAssetSymbol,
  timeframe: Timeframe,
  runRepository: IngestionRunRepository,
  eventSnapshotRepository: IngestionEventSnapshotRepository
): Promise<IngestionReplayBundle | null> {
  const run = await runRepository.getLatestRunForAssetTimeframe(asset, timeframe);
  if (!run) return null;

  const events = await eventSnapshotRepository.getEventsByRunId(run.runId);
  return { run, events };
}
