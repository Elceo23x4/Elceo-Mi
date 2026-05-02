import { getSeoContentArchitectureSnapshot } from './seo-architecture';
import { serializeSeoContentArchitectureSnapshot } from './serialization';
import type { SeoContentArchitectureSnapshotRepository } from '../persistence/registry-snapshot-repository';

export async function generateAndPersistSeoContentArchitectureSnapshot(repository: SeoContentArchitectureSnapshotRepository, asOfIso = new Date().toISOString()): Promise<{ snapshotId: string; snapshot: ReturnType<typeof getSeoContentArchitectureSnapshot> }> {
  const snapshot = getSeoContentArchitectureSnapshot(asOfIso);
  const snapshotId = `seo_content_architecture_${snapshot.generatedAt}`;
  await repository.saveSnapshot({ snapshotId, generatedAt: snapshot.generatedAt, architectureJson: serializeSeoContentArchitectureSnapshot(snapshot), keywordCount: snapshot.keywords.length, pageCount: snapshot.pages.length, internalLinkRuleCount: snapshot.internalLinkRules.length, createdAt: new Date().toISOString() });
  return { snapshotId, snapshot };
}
