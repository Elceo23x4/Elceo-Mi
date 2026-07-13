import { validateCanonicalCognitionState } from '@elceo/schemas';
import type { CanonicalAssetSymbol, CanonicalCognitionState, ReasoningEngineContract, Timeframe } from '@elceo/types';
import type { PersistedCognitionDriftRecord, PersistedCognitionSnapshot, PersistedReasoningRun, ReasoningPersistenceRepository } from '../persistence/contracts';
import { deserializeCanonicalCognitionState, serializeCanonicalCognitionState, serializeCognitionDriftReport } from '../persistence/serialization';
import type { ReasoningInputAssemblyResult, ReasoningInputAssembler } from '../input/reasoning-input-assembler';
import type { ReasoningRunReport } from './reasoning-run-report';
import {
  DETERMINISTIC_REASONING_ENGINE_NAME,
  DETERMINISTIC_REASONING_VERSION,
  DETERMINISTIC_SCORING_VERSION
} from '../engine/constants';
import { DeterministicReasoningEngine } from '../engine/deterministic-reasoning-engine';
import { buildCognitionDriftReport } from '../delta/cognition-drift';
import type { CognitionDriftReport } from '../delta/contracts';
import { createExpectationFromCognition } from '../expectation-reality/service';

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

  async executeAssetWindow(params: CanonicalReasoningBoundaryExecuteParams): Promise<{ cognition: CanonicalCognitionState | null; report: ReasoningRunReport; assembly: ReasoningInputAssemblyResult | null; drift: CognitionDriftReport | null; expectationId?: string | null }> {
    const startedAt = new Date().toISOString();
    const reasoningRunId = createReasoningRunId();

    let assembly: ReasoningInputAssemblyResult | null = null;
    let cognition: CanonicalCognitionState | null = null;
    let snapshotId: string | null = null;
    let snapshotRecord: PersistedCognitionSnapshot | null = null;
    let status: ReasoningRunReport['status'] = 'failed';
    let failureReason: string | null = null;
    let warnings: string[] = [];
    let drift: CognitionDriftReport | null = null;
    let expectationId: string | null = null;

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
        snapshotId,
        drift
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
        snapshotId,
        drift
      });
    }

    if (cognition && assembly) {
      try {
        snapshotId = createSnapshotId();
        snapshotRecord = {
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
        const maybePersistence = this.persistence as typeof this.persistence & { expectationRepository?: { saveExpectation: (record: ReturnType<typeof createExpectationFromCognition>) => Promise<void> } };
        if (maybePersistence.expectationRepository) {
          try {
            const expectation = createExpectationFromCognition({ cognition, input: assembly.input, reasoningRunId, cognitionSnapshotId: snapshotId, createdAt: snapshotRecord.createdAt });
            await maybePersistence.expectationRepository.saveExpectation(expectation);
            expectationId = expectation.expectationId;
          } catch (error) {
            status = 'partial_success';
            warnings.push(`expectation_persistence_failure:${error instanceof Error ? error.message : 'unknown'}`);
          }
        }
      } catch (error) {
        status = 'partial_success';
        failureReason = `snapshot_persistence_failure:${error instanceof Error ? error.message : 'unknown'}`;
        snapshotId = null;
        snapshotRecord = null;
      }
    }

    const endedAt = new Date().toISOString();
    const durationMs = Math.max(0, Date.parse(endedAt) - Date.parse(startedAt));

    const runRecord: PersistedReasoningRun = {
      reasoningRunId,
      asset: params.asset,
      timeframe: params.timeframe,
      sourceIngestionRunId: assembly?.sourceRunId ?? params.sourceIngestionRunId ?? null,
      sourceIngestionRequestKey: assembly?.sourceRequestKey ?? null,
      engineName: this.metadata.engineName,
      reasoningVersion: this.metadata.reasoningVersion,
      scoringVersion: this.metadata.scoringVersion,
      startedAt,
      endedAt,
      durationMs,
      status,
      inputEventCount: assembly?.selectedEventCount ?? 0,
      inputZoneCount: assembly?.zoneCount ?? 0,
      projectedEvidenceCount: assembly?.projectedEvidenceCount ?? 0,
      priorSnapshotId: assembly?.priorSnapshotId ?? null,
      snapshotId,
      failureReason,
      warningsJson: JSON.stringify(warnings),
      createdAt: endedAt
    };

    await this.persistence.runRepository.saveReasoningRun(runRecord);

    if (cognition !== null && snapshotRecord !== null) {
      const priorSnapshotRecord = await this.persistence.snapshotRepository.getLatestSnapshotForAssetTimeframe(
        params.asset,
        params.timeframe,
        snapshotRecord.evaluatedAt
      );

      if (priorSnapshotRecord && priorSnapshotRecord.snapshotId !== snapshotRecord.snapshotId) {
        try {
          const previousCognition = deserializeCanonicalCognitionState(priorSnapshotRecord.cognitionJson);
          const previousRun = await this.persistence.runRepository.getReasoningRunById(priorSnapshotRecord.reasoningRunId);
          if (!previousRun) {
            throw new Error(`missing_previous_reasoning_run:${priorSnapshotRecord.reasoningRunId}`);
          }

          const report = buildCognitionDriftReport({
            previousSnapshot: priorSnapshotRecord,
            currentSnapshot: snapshotRecord,
            previousCognition,
            currentCognition: cognition,
            previousRun,
            currentRun: runRecord,
            comparedAt: endedAt
          });

          const driftRecord: PersistedCognitionDriftRecord = {
            driftId: report.driftId,
            asset: report.asset,
            timeframe: report.timeframe,
            previousSnapshotId: report.previousSnapshotId,
            currentSnapshotId: report.currentSnapshotId,
            previousReasoningRunId: report.previousReasoningRunId,
            currentReasoningRunId: report.currentReasoningRunId,
            comparedAt: report.comparedAt,
            severity: report.severity,
            summary: report.summary,
            keyChangesJson: JSON.stringify(report.keyChanges),
            confidenceDelta: report.confidenceDelta.absoluteDelta,
            contradictionDelta: report.contradictionDelta.absoluteDelta,
            freshnessDelta: report.freshnessDelta.absoluteDelta,
            invalidationPriceDelta: report.invalidationDelta.absolutePriceDelta,
            createdAt: report.createdAt,
            driftJson: serializeCognitionDriftReport(report)
          };

          await this.persistence.driftRepository.saveDriftRecord(driftRecord);
          drift = report;
        } catch (error) {
          status = 'partial_success';
          failureReason = `drift_persistence_failure:${error instanceof Error ? error.message : 'unknown'}`;
          runRecord.status = status;
          runRecord.failureReason = failureReason;
          await this.persistence.runRepository.saveReasoningRun(runRecord);
        }
      }
    }

    const report: ReasoningRunReport = {
      reasoningRunId,
      asset: params.asset,
      timeframe: params.timeframe,
      startedAt,
      endedAt,
      durationMs,
      status,
      sourceIngestionRunId: runRecord.sourceIngestionRunId,
      sourceIngestionRequestKey: runRecord.sourceIngestionRequestKey,
      inputEventCount: runRecord.inputEventCount,
      inputZoneCount: runRecord.inputZoneCount,
      projectedEvidenceCount: runRecord.projectedEvidenceCount,
      priorSnapshotId: runRecord.priorSnapshotId,
      snapshotId,
      warnings,
      failureReason,
      engineName: this.metadata.engineName,
      reasoningVersion: this.metadata.reasoningVersion,
      scoringVersion: this.metadata.scoringVersion,
      drift,
      expectationId
    };

    return {
      cognition,
      report,
      assembly,
      drift,
      expectationId
    };
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
    drift: CognitionDriftReport | null;
  }): Promise<{ cognition: CanonicalCognitionState | null; report: ReasoningRunReport; assembly: ReasoningInputAssemblyResult | null; drift: CognitionDriftReport | null; expectationId?: string | null }> {
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
      scoringVersion: this.metadata.scoringVersion,
      drift: input.drift,
      expectationId: null
    };

    return {
      cognition: input.cognition,
      report,
      assembly: input.assembly,
      drift: input.drift,
      expectationId: null
    };
  }
}

export function createCanonicalReasoningBoundaryService(params: {
  assembler: ReasoningInputAssembler;
  engine?: ReasoningEngineContract;
  metadata?: ReasoningEngineMetadata;
  persistence: ReasoningPersistenceRepository;
}): CanonicalReasoningBoundaryService {
  const engine = params.engine ?? new DeterministicReasoningEngine();
  const metadata = params.metadata ?? {
    engineName: DETERMINISTIC_REASONING_ENGINE_NAME,
    reasoningVersion: DETERMINISTIC_REASONING_VERSION,
    scoringVersion: DETERMINISTIC_SCORING_VERSION
  };
  return new CanonicalReasoningBoundaryService(params.assembler, engine, metadata, params.persistence);
}
