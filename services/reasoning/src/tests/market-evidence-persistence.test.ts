import assert from 'node:assert/strict';
import { MemoryMarketEvidenceRegistrySnapshotRepository } from '../persistence/registry-snapshot-repository';
import { generateAndPersistMarketEvidenceRegistrySnapshot } from '../evidence-registry/snapshot-service';
import { deserializeMarketEvidenceRegistrySnapshot, serializeMarketEvidenceRegistrySnapshot } from '../evidence-registry/serialization';
import { getLatestMarketEvidenceRegistrySnapshot } from '../evidence-registry/query-service';
import { getLatestMarketEvidenceRegistryReplay, getMarketEvidenceRegistryReplayById } from '../evidence-registry/replay';
import { CanonicalMarketIntelligenceBoundaryService } from '../runtime/canonical-market-intelligence-boundary';
import { MemorySeoContentArchitectureSnapshotRepository } from '../persistence/registry-snapshot-repository';

export async function runMarketEvidencePersistenceTests(): Promise<void> {
  const repo = new MemoryMarketEvidenceRegistrySnapshotRepository();
  assert.equal(await repo.getLatestSnapshot(), null);
  const created = await generateAndPersistMarketEvidenceRegistrySnapshot(repo, '2026-01-01T00:00:00.000Z');
  const roundTrip = deserializeMarketEvidenceRegistrySnapshot(serializeMarketEvidenceRegistrySnapshot(created.snapshot));
  assert.equal(roundTrip.generatedAt, created.snapshot.generatedAt);
  assert.throws(() => deserializeMarketEvidenceRegistrySnapshot('{bad'), /malformed_json/);
  const latest = await getLatestMarketEvidenceRegistrySnapshot(repo);
  assert.ok(latest);
  assert.equal(latest.evidenceTypeCount, created.snapshot.evidenceTypes.length);
  const replay = await getMarketEvidenceRegistryReplayById(repo, created.snapshotId);
  assert.ok(replay);
  assert.equal(replay.snapshot.generatedAt, created.snapshot.generatedAt);
  const latestReplay = await getLatestMarketEvidenceRegistryReplay(repo);
  assert.ok(latestReplay);
  const boundary = new CanonicalMarketIntelligenceBoundaryService(repo, new MemorySeoContentArchitectureSnapshotRepository());
  const b = await boundary.generateAndPersistMarketEvidenceRegistrySnapshot('2026-01-02T00:00:00.000Z');
  assert.ok(b.snapshotId.includes('market_evidence_registry_'));
}
