import { getMarketEvidenceRegistrySnapshot } from './market-evidence-registry';
import { serializeMarketEvidenceRegistrySnapshot } from './serialization';
import type { MarketEvidenceRegistrySnapshotRepository } from '../persistence/registry-snapshot-repository';

export async function generateAndPersistMarketEvidenceRegistrySnapshot(repository: MarketEvidenceRegistrySnapshotRepository, asOfIso = new Date().toISOString()): Promise<{ snapshotId: string; snapshot: ReturnType<typeof getMarketEvidenceRegistrySnapshot> }> {
  const snapshot = getMarketEvidenceRegistrySnapshot(asOfIso);
  const snapshotId = `market_evidence_registry_${snapshot.generatedAt}`;
  await repository.saveSnapshot({ snapshotId, generatedAt: snapshot.generatedAt, registryJson: serializeMarketEvidenceRegistrySnapshot(snapshot), evidenceTypeCount: snapshot.evidenceTypes.length, sourceCount: snapshot.sources.length, assetInfluenceCount: snapshot.assetInfluences.length, createdAt: new Date().toISOString() });
  return { snapshotId, snapshot };
}
