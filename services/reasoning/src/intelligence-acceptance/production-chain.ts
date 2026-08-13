import type { ReasoningPersistenceRepository } from '../persistence/contracts';
import { HistoricalAnalogRetrievalService } from '../historical-analog-memory/service';
import { createContradictionActionProtocolService } from '../contradiction-action-protocol/service';
import { createMarketCleanlinessService } from '../market-cleanliness/service';
import { createNarrativeDecayService } from '../narrative-decay/service';
import { PositioningStressService } from '../positioning-stress/service';
import { FragilityScoreService } from '../fragility-score/service';
import { canonicalHash } from './identity';
import type { ConfidenceAnatomy, EngineOutputs, ProductionChainInput } from './contracts';

export class ProductionIfpChainAdapter {
  constructor(private readonly persistence: ReasoningPersistenceRepository) {}
  async runAndPersist(
    input: ProductionChainInput,
    confidence: ConfidenceAnatomy,
  ): Promise<EngineOutputs> {
    const event = await this.persistence.eventRealityRepository.getEventEvaluationById(
      input.eventEvaluationId,
    );
    if (!event) throw new Error('ifp8_event_evaluation_missing');
    if (event.interpretedAt !== input.evidenceCutoffAt)
      throw new Error('ifp8_event_cutoff_mismatch');
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
