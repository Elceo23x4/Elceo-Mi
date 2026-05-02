import { deserializeMarketEvidenceRegistrySnapshot } from './serialization';
import type { MarketEvidenceRegistrySnapshotRepository } from '../persistence/registry-snapshot-repository';

export async function getMarketEvidenceRegistryReplayById(repository: MarketEvidenceRegistrySnapshotRepository, snapshotId: string) {
  const record = await repository.getSnapshotById(snapshotId);
  if (!record) return null;
  return { record, snapshot: deserializeMarketEvidenceRegistrySnapshot(record.registryJson) };
}

export async function getLatestMarketEvidenceRegistryReplay(repository: MarketEvidenceRegistrySnapshotRepository) {
  const record = await repository.getLatestSnapshot();
  if (!record) return null;
  return { record, snapshot: deserializeMarketEvidenceRegistrySnapshot(record.registryJson) };
}
