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
import { buildProviderLiveSmokePlan, getProviderLiveActivationPolicy, getProviderLiveReadinessSnapshot, type RuntimeReadinessConfig } from '../provider-live-readiness/index';
import { buildEvidenceQualityReport, evaluateEvidencePayloadQuality, evaluateEvidencePayloadsQuality } from '../evidence-quality/index';
import { assembleReasoningEvidenceInputSnapshot as assembleSnapshot, buildReasoningEvidenceInputAssemblyReport as buildSnapshotReport } from '../reasoning-input/index';
import type { ReasoningEvidenceFilterPolicy, ReasoningEvidenceInputSnapshot, ReasoningEvidenceInputAssemblyReport, MarketEvidenceClass, EvidenceWeightHorizon, WeightedEvidenceSnapshot, WeightedEvidenceAssemblyReport, WeightedEvidencePolicySnapshot, MarketCognitionAssemblyReport, MarketCognitionSnapshot, SeoContentFeedAssemblyReport, SeoContentFeedSnapshot, SeoPageKind, SeoContentFeedItem } from '@elceo/types';
import type { TradingAssetCoverage } from '@elceo/types';
import { buildWeightedEvidenceAssemblyReport, buildWeightedEvidenceSnapshot, getWeightedEvidencePolicySnapshot } from '../evidence-weighting/index';
import { buildMarketCognitionAssemblyReport as buildCognitionReport, buildMarketCognitionSnapshot as buildCognitionSnapshot } from '../market-cognition/index';
import { buildSeoContentFeedAssemblyReport as buildSeoFeedReport, buildSeoContentFeedSnapshot as buildSeoFeedSnapshot } from '../seo-feed/index';
import { getSeoContentArchitectureSnapshot, listSeoPagesForAsset, listSeoPagesForEvidenceClass } from '../seo-content/index';
import { ScheduledIngestionService, ScheduledIngestionQueryService, getScheduledIngestionPolicySnapshot, getScheduledIngestionRunReplay } from '../scheduled-ingestion/index';
import type { ScheduledIngestionRunRepository } from '../persistence/scheduled-ingestion-repository';

export type TiingoFixtureIngestionParams = { asset: TradingAssetCoverage; frequency?: string | null; requestedAt?: string | null };

export class CanonicalMarketIntelligenceBoundaryService {
  private readonly ingestion: IngestionPersistenceService | null = null;
  private readonly query: ProviderSourceQueryService | null = null;
  private readonly replay: ProviderSourceReplayService | null = null;
  private readonly scheduledIngestionService: ScheduledIngestionService | null = null;
  private readonly scheduledIngestionQuery: ScheduledIngestionQueryService | null = null;
  private readonly scheduledIngestionRepository: ScheduledIngestionRunRepository | null = null;
  constructor(private readonly marketEvidenceRepository: MarketEvidenceRegistrySnapshotRepository, private readonly seoRepository: SeoContentArchitectureSnapshotRepository, requestRepository?: ProviderSourceRequestRepository, responseRepository?: ProviderSourceResponseRepository, payloadRepository?: NormalizedMarketEvidencePayloadRepository, scheduledIngestionRepository?: ScheduledIngestionRunRepository) {
    this.scheduledIngestionRepository = scheduledIngestionRepository ?? null;
    if (requestRepository && responseRepository && payloadRepository) {
      this.ingestion = new IngestionPersistenceService(requestRepository, responseRepository, payloadRepository);
      this.query = new ProviderSourceQueryService(requestRepository, responseRepository, payloadRepository);
      this.replay = new ProviderSourceReplayService(requestRepository, responseRepository, payloadRepository);
      if (this.scheduledIngestionRepository) {
        this.scheduledIngestionService = new ScheduledIngestionService(this.ingestion, this.scheduledIngestionRepository);
      }
    }
    if (this.scheduledIngestionRepository) this.scheduledIngestionQuery = new ScheduledIngestionQueryService(this.scheduledIngestionRepository);
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
  getProviderLiveActivationPolicy(providerId: string, environment: 'local'|'staging'|'production') { return getProviderLiveActivationPolicy(providerId, environment); }
  getProviderLiveReadinessSnapshot(environment: 'local'|'staging'|'production', config?: RuntimeReadinessConfig) { return getProviderLiveReadinessSnapshot(environment, config); }
  buildProviderLiveSmokePlan(providerId: string, environment: 'local'|'staging'|'production', config?: RuntimeReadinessConfig) { return buildProviderLiveSmokePlan(providerId, environment, config); }


  assembleReasoningEvidenceInputSnapshot(params:{payloads: Parameters<typeof assembleSnapshot>[0]['payloads']; qualityScores?: Parameters<typeof assembleSnapshot>[0]['qualityScores']; generatedAt: string; asset?: TradingAssetCoverage|null; evidenceClass?: MarketEvidenceClass|null; filterPolicy?: ReasoningEvidenceFilterPolicy;}): ReasoningEvidenceInputSnapshot { return assembleSnapshot(params); }
  buildReasoningEvidenceInputAssemblyReport(snapshot: ReasoningEvidenceInputSnapshot): ReasoningEvidenceInputAssemblyReport { return buildSnapshotReport(snapshot); }
  async getReasoningEvidenceInputByAsset(asset: TradingAssetCoverage, limit?: number, evaluatedAt?: string, filterPolicy?: ReasoningEvidenceFilterPolicy) { const payloads=await this.listEvidencePayloadsByAsset(asset,limit); const scores=this.evaluateEvidencePayloadsQuality(payloads,evaluatedAt); return assembleSnapshot({payloads,qualityScores:scores,generatedAt:evaluatedAt??new Date().toISOString(),asset,evidenceClass:null,...(filterPolicy?{filterPolicy}:{})}); }
  async getReasoningEvidenceInputByEvidenceClass(evidenceClass: MarketEvidenceClass, limit?: number, evaluatedAt?: string, filterPolicy?: ReasoningEvidenceFilterPolicy) { const payloads=await this.listEvidencePayloadsByEvidenceClass(evidenceClass,limit); const scores=this.evaluateEvidencePayloadsQuality(payloads,evaluatedAt); return assembleSnapshot({payloads,qualityScores:scores,generatedAt:evaluatedAt??new Date().toISOString(),asset:null,evidenceClass,...(filterPolicy?{filterPolicy}:{})}); }

  getWeightedEvidencePolicySnapshot(asOfIso?: string): WeightedEvidencePolicySnapshot { return getWeightedEvidencePolicySnapshot(asOfIso); }
  buildWeightedEvidenceSnapshot(inputSnapshot: ReasoningEvidenceInputSnapshot, asset: TradingAssetCoverage, horizon: EvidenceWeightHorizon, generatedAt?: string): WeightedEvidenceSnapshot { return buildWeightedEvidenceSnapshot(inputSnapshot, asset, horizon, generatedAt); }
  buildWeightedEvidenceAssemblyReport(snapshot: WeightedEvidenceSnapshot): WeightedEvidenceAssemblyReport { return buildWeightedEvidenceAssemblyReport(snapshot); }
  async getWeightedEvidenceByAsset(asset: TradingAssetCoverage, horizon: EvidenceWeightHorizon, limit?: number, evaluatedAt?: string, filterPolicy?: ReasoningEvidenceFilterPolicy) { const input=await this.getReasoningEvidenceInputByAsset(asset, limit, evaluatedAt, filterPolicy); return buildWeightedEvidenceSnapshot(input, asset, horizon, evaluatedAt); }
  buildMarketCognitionSnapshot(weightedSnapshot: WeightedEvidenceSnapshot, generatedAt?: string): MarketCognitionSnapshot { return buildCognitionSnapshot(weightedSnapshot, generatedAt); }
  buildMarketCognitionAssemblyReport(snapshot: MarketCognitionSnapshot): MarketCognitionAssemblyReport { return buildCognitionReport(snapshot); }
  async getMarketCognitionByAsset(asset: TradingAssetCoverage, horizon: EvidenceWeightHorizon, limit?: number, evaluatedAt?: string, filterPolicy?: ReasoningEvidenceFilterPolicy) { const weighted = await this.getWeightedEvidenceByAsset(asset, horizon, limit, evaluatedAt, filterPolicy); return buildCognitionSnapshot(weighted, evaluatedAt); }

  evaluateEvidencePayloadQuality(payload: Parameters<typeof evaluateEvidencePayloadQuality>[0], evaluatedAt?: string) { return evaluateEvidencePayloadQuality(payload, evaluatedAt); }
  evaluateEvidencePayloadsQuality(payloads: Parameters<typeof evaluateEvidencePayloadsQuality>[0], evaluatedAt?: string) { return evaluateEvidencePayloadsQuality(payloads, evaluatedAt); }
  buildEvidenceQualityReport(payloads: Parameters<typeof buildEvidenceQualityReport>[0], evaluatedAt?: string) { return buildEvidenceQualityReport(payloads, evaluatedAt); }
  async listEvidencePayloadsByAssetWithQuality(asset: string, limit?: number, evaluatedAt?: string) { const payloads=await this.listEvidencePayloadsByAsset(asset, limit); return payloads.map((payload)=>({ payload, score: evaluateEvidencePayloadQuality(payload, evaluatedAt) })); }
  async listEvidencePayloadsByEvidenceClassWithQuality(evidenceClass: string, limit?: number, evaluatedAt?: string) { const payloads=await this.listEvidencePayloadsByEvidenceClass(evidenceClass, limit); return payloads.map((payload)=>({ payload, score: evaluateEvidencePayloadQuality(payload, evaluatedAt) })); }


  getScheduledIngestionPolicySnapshot(asOfIso?: string) { return getScheduledIngestionPolicySnapshot(asOfIso); }
  runScheduledIngestionDryRun(jobId: string, startedAt?: string) { if (!this.scheduledIngestionService) throw new Error('missing_scheduled_ingestion_repository'); return this.scheduledIngestionService.runScheduledIngestionDryRun(jobId, startedAt); }
  runScheduledIngestionJob(jobId: string, modeOverride?: Parameters<ScheduledIngestionService['runScheduledIngestionJob']>[1], startedAt?: string) { if (!this.scheduledIngestionService) throw new Error('missing_scheduled_ingestion_repository'); return this.scheduledIngestionService.runScheduledIngestionJob(jobId, modeOverride, startedAt); }
  getScheduledIngestionRunById(runId: string) { if (!this.scheduledIngestionQuery) throw new Error('missing_scheduled_ingestion_repository'); return this.scheduledIngestionQuery.getScheduledIngestionRunById(runId); }
  listScheduledIngestionRunsByProvider(providerId: string, capability?: string, limit?: number) { if (!this.scheduledIngestionQuery) throw new Error('missing_scheduled_ingestion_repository'); return this.scheduledIngestionQuery.listScheduledIngestionRunsByProvider(providerId, capability, limit); }
  listScheduledIngestionRunsByStatus(status: Parameters<ScheduledIngestionRunRepository['listRunsByStatus']>[0], limit?: number) { if (!this.scheduledIngestionQuery) throw new Error('missing_scheduled_ingestion_repository'); return this.scheduledIngestionQuery.listScheduledIngestionRunsByStatus(status, limit); }
  getScheduledIngestionRunReplay(runId: string) { if (!this.scheduledIngestionRepository) throw new Error('missing_scheduled_ingestion_repository'); return getScheduledIngestionRunReplay(this.scheduledIngestionRepository, runId); }
  buildSeoContentFeedSnapshot(generatedAt?: string): SeoContentFeedSnapshot { return buildSeoFeedSnapshot(getSeoContentArchitectureSnapshot(generatedAt??new Date().toISOString()), generatedAt); }
  buildSeoContentFeedAssemblyReport(snapshot: SeoContentFeedSnapshot): SeoContentFeedAssemblyReport { return buildSeoFeedReport(snapshot); }
  listSeoContentFeedItemsByPageKind(pageKind: SeoPageKind, generatedAt?: string): SeoContentFeedItem[] { const snap=this.buildSeoContentFeedSnapshot(generatedAt); return snap.items.filter((x)=>x.pageKind===pageKind); }
  listSeoContentFeedItemsForAsset(asset: TradingAssetCoverage, generatedAt?: string): SeoContentFeedItem[] { const ids=new Set(listSeoPagesForAsset(asset).map((x)=>x.pageId)); return this.buildSeoContentFeedSnapshot(generatedAt).items.filter((x)=>ids.has(x.pageId)); }
  listSeoContentFeedItemsForEvidenceClass(evidenceClass: MarketEvidenceClass, generatedAt?: string): SeoContentFeedItem[] { const ids=new Set(listSeoPagesForEvidenceClass(evidenceClass).map((x)=>x.pageId)); return this.buildSeoContentFeedSnapshot(generatedAt).items.filter((x)=>ids.has(x.pageId)); }
  getSeoContentFeedItemBySlug(slug: string, generatedAt?: string): SeoContentFeedItem | null { return this.buildSeoContentFeedSnapshot(generatedAt).items.find((x)=>x.slug===slug)??null; }

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
