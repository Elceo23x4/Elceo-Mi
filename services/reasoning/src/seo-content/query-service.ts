import type { SeoContentArchitectureSnapshotRepository } from '../persistence/registry-snapshot-repository';
export const getLatestSeoContentArchitectureSnapshot = (repository: SeoContentArchitectureSnapshotRepository) => repository.getLatestSnapshot();
export const listSeoContentArchitectureSnapshots = (repository: SeoContentArchitectureSnapshotRepository, limit?: number) => repository.listRecentSnapshots(limit);
