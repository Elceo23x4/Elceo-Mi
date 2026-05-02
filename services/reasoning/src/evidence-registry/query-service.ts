import type { MarketEvidenceRegistrySnapshotRepository } from '../persistence/registry-snapshot-repository';
export const getLatestMarketEvidenceRegistrySnapshot = (repository: MarketEvidenceRegistrySnapshotRepository) => repository.getLatestSnapshot();
export const listMarketEvidenceRegistrySnapshots = (repository: MarketEvidenceRegistrySnapshotRepository, limit?: number) => repository.listRecentSnapshots(limit);
