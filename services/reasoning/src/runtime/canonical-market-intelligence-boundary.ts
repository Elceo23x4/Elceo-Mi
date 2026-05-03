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
import { getTiingoProviderHealth, TiingoMarketDataAdapter, type TiingoRuntimeConfig } from '../provider-sources/tiingo/index';
import { buildEvidenceQualityReport, evaluateEvidencePayloadQuality, evaluateEvidencePayloadsQuality } from '../evidence-quality/index';
import type { TradingAssetCoverage } from '@elceo/types';

export type TiingoFixtureIngestionParams = { asset: TradingAssetCoverage; frequency?: string | null; requestedAt?: string | null };

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
  getTiingoProviderHealth(config?: TiingoRuntimeConfig) { return getTiingoProviderHealth(config); }

  evaluateEvidencePayloadQuality(payload: Parameters<typeof evaluateEvidencePayloadQuality>[0], evaluatedAt?: string) { return evaluateEvidencePayloadQuality(payload, evaluatedAt); }
  evaluateEvidencePayloadsQuality(payloads: Parameters<typeof evaluateEvidencePayloadsQuality>[0], evaluatedAt?: string) { return evaluateEvidencePayloadsQuality(payloads, evaluatedAt); }
  buildEvidenceQualityReport(payloads: Parameters<typeof buildEvidenceQualityReport>[0], evaluatedAt?: string) { return buildEvidenceQualityReport(payloads, evaluatedAt); }
  async listEvidencePayloadsByAssetWithQuality(asset: string, limit?: number, evaluatedAt?: string) { const payloads=await this.listEvidencePayloadsByAsset(asset, limit); return payloads.map((payload)=>({ payload, score: evaluateEvidencePayloadQuality(payload, evaluatedAt) })); }
  async listEvidencePayloadsByEvidenceClassWithQuality(evidenceClass: string, limit?: number, evaluatedAt?: string) { const payloads=await this.listEvidencePayloadsByEvidenceClass(evidenceClass, limit); return payloads.map((payload)=>({ payload, score: evaluateEvidencePayloadQuality(payload, evaluatedAt) })); }
  async runTiingoFixtureIngestion(params: TiingoFixtureIngestionParams) {
    if (!this.ingestion) throw new Error('missing_ingestion_repositories');
    const supportedAssets = new Set<TradingAssetCoverage>(['xau_usd', 'eur_usd', 'gbp_usd', 'usd_jpy', 'usd_chf', 'aud_usd', 'nzd_usd', 'usd_cad', 'btc_usd', 'nasdaq_100', 'sp500', 'de30']);
    if (!supportedAssets.has(params.asset)) {
      return {
        requestId: `tiingo-fixture-unsupported-${params.asset}`,
        providerId: 'tiingo_market_data',
        capability: 'market_price_history',
        responseStatus: 'unsupported' as const,
        payloadCount: 0,
        persistedPayloadIds: [],
        errors: [`unsupported_asset:${params.asset}`]
      };
    }
    const requestedAt = params.requestedAt ?? '2026-01-10T00:00:00.000Z';
    const frequency = params.frequency ?? 'daily';
    const requestId = `tiingo-fixture-${params.asset}-${frequency}-${requestedAt}`;
    const adapter = new TiingoMarketDataAdapter({ mode: 'fixture' });
    return this.ingestion.persistAdapterFetchAndNormalize(adapter, {
      requestId,
      providerId: 'tiingo_market_data',
      capability: 'market_price_history',
      asset: params.asset,
      region: 'global',
      evidenceTypeId: 'market_price_history',
      requestedAt,
      paramsJson: JSON.stringify({ mode: 'fixture', frequency })
    });
  }
}


  // ingestion C5-A5
