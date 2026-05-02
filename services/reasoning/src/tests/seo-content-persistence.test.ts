import assert from 'node:assert/strict';
import { MemorySeoContentArchitectureSnapshotRepository, MemoryMarketEvidenceRegistrySnapshotRepository } from '../persistence/registry-snapshot-repository';
import { generateAndPersistSeoContentArchitectureSnapshot } from '../seo-content/snapshot-service';
import { deserializeSeoContentArchitectureSnapshot, serializeSeoContentArchitectureSnapshot } from '../seo-content/serialization';
import { getLatestSeoContentArchitectureSnapshot } from '../seo-content/query-service';
import { getLatestSeoContentArchitectureReplay, getSeoContentArchitectureReplayById } from '../seo-content/replay';
import { CanonicalMarketIntelligenceBoundaryService } from '../runtime/canonical-market-intelligence-boundary';

export async function runSeoContentPersistenceTests(): Promise<void> {
  const repo = new MemorySeoContentArchitectureSnapshotRepository();
  assert.equal(await repo.getLatestSnapshot(), null);
  const created = await generateAndPersistSeoContentArchitectureSnapshot(repo, '2026-01-01T00:00:00.000Z');
  const roundTrip = deserializeSeoContentArchitectureSnapshot(serializeSeoContentArchitectureSnapshot(created.snapshot));
  assert.equal(roundTrip.generatedAt, created.snapshot.generatedAt);
  assert.throws(() => deserializeSeoContentArchitectureSnapshot('{bad'), /malformed_json/);
  const latest = await getLatestSeoContentArchitectureSnapshot(repo);
  assert.ok(latest);
  assert.equal(latest.pageCount, created.snapshot.pages.length);
  const replay = await getSeoContentArchitectureReplayById(repo, created.snapshotId);
  assert.ok(replay);
  const latestReplay = await getLatestSeoContentArchitectureReplay(repo);
  assert.ok(latestReplay);
  const boundary = new CanonicalMarketIntelligenceBoundaryService(new MemoryMarketEvidenceRegistrySnapshotRepository(), repo);
  const b = await boundary.generateAndPersistSeoContentArchitectureSnapshot('2026-01-02T00:00:00.000Z');
  assert.ok(b.snapshotId.includes('seo_content_architecture_'));
}
