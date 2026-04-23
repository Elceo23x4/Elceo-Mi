import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import type { IngestionPersistenceRepository } from '../persistence/contracts';
import { getLatestReplayBundleForAssetTimeframe, getReplayBundleByRunId } from '../persistence/replay';
import type { PersistedOutboxItem } from './outbox-contracts';
import { IngestionPublicationStagingService } from './staging-service';

export class ReplayPublicationService {
  constructor(private readonly persistenceRepository: IngestionPersistenceRepository, private readonly stagingService: IngestionPublicationStagingService) {}

  async stagePublicationsForRunId(runId: string, nowIso: string): Promise<PersistedOutboxItem[]> {
    const replay = await getReplayBundleByRunId(runId, this.persistenceRepository.runRepository, this.persistenceRepository.eventSnapshotRepository);
    if (!replay) return [];

    return this.stagingService.stageRunPublications(replay.run, replay.events, nowIso);
  }

  async stagePublicationsForLatestAssetTimeframe(asset: CanonicalAssetSymbol, timeframe: Timeframe, nowIso: string): Promise<PersistedOutboxItem[]> {
    const replay = await getLatestReplayBundleForAssetTimeframe(asset, timeframe, this.persistenceRepository.runRepository, this.persistenceRepository.eventSnapshotRepository);
    if (!replay) return [];

    return this.stagingService.stageRunPublications(replay.run, replay.events, nowIso);
  }

  async stagePublicationsForRequestKey(requestKey: string, nowIso: string): Promise<PersistedOutboxItem[]> {
    const run = await this.persistenceRepository.runRepository.getRunByRequestKey(requestKey);
    if (!run) return [];
    const events = await this.persistenceRepository.eventSnapshotRepository.getEventsByRunId(run.runId);
    return this.stagingService.stageRunPublications(run, events, nowIso);
  }

  async stagePublicationsForSlot(asset: CanonicalAssetSymbol, timeframe: Timeframe, slotStartAt: string, nowIso: string): Promise<PersistedOutboxItem[]> {
    const candidates = await this.persistenceRepository.runRepository.listRecentRuns({
      limit: 10,
      asset,
      timeframe,
      triggerKind: 'scheduled',
      slotStartAt
    });
    const run = candidates[0];
    if (!run) return [];
    const events = await this.persistenceRepository.eventSnapshotRepository.getEventsByRunId(run.runId);
    return this.stagingService.stageRunPublications(run, events, nowIso);
  }
}
