import type { CanonicalAssetSymbol, CanonicalEvent, Timeframe } from '@elceo/types';
import type { IngestionEventSnapshotRepository, IngestionPersistenceRepository, IngestionRunRecordInput, IngestionRunRepository, PersistedIngestionRun } from './contracts';
import {
  deserializeCanonicalEvent,
  serializeCanonicalEvent,
  serializeDiagnosticsSummary,
  serializeProviderCapabilities,
  serializeRunComparison
} from './serialization';
import { prepareCanonicalEventsForSnapshot } from './canonical-candle-persistence';

function toPersistedRun(record: IngestionRunRecordInput): PersistedIngestionRun {
  return {
    runId: record.runId,
    asset: record.asset,
    timeframe: record.timeframe,
    mode: record.mode,
    activeBoundary: record.activeBoundary,
    status: record.status,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    durationMs: record.durationMs,
    canonicalEventCount: record.canonicalEventCount,
    legacyEventCount: record.legacyEventCount,
    outputEventCount: record.outputEventCount,
    fallbackApplied: record.fallbackApplied,
    fallbackReason: record.fallbackReason,
    boundaryVersion: record.boundaryVersion,
    triggerKind: record.triggerKind,
    requestKey: record.requestKey,
    slotStartAt: record.slotStartAt,
    slotEndAt: record.slotEndAt,
    schedulerTickId: record.schedulerTickId,
    overlapRatio: record.comparison?.overlapRatio ?? null,
    comparisonJson: serializeRunComparison(record.comparison),
    diagnosticsSummaryJson: serializeDiagnosticsSummary(record.diagnosticsSummary),
    providerCapabilitiesJson: serializeProviderCapabilities(record.providerCapabilities),
    createdAt: record.endedAt
  };
}

export class MemoryIngestionRunRepository implements IngestionRunRepository {
  private readonly runs = new Map<string, PersistedIngestionRun>();

  async saveRunRecord(record: IngestionRunRecordInput): Promise<void> {
    this.runs.set(record.runId, toPersistedRun(record));
  }

  async getRunById(runId: string): Promise<PersistedIngestionRun | null> {
    return this.runs.get(runId) ?? null;
  }

  async getRunByRequestKey(requestKey: string): Promise<PersistedIngestionRun | null> {
    for (const row of this.runs.values()) {
      if (row.requestKey === requestKey) return row;
    }
    return null;
  }

  async getLatestRunForAssetTimeframe(asset: CanonicalAssetSymbol, timeframe: Timeframe): Promise<PersistedIngestionRun | null> {
    const rows = [...this.runs.values()].filter((item) => item.asset === asset && item.timeframe === timeframe);
    rows.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.runId.localeCompare(right.runId));
    return rows[0] ?? null;
  }

  async listRecentRuns(params: { limit: number; asset?: CanonicalAssetSymbol; timeframe?: Timeframe; triggerKind?: PersistedIngestionRun['triggerKind']; slotStartAt?: string; requestKey?: string }): Promise<PersistedIngestionRun[]> {
    let rows = [...this.runs.values()];
    if (params.asset) rows = rows.filter((item) => item.asset === params.asset);
    if (params.timeframe) rows = rows.filter((item) => item.timeframe === params.timeframe);
    if (params.triggerKind) rows = rows.filter((item) => item.triggerKind === params.triggerKind);
    if (params.slotStartAt) rows = rows.filter((item) => item.slotStartAt === params.slotStartAt);
    if (params.requestKey) rows = rows.filter((item) => item.requestKey === params.requestKey);
    rows.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.runId.localeCompare(right.runId));
    return rows.slice(0, params.limit);
  }
}

export class MemoryIngestionEventSnapshotRepository implements IngestionEventSnapshotRepository {
  private readonly snapshotsByRun = new Map<string, string[]>();
  private readonly runKeyByAssetTimeframe = new Map<string, string>();

  async saveEventSnapshots(runId: string, asset: CanonicalAssetSymbol, timeframe: Timeframe, events: CanonicalEvent[]): Promise<void> {
    const preparedEvents = prepareCanonicalEventsForSnapshot(events);
    await this.deleteSnapshotsForRun(runId);
    this.snapshotsByRun.set(runId, preparedEvents.map((item) => serializeCanonicalEvent(item)));
    this.runKeyByAssetTimeframe.set(`${asset}::${timeframe}`, runId);
  }

  async getEventsByRunId(runId: string): Promise<CanonicalEvent[]> {
    const rows = this.snapshotsByRun.get(runId) ?? [];
    return rows.map((item) => deserializeCanonicalEvent(item));
  }

  async getLatestEventsForAssetTimeframe(asset: CanonicalAssetSymbol, timeframe: Timeframe): Promise<CanonicalEvent[]> {
    const runId = this.runKeyByAssetTimeframe.get(`${asset}::${timeframe}`);
    if (!runId) return [];
    return this.getEventsByRunId(runId);
  }

  async deleteSnapshotsForRun(runId: string): Promise<void> {
    this.snapshotsByRun.delete(runId);
  }
}

export class MemoryIngestionPersistenceRepository implements IngestionPersistenceRepository {
  readonly runRepository: IngestionRunRepository;
  readonly eventSnapshotRepository: IngestionEventSnapshotRepository;

  constructor(
    runRepository: IngestionRunRepository = new MemoryIngestionRunRepository(),
    eventSnapshotRepository: IngestionEventSnapshotRepository = new MemoryIngestionEventSnapshotRepository()
  ) {
    this.runRepository = runRepository;
    this.eventSnapshotRepository = eventSnapshotRepository;
  }

  async persistRunWithEvents(record: IngestionRunRecordInput, events: CanonicalEvent[]): Promise<void> {
    prepareCanonicalEventsForSnapshot(events);
    await this.runRepository.saveRunRecord(record);
    await this.eventSnapshotRepository.saveEventSnapshots(record.runId, record.asset, record.timeframe, events);
  }

  async loadReplayBundleByRunId(runId: string): Promise<{ run: PersistedIngestionRun; events: CanonicalEvent[] } | null> {
    const run = await this.runRepository.getRunById(runId);
    if (!run) return null;
    const events = await this.eventSnapshotRepository.getEventsByRunId(runId);
    return { run, events };
  }
}
