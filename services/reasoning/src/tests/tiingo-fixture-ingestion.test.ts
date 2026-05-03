import { MemoryNormalizedMarketEvidencePayloadRepository, MemoryProviderSourceRequestRepository, MemoryProviderSourceResponseRepository } from '../persistence/market-evidence-ingestion-repository';
import { MemoryMarketEvidenceRegistrySnapshotRepository, MemorySeoContentArchitectureSnapshotRepository } from '../persistence/registry-snapshot-repository';
import { CanonicalMarketIntelligenceBoundaryService } from '../runtime/canonical-market-intelligence-boundary';

export async function runTiingoFixtureIngestionTests(): Promise<void> {
  const boundary = new CanonicalMarketIntelligenceBoundaryService(
    new MemoryMarketEvidenceRegistrySnapshotRepository(),
    new MemorySeoContentArchitectureSnapshotRepository(),
    new MemoryProviderSourceRequestRepository(),
    new MemoryProviderSourceResponseRepository(),
    new MemoryNormalizedMarketEvidencePayloadRepository()
  );
  const report = await boundary.runTiingoFixtureIngestion({ asset: 'xau_usd', requestedAt: '2026-01-10T00:00:00.000Z', frequency: 'daily' });
  if (report.responseStatus !== 'success') throw new Error('fixture ingestion should succeed');
  if (report.payloadCount !== report.persistedPayloadIds.length) throw new Error('payload count mismatch');
  const payloads = await boundary.listEvidencePayloadsByAsset('xau_usd', 10);
  if (payloads.length !== report.payloadCount) throw new Error('asset query mismatch');
  const first = payloads[0];
  if (!first) throw new Error('missing payload');
  const replay = await boundary.getNormalizedMarketEvidencePayloadReplayById(first.payloadId);
  if (!replay || replay.payloadId !== first.payloadId) throw new Error('replay mismatch');
  const unsupported = await boundary.runTiingoFixtureIngestion({ asset: 'de30', requestedAt: '2026-01-10T00:00:00.000Z' });
  if (!(unsupported.responseStatus === 'empty' || unsupported.responseStatus === 'success')) throw new Error('supported assets should not be unsupported');
}
