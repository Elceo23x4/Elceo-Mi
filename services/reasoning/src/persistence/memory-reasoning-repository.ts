import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import type {
  CognitionDriftRepository,
  CognitionSnapshotRepository,
  PersistedCognitionDriftRecord,
  PersistedCognitionSnapshot,
  PersistedReasoningRun,
  ReasoningPersistenceRepository,
  ReasoningRunRepository
} from './contracts';
import { MemoryHistoricalAnalogRepository } from '../historical-analog-memory/repository';
import { MemoryEventExpectationRepository, MemoryEventRealityRepository, MemoryExpectationRealityRepository, MemoryExpectationRepository } from '../expectation-reality/repository';
import { MemoryContradictionActionProtocolRepository } from '../contradiction-action-protocol/repository';
import { MemoryPersistedContradictionInputRepository } from '../contradiction-action-protocol/input-repository';
import { MemoryMarketSessionLiquidityContextRepository } from '../market-cleanliness/context-repository';
import { MemoryMarketCleanlinessRepository } from '../market-cleanliness/repository';
import { MemoryNarrativeContinuationObservationRepository } from '../narrative-decay/observation-repository';
import { MemoryNarrativeDecayRepository } from '../narrative-decay/repository';
import { MemoryPositioningEvidenceRepository } from '../positioning-stress/positioning-evidence-repository';
import { MemoryPositioningStressRepository } from '../positioning-stress/repository';
import { MemoryFragilityScoreRepository } from '../fragility-score/repository';

export class MemoryReasoningRunRepository implements ReasoningRunRepository {
  private readonly rows = new Map<string, PersistedReasoningRun>();

  async saveReasoningRun(record: PersistedReasoningRun): Promise<void> {
    this.rows.set(record.reasoningRunId, record);
  }

  async getReasoningRunById(reasoningRunId: string): Promise<PersistedReasoningRun | null> {
    return this.rows.get(reasoningRunId) ?? null;
  }

  async getLatestReasoningRunForAssetTimeframe(asset: CanonicalAssetSymbol, timeframe: Timeframe): Promise<PersistedReasoningRun | null> {
    return (await this.listRecentReasoningRuns({ limit: 1, asset, timeframe }))[0] ?? null;
  }

  async listRecentReasoningRuns(params: { limit: number; asset?: CanonicalAssetSymbol; timeframe?: Timeframe; status?: PersistedReasoningRun['status'] }): Promise<PersistedReasoningRun[]> {
    let values = [...this.rows.values()];
    if (params.asset) values = values.filter((row) => row.asset === params.asset);
    if (params.timeframe) values = values.filter((row) => row.timeframe === params.timeframe);
    if (params.status) values = values.filter((row) => row.status === params.status);
    values.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.reasoningRunId.localeCompare(right.reasoningRunId));
    return values.slice(0, params.limit);
  }
}

export class MemoryCognitionSnapshotRepository implements CognitionSnapshotRepository {
  private readonly byId = new Map<string, PersistedCognitionSnapshot>();
  private readonly byRunId = new Map<string, PersistedCognitionSnapshot>();

  async saveCognitionSnapshot(record: PersistedCognitionSnapshot): Promise<void> {
    this.byId.set(record.snapshotId, record);
    this.byRunId.set(record.reasoningRunId, record);
  }

  async getSnapshotById(snapshotId: string): Promise<PersistedCognitionSnapshot | null> {
    return this.byId.get(snapshotId) ?? null;
  }

  async getSnapshotByReasoningRunId(reasoningRunId: string): Promise<PersistedCognitionSnapshot | null> {
    return this.byRunId.get(reasoningRunId) ?? null;
  }

  async getLatestSnapshotForAssetTimeframe(asset: CanonicalAssetSymbol, timeframe: Timeframe, beforeIso?: string): Promise<PersistedCognitionSnapshot | null> {
    const filtered = [...this.byId.values()].filter((row) => row.asset === asset && row.timeframe === timeframe && (!beforeIso || Date.parse(row.evaluatedAt) < Date.parse(beforeIso)));
    filtered.sort((left, right) => Date.parse(right.evaluatedAt) - Date.parse(left.evaluatedAt) || left.snapshotId.localeCompare(right.snapshotId));
    return filtered[0] ?? null;
  }
}

export class MemoryCognitionDriftRepository implements CognitionDriftRepository {
  private readonly byId = new Map<string, PersistedCognitionDriftRecord>();

  async saveDriftRecord(record: PersistedCognitionDriftRecord): Promise<void> {
    this.byId.set(record.driftId, record);
  }

  async getDriftById(driftId: string): Promise<PersistedCognitionDriftRecord | null> {
    return this.byId.get(driftId) ?? null;
  }

  async getLatestDriftForAssetTimeframe(asset: CanonicalAssetSymbol, timeframe: Timeframe): Promise<PersistedCognitionDriftRecord | null> {
    return (await this.listRecentDrifts({ limit: 1, asset, timeframe }))[0] ?? null;
  }

  async listRecentDrifts(params: {
    limit: number;
    asset?: CanonicalAssetSymbol;
    timeframe?: Timeframe;
    severity?: PersistedCognitionDriftRecord['severity'];
  }): Promise<PersistedCognitionDriftRecord[]> {
    let values = [...this.byId.values()];
    if (params.asset) values = values.filter((row) => row.asset === params.asset);
    if (params.timeframe) values = values.filter((row) => row.timeframe === params.timeframe);
    if (params.severity) values = values.filter((row) => row.severity === params.severity);
    values.sort((left, right) => Date.parse(right.comparedAt) - Date.parse(left.comparedAt) || left.driftId.localeCompare(right.driftId));
    return values.slice(0, params.limit);
  }
}

export class MemoryReasoningPersistenceRepository implements ReasoningPersistenceRepository {
  readonly runRepository: ReasoningRunRepository;
  readonly snapshotRepository: CognitionSnapshotRepository;
  readonly driftRepository: CognitionDriftRepository;
  readonly expectationRepository: MemoryExpectationRepository;
  readonly expectationRealityRepository: MemoryExpectationRealityRepository;
  readonly eventExpectationRepository: MemoryEventExpectationRepository;
  readonly eventRealityRepository: MemoryEventRealityRepository;
  readonly historicalAnalogRepository: MemoryHistoricalAnalogRepository;
  readonly contradictionActionProtocolRepository: MemoryContradictionActionProtocolRepository;
  readonly persistedContradictionInputRepository: MemoryPersistedContradictionInputRepository;
  readonly marketSessionLiquidityContextRepository: MemoryMarketSessionLiquidityContextRepository;
  readonly marketCleanlinessRepository: MemoryMarketCleanlinessRepository;
  readonly narrativeContinuationObservationRepository: MemoryNarrativeContinuationObservationRepository;
  readonly narrativeDecayRepository: MemoryNarrativeDecayRepository;
  readonly positioningEvidenceRepository: MemoryPositioningEvidenceRepository;
  readonly positioningStressRepository: MemoryPositioningStressRepository;
  readonly fragilityScoreRepository: MemoryFragilityScoreRepository;

  constructor(
    runRepository: ReasoningRunRepository = new MemoryReasoningRunRepository(),
    snapshotRepository: CognitionSnapshotRepository = new MemoryCognitionSnapshotRepository(),
    driftRepository: CognitionDriftRepository = new MemoryCognitionDriftRepository(),
    expectationRealityRepository: MemoryExpectationRealityRepository = new MemoryExpectationRealityRepository(),
    expectationRepository: MemoryExpectationRepository = new MemoryExpectationRepository(expectationRealityRepository),
    eventExpectationRepository: MemoryEventExpectationRepository = new MemoryEventExpectationRepository(),
    eventRealityRepository: MemoryEventRealityRepository = new MemoryEventRealityRepository(),
    historicalAnalogRepository: MemoryHistoricalAnalogRepository = new MemoryHistoricalAnalogRepository(),
    contradictionActionProtocolRepository: MemoryContradictionActionProtocolRepository = new MemoryContradictionActionProtocolRepository(),
    persistedContradictionInputRepository: MemoryPersistedContradictionInputRepository = new MemoryPersistedContradictionInputRepository(),
    marketSessionLiquidityContextRepository = new MemoryMarketSessionLiquidityContextRepository(),
    marketCleanlinessRepository = new MemoryMarketCleanlinessRepository(),
    narrativeContinuationObservationRepository = new MemoryNarrativeContinuationObservationRepository(),
    narrativeDecayRepository = new MemoryNarrativeDecayRepository(),
    positioningEvidenceRepository = new MemoryPositioningEvidenceRepository(),
    positioningStressRepository = new MemoryPositioningStressRepository(),
    fragilityScoreRepository = new MemoryFragilityScoreRepository()
  ) {
    this.runRepository = runRepository;
    this.snapshotRepository = snapshotRepository;
    this.driftRepository = driftRepository;
    this.expectationRepository = expectationRepository;
    this.expectationRealityRepository = expectationRealityRepository;
    this.eventExpectationRepository = eventExpectationRepository;
    this.eventRealityRepository = eventRealityRepository;
    this.historicalAnalogRepository = historicalAnalogRepository;
    this.contradictionActionProtocolRepository = contradictionActionProtocolRepository;
    this.persistedContradictionInputRepository = persistedContradictionInputRepository;
    this.marketSessionLiquidityContextRepository = marketSessionLiquidityContextRepository;
    this.marketCleanlinessRepository = marketCleanlinessRepository;
    this.narrativeContinuationObservationRepository = narrativeContinuationObservationRepository;
    this.narrativeDecayRepository = narrativeDecayRepository;
    this.positioningEvidenceRepository = positioningEvidenceRepository;
    this.positioningStressRepository = positioningStressRepository;
    this.fragilityScoreRepository = fragilityScoreRepository;
  }
}
