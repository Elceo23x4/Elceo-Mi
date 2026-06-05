import { assertGoldenScenarioResult, getGoldenScenarioCoverageReport, getGoldenScenarioDefinition, getGoldenScenarioDefinitions, listGoldenScenariosByAsset, listGoldenScenariosByFamily, runAllGoldenScenarios, runGoldenScenario } from '../golden-scenario-reasoning/index';
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
import type { LaunchAsset, TradingAssetCoverage } from '@elceo/types';
import { buildWeightedEvidenceAssemblyReport, buildWeightedEvidenceSnapshot, getWeightedEvidencePolicySnapshot } from '../evidence-weighting/index';
import { buildMarketCognitionAssemblyReport as buildCognitionReport, buildMarketCognitionSnapshot as buildCognitionSnapshot } from '../market-cognition/index';
import { buildSeoContentFeedAssemblyReport as buildSeoFeedReport, buildSeoContentFeedSnapshot as buildSeoFeedSnapshot } from '../seo-feed/index';
import { getSeoContentArchitectureSnapshot, listSeoPagesForAsset, listSeoPagesForEvidenceClass } from '../seo-content/index';
import { ScheduledIngestionService, ScheduledIngestionQueryService, getScheduledIngestionPolicySnapshot, getScheduledIngestionRunReplay } from '../scheduled-ingestion/index';
import type { ScheduledIngestionRunRepository } from '../persistence/scheduled-ingestion-repository';
import { buildProviderActivationChecklist, getProviderSourceDescriptor, getProviderSourceRegistrySnapshot, listProviderSourceGaps, listProviderSourcesByFamily, listProviderSourcesForAsset } from '../provider-source-registry/index';
import { buildFixtureEvidenceForScenario, buildFixtureExpectedOutput, getLaunchAssetFixtureAssetPack, getLaunchAssetFixtureCoverageReport, getLaunchAssetFixtureLibrary, getLaunchAssetFixtureScenario, listLaunchAssetFixtureScenarios } from '../launch-asset-fixtures/index';
import { assertOfficialMacroSourceIdsInProviderSnapshot, getOfficialMacroAdapterReadiness, getOfficialMacroCoverageReport, getOfficialMacroFixturePayload, getOfficialMacroSourceDescriptor, getOfficialMacroSourceRegistry, listOfficialMacroFixturePayloads, listOfficialMacroReleaseDescriptors, listOfficialMacroSourcesByRegion, normalizeOfficialMacroFixturePayload } from '../official-macro-sources/index';
import { getCryptoRiskLiquidityAdapterReadiness, getCryptoRiskLiquidityCoverageReport, getCryptoRiskLiquidityFixturePayload, getCryptoRiskLiquiditySourceDescriptor, getCryptoRiskLiquiditySourceRegistry, listCreditStressFixturePayloads, listCryptoDerivativesFixturePayloads, listCryptoRiskLiquidityFixturePayloads, listCryptoRiskLiquiditySourcesByFamily, listLiquidityFixturePayloads, listMarketBreadthFixturePayloads, listRiskRegimeFixturePayloads, listVolatilityFixturePayloads, normalizeCryptoRiskLiquidityFixturePayload } from '../crypto-risk-liquidity/index';
import { checkCognitionGuardrails, decomposeConfidence, detectEvidenceContradictions, getAssetEvidenceWeights, getCognitionCalibrationCoverageReport, runAllCognitionCalibrationScenarios, runCognitionCalibrationForScenario, scoreEvidenceFreshness, scoreEvidenceQuality, scorePressureForAsset, scoreSourceCredibility, weightEvidenceForAsset } from '../cognition-calibration/index';
import { getNewsExtractionAdapterReadiness, getNewsExtractionCoverageReport, getNewsExtractionFixturePayload, getNewsExtractionSourceDescriptor, getNewsExtractionSourceRegistry, listEtfFlowFixturePayloads, listFilingFixturePayloads, listNarrativeClusterFixturePayloads, listNewsExtractionFixturePayloads, listNewsExtractionSourcesByFamily, normalizeNewsExtractionFixturePayload } from '../news-extraction-filings/index';
import { assertAssetDirectionResolutionRuleSetValid, getAssetDirectionResolutionCoverageReport, getAssetDirectionResolutionRuleSetSnapshot, listAssetDirectionResolutionWarnings, resolveAssetContextualEvidenceDirection } from '../asset-direction-resolution/index';
import { assertFxRelativeStrengthRuleSetValid, getFxRelativeStrengthCoverageReport, getFxRelativeStrengthRuleSetSnapshot, listFxRelativeStrengthWarnings, resolveFxRelativeStrength, resolveFxRelativeStrengthFromEvidenceItems, resolveFxRelativeStrengthFromWeightedSnapshot } from '../fx-relative-strength/index';
import { assertMarketPriceReactionRuleSetValid, evaluatePriceReaction, evaluatePriceReactionFromEvidenceItem, evaluatePriceReactionFromWeightedSnapshot, getMarketPriceReactionCoverageReport, getMarketPriceReactionRuleSetSnapshot, listMarketPriceReactionRules, listMarketPriceReactionWarnings } from '../price-reaction/index';
import { assertMarketConfidenceCalibrationRuleSetValid, buildConfidenceCalibrationInputFromWeightedSnapshot, calibrateConfidenceFromMarketCognition, calibrateConfidenceFromWeightedSnapshot, calibrateMarketConfidence, getMarketConfidenceCalibrationCoverageReport, getMarketConfidenceCalibrationRuleSetSnapshot, listMarketConfidenceCalibrationRules, listMarketConfidenceCalibrationWarnings } from '../confidence-calibration/index';
import { assertMarketContradictionRuleSetValid, evaluateContradictionsFromEvidenceItems, evaluateContradictionsFromWeightedSnapshot, evaluateMarketContradictionMatrix, getMarketContradictionCoverageReport, getMarketContradictionRuleSetSnapshot, listMarketContradictionRules, listMarketContradictionWarnings } from '../contradiction-matrix/index';
import { assertMacroSurpriseRuleSetValid, getMacroSurpriseCoverageReport, getMacroSurpriseRuleSetSnapshot, listMacroSurpriseWarnings, normalizeMacroSurprise, normalizeMacroSurpriseFromEvidenceItem, normalizeMacroSurprisesFromEvidenceItems } from '../macro-surprise-normalization/index';
import { assertMarketAssetCausalityMatrixValid as assertAssetCausalityMatrixValid, assertMarketAssetCausalityMatrixComplete as assertAssetCausalityMatrixComplete, buildMarketAssetCausalityMatrixSnapshot, getMarketAssetCausalityCoverageReport as getAssetCausalityCoverageReport, getMarketAssetCausalityDescriptor as getAssetCausalityDescriptor, listContradictionTriggersForAsset as listAssetContradictionTriggers, listDirectionResolutionRequirements as listAssetDirectionRequirements, listMarketAssetCausalityGaps, listProviderDependenciesForAsset as listAssetProviderDependencies, listRegimeModifiersForAsset as listAssetRegimeModifiers } from '../asset-causality-map/index';
import { getFrontendAssetDashboardPayload, getFrontendContractCoverageReport, getFrontendContradictionPanelPayload, getFrontendConfidenceDecompositionPayload, getFrontendEvidenceFeedPayload, getFrontendGoldenScenarioPreviewPayload, getFrontendJournalPortfolioContextPlaceholder, getFrontendMacroContextPayload, getFrontendMarketCognitionSnapshot, getFrontendMarketOverviewPayload, getFrontendMockPayloadRegistry, getFrontendNewsNarrativePayload, getFrontendProviderReadinessPayload, getFrontendRiskLiquidityPayload, getFrontendScheduledIngestionStatusPayload, getFrontendSupportedAssets } from '../frontend-contracts/index';

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

  getProviderSourceRegistrySnapshot(asOfIso?: string) { return getProviderSourceRegistrySnapshot(asOfIso); }
  listProviderSourcesByFamily(family: Parameters<typeof listProviderSourcesByFamily>[0]) { return listProviderSourcesByFamily(family); }
  listProviderSourcesForAsset(asset: Parameters<typeof listProviderSourcesForAsset>[0]) { return listProviderSourcesForAsset(asset); }
  getProviderSourceDescriptor(sourceId: Parameters<typeof getProviderSourceDescriptor>[0]) { return getProviderSourceDescriptor(sourceId); }
  listProviderSourceGaps() { return listProviderSourceGaps(); }
  buildProviderActivationChecklist(sourceId: Parameters<typeof buildProviderActivationChecklist>[0]) { return buildProviderActivationChecklist(sourceId); }

  getOfficialMacroSourceRegistry() { return getOfficialMacroSourceRegistry(); }
  getOfficialMacroSourceDescriptor(sourceId: Parameters<typeof getOfficialMacroSourceDescriptor>[0]) { return getOfficialMacroSourceDescriptor(sourceId); }
  listOfficialMacroSourcesByRegion(region: Parameters<typeof listOfficialMacroSourcesByRegion>[0]) { return listOfficialMacroSourcesByRegion(region); }
  listOfficialMacroReleaseDescriptors(sourceId?: Parameters<typeof listOfficialMacroReleaseDescriptors>[0]) { return listOfficialMacroReleaseDescriptors(sourceId); }
  listOfficialMacroFixturePayloads(sourceId?: Parameters<typeof listOfficialMacroFixturePayloads>[0]) { return listOfficialMacroFixturePayloads(sourceId); }
  getOfficialMacroFixturePayload(sourceId: Parameters<typeof getOfficialMacroFixturePayload>[0], fixtureId: Parameters<typeof getOfficialMacroFixturePayload>[1]) { return getOfficialMacroFixturePayload(sourceId, fixtureId); }
  normalizeOfficialMacroFixturePayload(payload: Parameters<typeof normalizeOfficialMacroFixturePayload>[0]) { return normalizeOfficialMacroFixturePayload(payload); }
  getOfficialMacroAdapterReadiness(sourceId: Parameters<typeof getOfficialMacroAdapterReadiness>[0]) { return getOfficialMacroAdapterReadiness(sourceId); }
  getOfficialMacroCoverageReport() { return getOfficialMacroCoverageReport(); }
  assertOfficialMacroSourceIdsInProviderSnapshot() { return assertOfficialMacroSourceIdsInProviderSnapshot(); }



  getCryptoRiskLiquiditySourceRegistry() { return getCryptoRiskLiquiditySourceRegistry(); }
  getCryptoRiskLiquiditySourceDescriptor(sourceId: Parameters<typeof getCryptoRiskLiquiditySourceDescriptor>[0]) { return getCryptoRiskLiquiditySourceDescriptor(sourceId); }
  listCryptoRiskLiquiditySourcesByFamily(family: Parameters<typeof listCryptoRiskLiquiditySourcesByFamily>[0]) { return listCryptoRiskLiquiditySourcesByFamily(family); }
  listCryptoRiskLiquidityFixturePayloads(sourceId?: Parameters<typeof listCryptoRiskLiquidityFixturePayloads>[0]) { return listCryptoRiskLiquidityFixturePayloads(sourceId); }
  getCryptoRiskLiquidityFixturePayload(sourceId: Parameters<typeof getCryptoRiskLiquidityFixturePayload>[0], fixtureId: Parameters<typeof getCryptoRiskLiquidityFixturePayload>[1]) { return getCryptoRiskLiquidityFixturePayload(sourceId, fixtureId); }
  normalizeCryptoRiskLiquidityFixturePayload(payload: Parameters<typeof normalizeCryptoRiskLiquidityFixturePayload>[0]) { return normalizeCryptoRiskLiquidityFixturePayload(payload); }
  listCryptoDerivativesFixturePayloads(asset?: Parameters<typeof listCryptoDerivativesFixturePayloads>[0]) { return listCryptoDerivativesFixturePayloads(asset); }
  listVolatilityFixturePayloads(asset?: Parameters<typeof listVolatilityFixturePayloads>[0]) { return listVolatilityFixturePayloads(asset); }
  listCreditStressFixturePayloads(asset?: Parameters<typeof listCreditStressFixturePayloads>[0]) { return listCreditStressFixturePayloads(asset); }
  listLiquidityFixturePayloads(asset?: Parameters<typeof listLiquidityFixturePayloads>[0]) { return listLiquidityFixturePayloads(asset); }
  listMarketBreadthFixturePayloads(asset?: Parameters<typeof listMarketBreadthFixturePayloads>[0]) { return listMarketBreadthFixturePayloads(asset); }
  listRiskRegimeFixturePayloads(asset?: Parameters<typeof listRiskRegimeFixturePayloads>[0]) { return listRiskRegimeFixturePayloads(asset); }
  getCryptoRiskLiquidityAdapterReadiness(sourceId: Parameters<typeof getCryptoRiskLiquidityAdapterReadiness>[0]) { return getCryptoRiskLiquidityAdapterReadiness(sourceId); }
  getCryptoRiskLiquidityCoverageReport() { return getCryptoRiskLiquidityCoverageReport(); }

  getNewsExtractionSourceRegistry() { return getNewsExtractionSourceRegistry(); }
  getNewsExtractionSourceDescriptor(sourceId: Parameters<typeof getNewsExtractionSourceDescriptor>[0]) { return getNewsExtractionSourceDescriptor(sourceId); }
  listNewsExtractionSourcesByFamily(family: Parameters<typeof listNewsExtractionSourcesByFamily>[0]) { return listNewsExtractionSourcesByFamily(family); }
  listNewsExtractionFixturePayloads(sourceId?: Parameters<typeof listNewsExtractionFixturePayloads>[0]) { return listNewsExtractionFixturePayloads(sourceId); }
  getNewsExtractionFixturePayload(sourceId: Parameters<typeof getNewsExtractionFixturePayload>[0], fixtureId: Parameters<typeof getNewsExtractionFixturePayload>[1]) { return getNewsExtractionFixturePayload(sourceId, fixtureId); }
  normalizeNewsExtractionFixturePayload(payload: Parameters<typeof normalizeNewsExtractionFixturePayload>[0]) { return normalizeNewsExtractionFixturePayload(payload); }
  listFilingFixturePayloads(asset?: Parameters<typeof listFilingFixturePayloads>[0]) { return listFilingFixturePayloads(asset); }
  listEtfFlowFixturePayloads(asset?: Parameters<typeof listEtfFlowFixturePayloads>[0]) { return listEtfFlowFixturePayloads(asset); }
  listNarrativeClusterFixturePayloads(asset?: Parameters<typeof listNarrativeClusterFixturePayloads>[0]) { return listNarrativeClusterFixturePayloads(asset); }
  getNewsExtractionAdapterReadiness(sourceId: Parameters<typeof getNewsExtractionAdapterReadiness>[0]) { return getNewsExtractionAdapterReadiness(sourceId); }
  getNewsExtractionCoverageReport() { return getNewsExtractionCoverageReport(); }

  getLaunchAssetFixtureLibrary() { return getLaunchAssetFixtureLibrary(); }
  getLaunchAssetFixtureAssetPack(asset: Parameters<typeof getLaunchAssetFixtureAssetPack>[0]) { return getLaunchAssetFixtureAssetPack(asset); }
  listLaunchAssetFixtureScenarios(asset?: Parameters<typeof listLaunchAssetFixtureScenarios>[0]) { return listLaunchAssetFixtureScenarios(asset); }
  getLaunchAssetFixtureScenario(scenarioId: Parameters<typeof getLaunchAssetFixtureScenario>[0]) { return getLaunchAssetFixtureScenario(scenarioId); }
  getLaunchAssetFixtureCoverageReport() { return getLaunchAssetFixtureCoverageReport(); }

  getGoldenScenarioDefinitions() { return getGoldenScenarioDefinitions(); }
  getGoldenScenarioDefinition(scenarioId: Parameters<typeof getGoldenScenarioDefinition>[0]) { return getGoldenScenarioDefinition(scenarioId); }
  listGoldenScenariosByAsset(asset: Parameters<typeof listGoldenScenariosByAsset>[0]) { return listGoldenScenariosByAsset(asset); }
  listGoldenScenariosByFamily(family: Parameters<typeof listGoldenScenariosByFamily>[0]) { return listGoldenScenariosByFamily(family); }
  runGoldenScenario(scenarioId: Parameters<typeof runGoldenScenario>[0]) { return runGoldenScenario(scenarioId); }
  runAllGoldenScenarios() { return runAllGoldenScenarios(); }
  assertGoldenScenarioResult(scenarioId: Parameters<typeof assertGoldenScenarioResult>[0]) { return assertGoldenScenarioResult(scenarioId); }
  getGoldenScenarioCoverageReport() { return getGoldenScenarioCoverageReport(); }
  buildFixtureEvidenceForScenario(scenarioId: Parameters<typeof buildFixtureEvidenceForScenario>[0]) { return buildFixtureEvidenceForScenario(scenarioId); }
  buildFixtureExpectedOutput(scenarioId: Parameters<typeof buildFixtureExpectedOutput>[0]) { return buildFixtureExpectedOutput(scenarioId); }

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

  scoreEvidenceQuality(input: Parameters<typeof scoreEvidenceQuality>[0]) { return scoreEvidenceQuality(input); }
  scoreEvidenceFreshness(observedAt: string, evaluatedAt: string) { return scoreEvidenceFreshness(observedAt, evaluatedAt); }
  scoreSourceCredibility(sourceId: string) { return scoreSourceCredibility(sourceId); }
  getAssetEvidenceWeights(asset: Parameters<typeof getAssetEvidenceWeights>[0], horizon?: Parameters<typeof getAssetEvidenceWeights>[1]) { return getAssetEvidenceWeights(asset, horizon); }
  weightEvidenceForAsset(asset: Parameters<typeof weightEvidenceForAsset>[0], evidenceItems: Parameters<typeof weightEvidenceForAsset>[1], horizon?: Parameters<typeof weightEvidenceForAsset>[2]) { return weightEvidenceForAsset(asset, evidenceItems, horizon); }
  scorePressureForAsset(asset: Parameters<typeof scorePressureForAsset>[0], weightedEvidence: Parameters<typeof scorePressureForAsset>[1]) { return scorePressureForAsset(asset, weightedEvidence); }
  detectEvidenceContradictions(asset: Parameters<typeof detectEvidenceContradictions>[0], weightedEvidence: Parameters<typeof detectEvidenceContradictions>[1]) { return detectEvidenceContradictions(asset, weightedEvidence); }
  decomposeConfidence(asset: Parameters<typeof decomposeConfidence>[0], weightedEvidence: Parameters<typeof decomposeConfidence>[1], contradictions: Parameters<typeof decomposeConfidence>[2], freshness: Parameters<typeof decomposeConfidence>[3]) { return decomposeConfidence(asset, weightedEvidence, contradictions, freshness); }
  checkCognitionGuardrails(textOrResult: Parameters<typeof checkCognitionGuardrails>[0]) { return checkCognitionGuardrails(textOrResult); }
  runCognitionCalibrationForScenario(scenarioId: string) { return runCognitionCalibrationForScenario(scenarioId); }
  runAllCognitionCalibrationScenarios() { return runAllCognitionCalibrationScenarios(); }
  getCognitionCalibrationCoverageReport() { return getCognitionCalibrationCoverageReport(); }
  async listEvidencePayloadsByAssetWithQuality(asset: string, limit?: number, evaluatedAt?: string) { const payloads=await this.listEvidencePayloadsByAsset(asset, limit); return payloads.map((payload)=>({ payload, score: evaluateEvidencePayloadQuality(payload, evaluatedAt) })); }
  async listEvidencePayloadsByEvidenceClassWithQuality(evidenceClass: string, limit?: number, evaluatedAt?: string) { const payloads=await this.listEvidencePayloadsByEvidenceClass(evidenceClass, limit); return payloads.map((payload)=>({ payload, score: evaluateEvidencePayloadQuality(payload, evaluatedAt) })); }


  getScheduledIngestionPolicySnapshot(asOfIso?: string) { return getScheduledIngestionPolicySnapshot(asOfIso); }
  runScheduledIngestionDryRun(jobId: string, startedAt?: string) { if (!this.scheduledIngestionService) throw new Error('missing_scheduled_ingestion_repository'); return this.scheduledIngestionService.runScheduledIngestionDryRun(jobId, startedAt); }
  runScheduledIngestionJob(jobId: string, modeOverride?: Parameters<ScheduledIngestionService['runScheduledIngestionJob']>[1], startedAt?: string) { if (!this.scheduledIngestionService) throw new Error('missing_scheduled_ingestion_repository'); return this.scheduledIngestionService.runScheduledIngestionJob(jobId, modeOverride, startedAt); }
  getScheduledIngestionRunById(runId: string) { if (!this.scheduledIngestionQuery) throw new Error('missing_scheduled_ingestion_repository'); return this.scheduledIngestionQuery.getScheduledIngestionRunById(runId); }
  listScheduledIngestionRunsByProvider(providerId: string, capability?: string, limit?: number) { if (!this.scheduledIngestionQuery) throw new Error('missing_scheduled_ingestion_repository'); return this.scheduledIngestionQuery.listScheduledIngestionRunsByProvider(providerId, capability, limit); }
  listScheduledIngestionRunsByStatus(status: Parameters<ScheduledIngestionRunRepository['listRunsByStatus']>[0], limit?: number) { if (!this.scheduledIngestionQuery) throw new Error('missing_scheduled_ingestion_repository'); return this.scheduledIngestionQuery.listScheduledIngestionRunsByStatus(status, limit); }
  getScheduledIngestionRunReplay(runId: string) { if (!this.scheduledIngestionRepository) throw new Error('missing_scheduled_ingestion_repository'); return getScheduledIngestionRunReplay(this.scheduledIngestionRepository, runId); }
  replayScheduledIngestionRun(runId: string, replayMode?: Parameters<ScheduledIngestionService['replayScheduledIngestionRun']>[1], startedAt?: string) { if (!this.scheduledIngestionService) throw new Error('missing_scheduled_ingestion_repository'); return this.scheduledIngestionService.replayScheduledIngestionRun(runId, replayMode, startedAt); }
  async getScheduledIngestionOperatorInspectionSnapshot() {
    if (!this.scheduledIngestionRepository) throw new Error('missing_scheduled_ingestion_repository');
    const [blocked, failed, skipped, succeeded, pending, running] = await Promise.all([
      this.scheduledIngestionRepository.listRunsByStatus('blocked', 200),
      this.scheduledIngestionRepository.listRunsByStatus('failed', 200),
      this.scheduledIngestionRepository.listRunsByStatus('skipped', 200),
      this.scheduledIngestionRepository.listRunsByStatus('succeeded', 200),
      this.scheduledIngestionRepository.listRunsByStatus('pending', 200),
      this.scheduledIngestionRepository.listRunsByStatus('running', 200)
    ]);
    const recentRuns = [...blocked, ...failed, ...skipped, ...succeeded, ...pending, ...running]
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
      .slice(0, 20);
    const replayRuns = recentRuns.filter((run) => Boolean(run.replayOfRunId));
    return {
      runCountsByStatus: { blocked: blocked.length, failed: failed.length, skipped: skipped.length, succeeded: succeeded.length, pending: pending.length, running: running.length },
      recentRuns,
      dryRunCount: recentRuns.filter((run) => run.runMode === 'dry_run_fixture').length,
      replayCount: replayRuns.length,
      blockedLiveCount: [...blocked, ...skipped].filter((run) => String(run.errorCode ?? '').includes('live')).length,
      staleEvidenceWarningCount: recentRuns.filter((run) => run.warnings.some((w) => w.includes('stale'))).length,
      duplicateDecisionSummary: { created: replayRuns.filter((run) => run.duplicateDecision === 'created').length, skipped: replayRuns.filter((run) => run.duplicateDecision === 'skipped').length, blocked: replayRuns.filter((run) => run.duplicateDecision === 'blocked').length },
      providerSourceReadinessSummary: { mode: 'fixture_only', providerCalls: 'blocked_live' },
      latestRunTimestamp: recentRuns[0]?.startedAt ?? null,
      latestReplayTimestamp: replayRuns.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0]?.startedAt ?? null,
      operatorNotes: replayRuns.map((run) => run.operatorNote).filter((note): note is string => Boolean(note)).slice(0, 10),
      liveActivationStatus: 'blocked'
    };
  }

  async getMarketEvidenceOperatorInspectionSnapshot(options?: { section?: import('@elceo/types').InternalMarketEvidenceInspectionSection; asset?: TradingAssetCoverage | null }) {
    const section = options?.section ?? 'full';
    const asset = options?.asset ?? null;
    const provider = this.getProviderSourceRegistrySnapshot();
    const fixture = this.getLaunchAssetFixtureCoverageReport();
    const macro = this.getOfficialMacroCoverageReport();
    const news = this.getNewsExtractionCoverageReport();
    const crypto = this.getCryptoRiskLiquidityCoverageReport();
    const golden = this.getGoldenScenarioCoverageReport();
    const cognition = this.getCognitionCalibrationCoverageReport();
    const scheduled = await this.getScheduledIngestionOperatorInspectionSnapshot();
    const sourcesByFamily = provider.sources.reduce((acc, source) => ({ ...acc, [source.family]: (acc[source.family] ?? 0) + 1 }), {} as Record<string, number>);
    const summary = {
      providerRegistry: { totalSources: provider.sources.length, sourcesByFamily, fixtureReadyDryRunReadyLiveBlocked: { fixtureReady: provider.sources.filter((x) => x.fixtureReadiness === 'ready').length, dryRunReady: provider.sources.filter((x) => x.activationStage === 'dry_run_ready').length, liveBlocked: provider.sources.filter((x) => x.liveActivationMode === 'blocked_by_default').length }, sourceGaps: provider.gaps.length, liveActivationStatus: 'blocked' },
      launchAssetFixtures: { tier1AAssetCount: 10, tier1BAssetCount: 4, scenarioCount: fixture.totalScenarioCount, hasDxy: fixture.dxyComplete, hasVix: fixture.vixComplete, freshnessScenarioCount: fixture.staleScenarioCount },
      officialMacro: { sourceCount: macro.sources.length, regionsCovered: [...new Set(macro.sources.map((x) => x.region))].sort(), fixturePayloadCount: macro.fixtures.reduce((a, b) => a + b.fixtureCount, 0), normalizedEvidenceSampleCount: this.listOfficialMacroFixturePayloads().slice(0, 10).length, liveActivationStatus: 'blocked' },
      newsExtractionFilings: { sourceCount: news.sources.length, fixturePayloadCount: this.listNewsExtractionFixturePayloads().length, filingFixtureCount: this.listFilingFixturePayloads(asset ?? undefined).length, etfFlowFixtureCount: this.listEtfFlowFixturePayloads(asset ?? undefined).length, narrativeClusterCount: this.listNarrativeClusterFixturePayloads(asset ?? undefined).length, liveActivationStatus: 'blocked' },
      cryptoRiskLiquidity: { sourceCount: crypto.sources.length, fixturePayloadCount: this.listCryptoRiskLiquidityFixturePayloads().length, coverageByFamily: crypto.sources.reduce((acc, x) => ({ ...acc, [x.family]: (acc[x.family] ?? 0) + 1 }), {} as Record<string, number>), affectedAssetCoverageCount: crypto.assetsCovered.length, liveActivationStatus: 'blocked' },
      goldenScenarios: { scenarioCount: golden.totalScenarios, tier1ARepresented: golden.tier1AAssetsCovered.length, tier1BRepresented: golden.tier1BAssetsCovered.length, crossAssetScenarios: golden.crossAssetScenarioIds.length, staleScenarioPresence: golden.freshnessScenarioIds.length > 0, assertionPassCount: null },
      cognitionCalibration: { scenarioCount: cognition.scenarioCount, guardrailStatus: cognition.statusBreakdown.fail === 0 ? 'pass' : 'review', contradictionCoverage: true, confidenceDecompositionCoverage: true, liveActivationStatus: 'blocked' },
      scheduledIngestion: scheduled,
      operatorNotes: ['no live providers', 'no API keys', 'fixture/dry-run only', 'remaining activation steps deferred']
    };
    if (section === 'full') return { section, asset, summary };
    return { section, asset, summary: { [section]: (summary as Record<string, unknown>)[section === 'provider_registry' ? 'providerRegistry' : section === 'launch_asset_fixtures' ? 'launchAssetFixtures' : section === 'official_macro' ? 'officialMacro' : section === 'news_extraction_filings' ? 'newsExtractionFilings' : section === 'crypto_risk_liquidity' ? 'cryptoRiskLiquidity' : section === 'golden_scenarios' ? 'goldenScenarios' : section === 'cognition_calibration' ? 'cognitionCalibration' : 'scheduledIngestion'] } };
  }
  getFrontendSupportedAssets() { return getFrontendSupportedAssets(); }
  getFrontendMarketOverviewPayload() { return getFrontendMarketOverviewPayload(); }
  getFrontendAssetDashboardPayload(asset: LaunchAsset) { return getFrontendAssetDashboardPayload(asset); }
  getFrontendMarketCognitionSnapshot(asset: LaunchAsset) { return getFrontendMarketCognitionSnapshot(asset); }
  getFrontendEvidenceFeedPayload(asset?: LaunchAsset) { return getFrontendEvidenceFeedPayload(asset); }
  getFrontendMacroContextPayload(asset?: LaunchAsset) { return getFrontendMacroContextPayload(asset); }
  getFrontendNewsNarrativePayload(asset?: LaunchAsset) { return getFrontendNewsNarrativePayload(asset); }
  getFrontendRiskLiquidityPayload(asset?: LaunchAsset) { return getFrontendRiskLiquidityPayload(asset); }
  getFrontendConfidenceDecompositionPayload(asset: LaunchAsset) { return getFrontendConfidenceDecompositionPayload(asset); }
  getFrontendContradictionPanelPayload(asset: LaunchAsset) { return getFrontendContradictionPanelPayload(asset); }
  getFrontendProviderReadinessPayload() { return getFrontendProviderReadinessPayload(); }
  getFrontendScheduledIngestionStatusPayload() { return getFrontendScheduledIngestionStatusPayload(); }
  getFrontendGoldenScenarioPreviewPayload(asset?: LaunchAsset) { return getFrontendGoldenScenarioPreviewPayload(asset); }
  getFrontendJournalPortfolioContextPlaceholder(asset?: LaunchAsset) { return getFrontendJournalPortfolioContextPlaceholder(asset); }
  getFrontendMockPayloadRegistry() { return getFrontendMockPayloadRegistry(); }
  getFrontendContractCoverageReport() { return getFrontendContractCoverageReport(); }
  getMarketAssetCausalityMatrixSnapshot(asOfIso?: string) { return buildMarketAssetCausalityMatrixSnapshot(asOfIso); }
  getMarketAssetCausalityDescriptor(asset: Parameters<typeof getAssetCausalityDescriptor>[0]) { return getAssetCausalityDescriptor(asset); }
  listMarketAssetCausalityGaps() { return listMarketAssetCausalityGaps(); }
  getMarketAssetCausalityCoverageReport() { return getAssetCausalityCoverageReport(); }
  assertMarketAssetCausalityMatrixComplete() { return assertAssetCausalityMatrixComplete(); }
  assertMarketAssetCausalityMatrixValid() { return assertAssetCausalityMatrixValid(); }
  resolveAssetContextualEvidenceDirection(input: Parameters<typeof resolveAssetContextualEvidenceDirection>[0]) { return resolveAssetContextualEvidenceDirection(input); }
  getAssetDirectionResolutionRuleSetSnapshot(asOfIso?: string) { return getAssetDirectionResolutionRuleSetSnapshot(asOfIso); }
  getAssetDirectionResolutionCoverageReport(asOfIso?: string) { return getAssetDirectionResolutionCoverageReport(asOfIso); }
  listAssetDirectionResolutionWarnings(asset?: Parameters<typeof listAssetDirectionResolutionWarnings>[0]) { return listAssetDirectionResolutionWarnings(asset); }
  assertAssetDirectionResolutionRuleSetValid() { return assertAssetDirectionResolutionRuleSetValid(); }
  resolveFxRelativeStrength(input: Parameters<typeof resolveFxRelativeStrength>[0]) { return resolveFxRelativeStrength(input); }
  resolveFxRelativeStrengthFromEvidenceItems(pairAsset: Parameters<typeof resolveFxRelativeStrengthFromEvidenceItems>[0], evidenceItems: Parameters<typeof resolveFxRelativeStrengthFromEvidenceItems>[1], options?: Parameters<typeof resolveFxRelativeStrengthFromEvidenceItems>[2]) { return resolveFxRelativeStrengthFromEvidenceItems(pairAsset, evidenceItems, options); }
  resolveFxRelativeStrengthFromWeightedSnapshot(weightedSnapshot: Parameters<typeof resolveFxRelativeStrengthFromWeightedSnapshot>[0], options?: Parameters<typeof resolveFxRelativeStrengthFromWeightedSnapshot>[1]) { return resolveFxRelativeStrengthFromWeightedSnapshot(weightedSnapshot, options); }
  getFxRelativeStrengthRuleSetSnapshot(asOfIso?: string) { return getFxRelativeStrengthRuleSetSnapshot(asOfIso); }
  getFxRelativeStrengthCoverageReport(asOfIso?: string) { return getFxRelativeStrengthCoverageReport(asOfIso); }
  assertFxRelativeStrengthRuleSetValid() { return assertFxRelativeStrengthRuleSetValid(); }

  evaluateMarketContradictionMatrix(input: Parameters<typeof evaluateMarketContradictionMatrix>[0]) { return evaluateMarketContradictionMatrix(input); }
  evaluateContradictionsFromWeightedSnapshot(weightedSnapshot: Parameters<typeof evaluateContradictionsFromWeightedSnapshot>[0], options?: Parameters<typeof evaluateContradictionsFromWeightedSnapshot>[1]) { return evaluateContradictionsFromWeightedSnapshot(weightedSnapshot, options); }
  evaluateContradictionsFromEvidenceItems(asset: Parameters<typeof evaluateContradictionsFromEvidenceItems>[0], evidenceItems: Parameters<typeof evaluateContradictionsFromEvidenceItems>[1], options?: Parameters<typeof evaluateContradictionsFromEvidenceItems>[2]) { return evaluateContradictionsFromEvidenceItems(asset, evidenceItems, options); }
  getMarketContradictionRuleSetSnapshot(asOfIso?: string) { return getMarketContradictionRuleSetSnapshot(asOfIso); }
  getMarketContradictionCoverageReport(asOfIso?: string) { return getMarketContradictionCoverageReport(asOfIso); }
  assertMarketContradictionRuleSetValid() { return assertMarketContradictionRuleSetValid(); }
  listMarketContradictionWarnings(asset?: Parameters<typeof listMarketContradictionWarnings>[0]) { return listMarketContradictionWarnings(asset); }
  listMarketContradictionRules(asset?: Parameters<typeof listMarketContradictionRules>[0]) { return listMarketContradictionRules(asset); }
  calibrateMarketConfidence(input: Parameters<typeof calibrateMarketConfidence>[0]) { return calibrateMarketConfidence(input); }
  calibrateConfidenceFromWeightedSnapshot(weightedSnapshot: Parameters<typeof calibrateConfidenceFromWeightedSnapshot>[0], options?: Parameters<typeof calibrateConfidenceFromWeightedSnapshot>[1]) { return calibrateConfidenceFromWeightedSnapshot(weightedSnapshot, options); }
  calibrateConfidenceFromMarketCognition(snapshot: Parameters<typeof calibrateConfidenceFromMarketCognition>[0], options?: Parameters<typeof calibrateConfidenceFromMarketCognition>[1]) { return calibrateConfidenceFromMarketCognition(snapshot, options); }
  buildConfidenceCalibrationInputFromWeightedSnapshot(weightedSnapshot: Parameters<typeof buildConfidenceCalibrationInputFromWeightedSnapshot>[0], options?: Parameters<typeof buildConfidenceCalibrationInputFromWeightedSnapshot>[1]) { return buildConfidenceCalibrationInputFromWeightedSnapshot(weightedSnapshot, options); }
  getMarketConfidenceCalibrationRuleSetSnapshot(asOfIso?: string) { return getMarketConfidenceCalibrationRuleSetSnapshot(asOfIso); }
  getMarketConfidenceCalibrationCoverageReport(asOfIso?: string) { return getMarketConfidenceCalibrationCoverageReport(asOfIso); }
  assertMarketConfidenceCalibrationRuleSetValid() { return assertMarketConfidenceCalibrationRuleSetValid(); }
  listMarketConfidenceCalibrationWarnings(asset?: Parameters<typeof listMarketConfidenceCalibrationWarnings>[0]) { return listMarketConfidenceCalibrationWarnings(asset); }
  listMarketConfidenceCalibrationRules(asset?: Parameters<typeof listMarketConfidenceCalibrationRules>[0]) { return listMarketConfidenceCalibrationRules(asset); }

  evaluatePriceReaction(input: Parameters<typeof evaluatePriceReaction>[0]) { return evaluatePriceReaction(input); }
  evaluatePriceReactionFromEvidenceItem(evidenceItem: Parameters<typeof evaluatePriceReactionFromEvidenceItem>[0], candles: Parameters<typeof evaluatePriceReactionFromEvidenceItem>[1], options?: Parameters<typeof evaluatePriceReactionFromEvidenceItem>[2]) { return evaluatePriceReactionFromEvidenceItem(evidenceItem, candles, options); }
  evaluatePriceReactionFromWeightedSnapshot(weightedSnapshot: Parameters<typeof evaluatePriceReactionFromWeightedSnapshot>[0], candles: Parameters<typeof evaluatePriceReactionFromWeightedSnapshot>[1], options?: Parameters<typeof evaluatePriceReactionFromWeightedSnapshot>[2]) { return evaluatePriceReactionFromWeightedSnapshot(weightedSnapshot, candles, options); }
  getMarketPriceReactionRuleSetSnapshot(asOfIso?: string) { return getMarketPriceReactionRuleSetSnapshot(asOfIso); }
  getMarketPriceReactionCoverageReport(asOfIso?: string) { return getMarketPriceReactionCoverageReport(asOfIso); }
  assertMarketPriceReactionRuleSetValid() { return assertMarketPriceReactionRuleSetValid(); }
  listMarketPriceReactionWarnings(asset?: Parameters<typeof listMarketPriceReactionWarnings>[0]) { return listMarketPriceReactionWarnings(asset); }
  listMarketPriceReactionRules(asset?: Parameters<typeof listMarketPriceReactionRules>[0]) { return listMarketPriceReactionRules(asset); }

  normalizeMacroSurprise(input: Parameters<typeof normalizeMacroSurprise>[0]) { return normalizeMacroSurprise(input); }
  normalizeMacroSurpriseFromEvidenceItem(evidenceItem: Parameters<typeof normalizeMacroSurpriseFromEvidenceItem>[0]) { return normalizeMacroSurpriseFromEvidenceItem(evidenceItem); }
  normalizeMacroSurprisesFromEvidenceItems(evidenceItems: Parameters<typeof normalizeMacroSurprisesFromEvidenceItems>[0]) { return normalizeMacroSurprisesFromEvidenceItems(evidenceItems); }
  getMacroSurpriseRuleSetSnapshot(asOfIso?: string) { return getMacroSurpriseRuleSetSnapshot(asOfIso); }
  getMacroSurpriseCoverageReport(asOfIso?: string) { return getMacroSurpriseCoverageReport(asOfIso); }
  assertMacroSurpriseRuleSetValid() { return assertMacroSurpriseRuleSetValid(); }
  listMacroSurpriseWarnings(indicatorKind?: Parameters<typeof listMacroSurpriseWarnings>[0]) { return listMacroSurpriseWarnings(indicatorKind); }
  listFxRelativeStrengthWarnings(pairAsset?: Parameters<typeof listFxRelativeStrengthWarnings>[0]) { return listFxRelativeStrengthWarnings(pairAsset); }
  listDirectionResolutionRequirements(asset?: Parameters<typeof listAssetDirectionRequirements>[0]) { return listAssetDirectionRequirements(asset); }
  listProviderDependenciesForAsset(asset: Parameters<typeof listAssetProviderDependencies>[0]) { return listAssetProviderDependencies(asset); }
  listContradictionTriggersForAsset(asset: Parameters<typeof listAssetContradictionTriggers>[0]) { return listAssetContradictionTriggers(asset); }
  listRegimeModifiersForAsset(asset: Parameters<typeof listAssetRegimeModifiers>[0]) { return listAssetRegimeModifiers(asset); }

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
