import { deserializeSeoContentArchitectureSnapshot } from './serialization';
import type { SeoContentArchitectureSnapshotRepository } from '../persistence/registry-snapshot-repository';

export async function getSeoContentArchitectureReplayById(repository: SeoContentArchitectureSnapshotRepository, snapshotId: string) {
  const record = await repository.getSnapshotById(snapshotId);
  if (!record) return null;
  return { record, snapshot: deserializeSeoContentArchitectureSnapshot(record.architectureJson) };
}

export async function getLatestSeoContentArchitectureReplay(repository: SeoContentArchitectureSnapshotRepository) {
  const record = await repository.getLatestSnapshot();
  if (!record) return null;
  return { record, snapshot: deserializeSeoContentArchitectureSnapshot(record.architectureJson) };
}
