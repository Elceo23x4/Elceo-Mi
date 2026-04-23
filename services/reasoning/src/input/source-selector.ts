import type { CanonicalAssetSymbol, CanonicalEvent, Timeframe } from '@elceo/types';
import type { IngestionEventSnapshotRepository, IngestionRunRepository, PersistedIngestionRun } from '../../../ingestion/src/persistence/contracts.js';

export type ReasoningSourceSelectionErrorCode =
  | 'missing_ingestion_run'
  | 'unusable_ingestion_run'
  | 'missing_event_snapshots'
  | 'corrupt_event_snapshot'
  | 'asset_timeframe_mismatch';

export class ReasoningSourceSelectionError extends Error {
  constructor(public readonly code: ReasoningSourceSelectionErrorCode, message: string) {
    super(message);
    this.name = 'ReasoningSourceSelectionError';
  }
}

export type ReasoningInputSourceSelection = {
  run: PersistedIngestionRun;
  events: CanonicalEvent[];
};

export type SelectReasoningInputSourceParams = {
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  asOf: string;
  sourceIngestionRunId?: string | null;
};

function isUsableRun(run: PersistedIngestionRun): boolean {
  return (run.status === 'success' || run.status === 'partial_success') && (run.activeBoundary === 'canonical' || run.activeBoundary === 'legacy');
}

function compareRunRecency(left: PersistedIngestionRun, right: PersistedIngestionRun): number {
  const ended = Date.parse(right.endedAt) - Date.parse(left.endedAt);
  if (ended !== 0) return ended;
  const created = Date.parse(right.createdAt) - Date.parse(left.createdAt);
  if (created !== 0) return created;
  return left.runId.localeCompare(right.runId);
}

export class ReasoningInputSourceSelector {
  constructor(
    private readonly runRepository: IngestionRunRepository,
    private readonly eventSnapshotRepository: IngestionEventSnapshotRepository
  ) {}

  async selectReasoningInputSource(params: SelectReasoningInputSourceParams): Promise<ReasoningInputSourceSelection> {
    const selectedRun = await this.selectRun(params);

    let events: CanonicalEvent[] = [];
    try {
      events = await this.eventSnapshotRepository.getEventsByRunId(selectedRun.runId);
    } catch (error) {
      throw new ReasoningSourceSelectionError(
        'corrupt_event_snapshot',
        `corrupt persisted event snapshots for run ${selectedRun.runId}: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }

    if (selectedRun.outputEventCount > 0 && events.length === 0) {
      throw new ReasoningSourceSelectionError(
        'missing_event_snapshots',
        `run ${selectedRun.runId} persisted outputEventCount=${selectedRun.outputEventCount} but no event snapshots were found`
      );
    }

    return { run: selectedRun, events };
  }

  private async selectRun(params: SelectReasoningInputSourceParams): Promise<PersistedIngestionRun> {
    if (params.sourceIngestionRunId) {
      const run = await this.runRepository.getRunById(params.sourceIngestionRunId);
      if (!run) {
        throw new ReasoningSourceSelectionError('missing_ingestion_run', `ingestion run not found: ${params.sourceIngestionRunId}`);
      }
      if (run.asset !== params.asset || run.timeframe !== params.timeframe) {
        throw new ReasoningSourceSelectionError(
          'asset_timeframe_mismatch',
          `ingestion run ${run.runId} belongs to ${run.asset}/${run.timeframe} not ${params.asset}/${params.timeframe}`
        );
      }
      if (!isUsableRun(run)) {
        throw new ReasoningSourceSelectionError('unusable_ingestion_run', `ingestion run ${run.runId} is not usable for reasoning intake`);
      }
      return run;
    }

    const candidates = await this.runRepository.listRecentRuns({ limit: 500, asset: params.asset, timeframe: params.timeframe });
    const usable = candidates.filter(isUsableRun).sort(compareRunRecency);
    if (usable.length === 0) {
      throw new ReasoningSourceSelectionError('missing_ingestion_run', `no usable ingestion run for ${params.asset}/${params.timeframe}`);
    }
    return usable[0] as PersistedIngestionRun;
  }
}
