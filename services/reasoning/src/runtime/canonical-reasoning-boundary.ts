import { validateCanonicalCognitionState } from '@elceo/schemas';
import type { CanonicalAssetSymbol, CanonicalCognitionState, ReasoningEngineContract, Timeframe } from '@elceo/types';
import type { PersistedCognitionSnapshot, PersistedReasoningRun, ReasoningPersistenceRepository } from '../persistence/contracts';
import { serializeCanonicalCognitionState } from '../persistence/serialization';
import type { ReasoningInputAssemblyResult, ReasoningInputAssembler } from '../input/reasoning-input-assembler';
import type { ReasoningRunReport } from './reasoning-run-report';

export type CanonicalReasoningBoundaryExecuteParams = {
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  asOf: string;
  sourceIngestionRunId?: string | null;
  userId?: string | null;
};

export type ReasoningEngineMetadata = {
  engineName: string;
  reasoningVersion: string;
  scoringVersion: string;
};

function createReasoningRunId(): string {
  return `reasoning-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createSnapshotId(): string {
  return `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export class CanonicalReasoningBoundaryService {
  constructor(
    private readonly assembler: ReasoningInputAssembler,
    private readonly engine: ReasoningEngineContract,
    private readonly metadata: ReasoningEngineMetadata,
    private readonly persistence: ReasoningPersistenceRepository
  ) {}

  async executeAssetWindow(params: CanonicalReasoningBoundaryExecuteParams): Promise<{ cognition: CanonicalCognitionState | null; report: ReasoningRunReport; assembly: ReasoningInputAssemblyResult | null }> {
    const startedAt = new Date().toISOString();
    const reasoningRunId = createReasoningRunId();

    let assembly: ReasoningInputAssemblyResult | null = null;
    let cognition: CanonicalCognitionState | null = null;
    let snapshotId: string | null = null;
    let status: ReasoningRunReport['status'] = 'failed';
    let failureReason: string | null = null;
    let warnings: string[] = [];

    try {
      assembly = await this.assembler.assembleReasoningInput(params);
      warnings = [...assembly.warnings];
    } catch (error) {
      failureReason = `assembly_failure:${error instanceof Error ? error.message : 'unknown'}`;
      return this.persistAndReturn({
        reasoningRunId,
        params,
        startedAt,
        endedAt: new Date().toISOString(),
        status,
        failureReason,
        warnings,
        assembly,
        cognition,
        snapshotId
      });
    }

    try {
      const evaluated = await this.engine.evaluate(assembly.input);
      const validated = validateCanonicalCognitionState(evaluated);
      if (validated.ok === false) {
        throw new Error(`invalid_cognition:${validated.errors.join('; ')}`);
      }
      cognition = validated.value;
      status = 'success';
    } catch (error) {
      failureReason = `engine_failure:${error instanceof Error ? error.message : 'unknown'}`;
      status = 'failed';
      cognition = null;
      return this.persistAndReturn({
        reasoningRunId,
        params,
        startedAt,
        endedAt: new Date().toISOString(),
        status,
        failureReason,
        warnings,
        assembly,
        cognition,
        snapshotId
      });
    }

    if (cognition && assembly) {
      try {
        snapshotId = createSnapshotId();
        const snapshotRecord: PersistedCognitionSnapshot = {
          snapshotId,
          reasoningRunId,
          asset: params.asset,
          timeframe: params.timeframe,
          evaluatedAt: cognition.evaluatedAt,
          bias: cognition.bias,
          confidenceScore: cognition.confidence.score,
          contradictionScore: cognition.contradiction.score,
          freshnessScore: cognition.freshness.freshnessScore,
          sourceIngestionRunId: assembly.sourceRunId,
          sourceIngestionRequestKey: assembly.sourceRequestKey,
          reasoningVersion: this.metadata.reasoningVersion,
          scoringVersion: this.metadata.scoringVersion,
          cognitionJson: serializeCanonicalCognitionState(cognition),
          createdAt: new Date().toISOString()
        };
        await this.persistence.snapshotRepository.saveCognitionSnapshot(snapshotRecord);
      } catch (error) {
        status = 'partial_success';
        failureReason = `snapshot_persistence_failure:${error instanceof Error ? error.message : 'unknown'}`;
        snapshotId = null;
      }
    }

    return this.persistAndReturn({
      reasoningRunId,
      params,
      startedAt,
      endedAt: new Date().toISOString(),
      status,
      failureReason,
      warnings,
      assembly,
      cognition,
      snapshotId
    });
  }

  private async persistAndReturn(input: {
    reasoningRunId: string;
    params: CanonicalReasoningBoundaryExecuteParams;
    startedAt: string;
    endedAt: string;
    status: ReasoningRunReport['status'];
    failureReason: string | null;
    warnings: string[];
    assembly: ReasoningInputAssemblyResult | null;
    cognition: CanonicalCognitionState | null;
    snapshotId: string | null;
  }): Promise<{ cognition: CanonicalCognitionState | null; report: ReasoningRunReport; assembly: ReasoningInputAssemblyResult | null }> {
    const durationMs = Math.max(0, Date.parse(input.endedAt) - Date.parse(input.startedAt));

    const runRecord: PersistedReasoningRun = {
      reasoningRunId: input.reasoningRunId,
      asset: input.params.asset,
      timeframe: input.params.timeframe,
      sourceIngestionRunId: input.assembly?.sourceRunId ?? input.params.sourceIngestionRunId ?? null,
      sourceIngestionRequestKey: input.assembly?.sourceRequestKey ?? null,
      engineName: this.metadata.engineName,
      reasoningVersion: this.metadata.reasoningVersion,
      scoringVersion: this.metadata.scoringVersion,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      durationMs,
      status: input.status,
      inputEventCount: input.assembly?.selectedEventCount ?? 0,
      inputZoneCount: input.assembly?.zoneCount ?? 0,
      projectedEvidenceCount: input.assembly?.projectedEvidenceCount ?? 0,
      priorSnapshotId: input.assembly?.priorSnapshotId ?? null,
      snapshotId: input.snapshotId,
      failureReason: input.failureReason,
      warningsJson: JSON.stringify(input.warnings),
      createdAt: input.endedAt
    };

    await this.persistence.runRepository.saveReasoningRun(runRecord);

    const report: ReasoningRunReport = {
      reasoningRunId: input.reasoningRunId,
      asset: input.params.asset,
      timeframe: input.params.timeframe,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      durationMs,
      status: input.status,
      sourceIngestionRunId: runRecord.sourceIngestionRunId,
      sourceIngestionRequestKey: runRecord.sourceIngestionRequestKey,
      inputEventCount: runRecord.inputEventCount,
      inputZoneCount: runRecord.inputZoneCount,
      projectedEvidenceCount: runRecord.projectedEvidenceCount,
      priorSnapshotId: runRecord.priorSnapshotId,
      snapshotId: input.snapshotId,
      warnings: input.warnings,
      failureReason: input.failureReason,
      engineName: this.metadata.engineName,
      reasoningVersion: this.metadata.reasoningVersion,
      scoringVersion: this.metadata.scoringVersion
    };

    return {
      cognition: input.cognition,
      report,
      assembly: input.assembly
    };
  }
}

export function createCanonicalReasoningBoundaryService(params: {
  assembler: ReasoningInputAssembler;
  engine: ReasoningEngineContract;
  metadata: ReasoningEngineMetadata;
  persistence: ReasoningPersistenceRepository;
}): CanonicalReasoningBoundaryService {
  return new CanonicalReasoningBoundaryService(params.assembler, params.engine, params.metadata, params.persistence);
}
