import { generateAndPersistMarketEvidenceRegistrySnapshot } from '../evidence-registry/snapshot-service';
import { getLatestMarketEvidenceRegistrySnapshot, listMarketEvidenceRegistrySnapshots } from '../evidence-registry/query-service';
import { getMarketEvidenceRegistryReplayById } from '../evidence-registry/replay';
import { generateAndPersistSeoContentArchitectureSnapshot } from '../seo-content/snapshot-service';
import { getLatestSeoContentArchitectureSnapshot, listSeoContentArchitectureSnapshots } from '../seo-content/query-service';
import { getSeoContentArchitectureReplayById } from '../seo-content/replay';
import type { MarketEvidenceRegistrySnapshotRepository, SeoContentArchitectureSnapshotRepository } from '../persistence/registry-snapshot-repository';
import type { NormalizedMarketEvidencePayloadRepository, ProviderSourceRequestRepository, ProviderSourceResponseRepository } from '../persistence/market-evidence-ingestion-repository';
import { IngestionPersistenceService } from '../provider-sources/ingestion-persistence-service';
import { ProviderSourceQueryService } from '../provider-sources/query-service';
import { ProviderSourceReplayService } from '../provider-sources/replay';

export class CanonicalMarketIntelligenceBoundaryService {
  private readonly ingestion: IngestionPersistenceService | null = null;
  private readonly query: ProviderSourceQueryService | null = null;
  private readonly replay: ProviderSourceReplayService | null = null;
  constructor(private readonly marketEvidenceRepository: MarketEvidenceRegistrySnapshotRepository, private readonly seoRepository: SeoContentArchitectureSnapshotRepository, requestRepository?: ProviderSourceRequestRepository, responseRepository?: ProviderSourceResponseRepository, payloadRepository?: NormalizedMarketEvidencePayloadRepository) {
    if (requestRepository && responseRepository && payloadRepository) {
      this.ingestion = new IngestionPersistenceService(requestRepository, responseRepository, payloadRepository);
      this.query = new ProviderSourceQueryService(requestRepository, responseRepository, payloadRepository);
      this.replay = new ProviderSourceReplayService(requestRepository, responseRepository, payloadRepository);
    }
  }
  generateAndPersistMarketEvidenceRegistrySnapshot(asOfIso?: string) { return generateAndPersistMarketEvidenceRegistrySnapshot(this.marketEvidenceRepository, asOfIso); }
  getLatestMarketEvidenceRegistrySnapshot() { return getLatestMarketEvidenceRegistrySnapshot(this.marketEvidenceRepository); }
  listMarketEvidenceRegistrySnapshots(limit?: number) { return listMarketEvidenceRegistrySnapshots(this.marketEvidenceRepository, limit); }
  getMarketEvidenceRegistryReplayById(snapshotId: string) { return getMarketEvidenceRegistryReplayById(this.marketEvidenceRepository, snapshotId); }
  generateAndPersistSeoContentArchitectureSnapshot(asOfIso?: string) { return generateAndPersistSeoContentArchitectureSnapshot(this.seoRepository, asOfIso); }
  getLatestSeoContentArchitectureSnapshot() { return getLatestSeoContentArchitectureSnapshot(this.seoRepository); }
  listSeoContentArchitectureSnapshots(limit?: number) { return listSeoContentArchitectureSnapshots(this.seoRepository, limit); }
  getSeoContentArchitectureReplayById(snapshotId: string) { return getSeoContentArchitectureReplayById(this.seoRepository, snapshotId); }

  persistIngestionResult(request: Parameters<IngestionPersistenceService['persistIngestionResult']>[0], response: Parameters<IngestionPersistenceService['persistIngestionResult']>[1], payloads: Parameters<IngestionPersistenceService['persistIngestionResult']>[2]) { if (!this.ingestion) throw new Error('missing_ingestion_repositories'); return this.ingestion.persistIngestionResult(request, response, payloads); }
  persistAdapterFetchAndNormalize(adapter: Parameters<IngestionPersistenceService['persistAdapterFetchAndNormalize']>[0], request: Parameters<IngestionPersistenceService['persistAdapterFetchAndNormalize']>[1]) { if (!this.ingestion) throw new Error('missing_ingestion_repositories'); return this.ingestion.persistAdapterFetchAndNormalize(adapter, request); }
  getProviderSourceRequestById(requestId: string) { if (!this.query) throw new Error('missing_ingestion_repositories'); return this.query.getProviderSourceRequestById(requestId); }
  getProviderSourceResponseByRequestId(requestId: string) { if (!this.query) throw new Error('missing_ingestion_repositories'); return this.query.getProviderSourceResponseByRequestId(requestId); }
  listEvidencePayloadsByAsset(asset: string, limit?: number) { if (!this.query) throw new Error('missing_ingestion_repositories'); return this.query.listEvidencePayloadsByAsset(asset, limit); }
  listEvidencePayloadsByEvidenceClass(evidenceClass: string, limit?: number) { if (!this.query) throw new Error('missing_ingestion_repositories'); return this.query.listEvidencePayloadsByEvidenceClass(evidenceClass, limit); }
  listEvidencePayloadsByEvidenceType(evidenceTypeId: string, limit?: number) { if (!this.query) throw new Error('missing_ingestion_repositories'); return this.query.listEvidencePayloadsByEvidenceType(evidenceTypeId, limit); }
  getNormalizedMarketEvidencePayloadReplayById(payloadId: string) { if (!this.replay) throw new Error('missing_ingestion_repositories'); return this.replay.getNormalizedMarketEvidencePayloadReplayById(payloadId); }
}


  // ingestion C5-A5
