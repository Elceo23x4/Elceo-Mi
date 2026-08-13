import type { ReasoningPersistenceRepository } from '../persistence/contracts';
import { HistoricalAnalogRetrievalService } from '../historical-analog-memory/service';
import { createContradictionActionProtocolService } from '../contradiction-action-protocol/service';
import { createMarketCleanlinessService } from '../market-cleanliness/service';
import { createNarrativeDecayService } from '../narrative-decay/service';
import { PositioningStressService } from '../positioning-stress/service';
import { FragilityScoreService } from '../fragility-score/service';
import { canonicalHash } from './identity';
import type {
  ConfidenceAnatomy,
  DecisionTimeEvidence,
  EngineOutputs,
  ProductionChainInput,
} from './contracts';
import type { RollbackEvidence } from './contracts';
import { createRollbackEvidence } from './configuration-registry';

export class ProductionIfpChainAdapter {
  constructor(private readonly persistence: ReasoningPersistenceRepository) {}
  async runAndPersist(
    input: ProductionChainInput,
    evidence: DecisionTimeEvidence,
  ): Promise<EngineOutputs> {
    const event = await this.persistence.eventRealityRepository.getEventEvaluationById(
      input.eventEvaluationId,
    );
    if (!event) throw new Error('ifp8_event_evaluation_missing');
    if (event.interpretedAt !== input.evidenceCutoffAt)
      throw new Error('ifp8_event_cutoff_mismatch');
    if (
      event.asset !== evidence.asset ||
      event.expectation.eventKind !== evidence.eventClass ||
      event.assessmentStage !== evidence.horizon
    )
      throw new Error('ifp8_event_case_lineage_mismatch');
    const analog = await new HistoricalAnalogRetrievalService(
      this.persistence.eventRealityRepository,
      this.persistence.historicalAnalogRepository,
    ).retrieveHistoricalAnalogs({ queryEventEvaluationId: event.eventEvaluationId });
    const protocol = await createContradictionActionProtocolService(this.persistence).decide({
      eventEvaluationId: event.eventEvaluationId,
      analogRetrievalId: analog.retrievalId,
      evidenceCutoffAt: input.evidenceCutoffAt,
    });
    const cleanliness = await createMarketCleanlinessService(this.persistence).evaluate({
      eventEvaluationId: event.eventEvaluationId,
      analogRetrievalId: analog.retrievalId,
      ...(input.sessionLiquidityContextId
        ? { sessionLiquidityContextId: input.sessionLiquidityContextId }
        : {}),
      evidenceCutoffAt: input.evidenceCutoffAt,
    });
    const narrative = await createNarrativeDecayService(this.persistence).evaluate({
      eventEvaluationId: event.eventEvaluationId,
      analogRetrievalId: analog.retrievalId,
      evidenceCutoffAt: input.evidenceCutoffAt,
    });
    const positioning = await new PositioningStressService(
      this.persistence.eventRealityRepository,
      this.persistence.historicalAnalogRepository,
      this.persistence.marketCleanlinessRepository,
      this.persistence.narrativeDecayRepository,
      this.persistence.positioningEvidenceRepository,
      this.persistence.positioningStressRepository,
    ).evaluate({
      eventEvaluationId: event.eventEvaluationId,
      analogRetrievalId: analog.retrievalId,
      cleanlinessEvaluationId: cleanliness.cleanlinessEvaluationId,
      narrativeDecayEvaluationId: narrative.narrativeDecayEvaluationId,
      ...(input.positioningEvidenceIds
        ? { positioningEvidenceIds: input.positioningEvidenceIds }
        : {}),
      evidenceCutoffAt: input.evidenceCutoffAt,
    });
    const fragility = await new FragilityScoreService(this.persistence).evaluate({
      eventEvaluationId: event.eventEvaluationId,
      analogRetrievalId: analog.retrievalId,
      protocolDecisionId: protocol.protocolDecisionId,
      cleanlinessEvaluationId: cleanliness.cleanlinessEvaluationId,
      narrativeDecayEvaluationId: narrative.narrativeDecayEvaluationId,
      positioningStressEvaluationId: positioning.positioningStressEvaluationId,
      evidenceCutoffAt: input.evidenceCutoffAt,
    });
    const values = [event, analog, protocol, cleanliness, narrative, positioning, fragility];
    const confidence: ConfidenceAnatomy = Object.freeze({
      caseId: evidence.caseId,
      eventEvaluationId: event.eventEvaluationId,
      asset: event.asset,
      eventClass: event.expectation.eventKind,
      horizon: event.assessmentStage,
      evidenceCutoffAt: input.evidenceCutoffAt,
      regime: 'persisted_event_evaluation',
      evidenceSufficiency: event.finalizationStatus,
      sourceClass: event.reality.provenance
        .map((source) => source.effectiveReliability ?? source.reliability)
        .sort()
        .join(','),
      preClampValue: event.expectation.preEventConfidence,
      postClampValue: event.reality.postEventConfidence ?? 0,
      componentContributions: {},
      penalties: {},
      evidenceCompleteness: event.finalizationReadiness.ready ? 1 : 0,
      providerQualification: event.reality.provenance.every((source) =>
        ['verified', 'replay'].includes(source.effectiveReliability ?? source.reliability),
      )
        ? 'qualified'
        : 'limited',
      priceConfirmationStatus: event.reality.priceReactionTimeline.confirmationWindowState,
      contradictionContribution: event.reality.contradictionDelta ?? 0,
      fxCompleteness: null,
      macroCompleteness: event.reality.normalizedSurprise ? 1 : 0,
      coverageWeightEffects: {},
      reasonCodes: [...event.reasonCodes, ...event.reality.warnings].sort(),
      sourceRefs: event.reality.provenance.map((source) => source.sourceId).sort(),
      canonicalSourceHash: canonicalHash(event),
    });
    return Object.freeze({
      ifp1: event,
      ifp2: analog,
      ifp3: protocol,
      ifp4: cleanliness,
      ifp5: narrative,
      ifp6: positioning,
      ifp7: fragility,
      canonicalOutputHashes: values.map(canonicalHash),
      confidence,
    });
  }
}
export async function createProductionRollbackEvidence(
  adapter: ProductionIfpChainAdapter,
  input: {
    fromConfigurationVersionId: string;
    restoredConfigurationVersionId: string;
    expectedPreviousParameterSnapshotHash: string;
    restoredParameterSnapshotHash: string;
    cases: readonly DecisionTimeEvidence[];
    createdAt: string;
  },
): Promise<RollbackEvidence> {
  if (!input.cases.length) throw new Error('rollback_replay_evidence_empty');
  const reproductions = [];
  for (const evidence of input.cases) {
    const previous = await adapter.runAndPersist(evidence.productionInput, evidence),
      restored = await adapter.runAndPersist(evidence.productionInput, evidence);
    reproductions.push({
      caseId: evidence.caseId,
      previousCanonicalOutputHash: canonicalHash(previous.canonicalOutputHashes),
      restoredCanonicalOutputHash: canonicalHash(restored.canonicalOutputHashes),
      match: false,
    });
  }
  return createRollbackEvidence({
    fromConfigurationVersionId: input.fromConfigurationVersionId,
    restoredConfigurationVersionId: input.restoredConfigurationVersionId,
    expectedPreviousParameterSnapshotHash: input.expectedPreviousParameterSnapshotHash,
    restoredParameterSnapshotHash: input.restoredParameterSnapshotHash,
    reproductions,
    createdAt: input.createdAt,
  });
}
