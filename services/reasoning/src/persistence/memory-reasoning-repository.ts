import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import type { CognitionSnapshotRepository, PersistedCognitionSnapshot, PersistedReasoningRun, ReasoningPersistenceRepository, ReasoningRunRepository } from './contracts';

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

export class MemoryReasoningPersistenceRepository implements ReasoningPersistenceRepository {
  readonly runRepository: ReasoningRunRepository;
  readonly snapshotRepository: CognitionSnapshotRepository;

  constructor(
    runRepository: ReasoningRunRepository = new MemoryReasoningRunRepository(),
    snapshotRepository: CognitionSnapshotRepository = new MemoryCognitionSnapshotRepository()
  ) {
    this.runRepository = runRepository;
    this.snapshotRepository = snapshotRepository;
  }
}
