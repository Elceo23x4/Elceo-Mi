import type { MarketPriceReactionInput } from '@elceo/types';
import { deserializeCanonicalCognitionState } from '../persistence/serialization';
import type { CognitionSnapshotRepository } from '../persistence/contracts';
import type { EventExpectationRecord, EventRealityEvaluation, NumericReleaseFields } from './contracts';
import { buildEventReality, createEventExpectation, interpretEventReality } from './event-engine';
import type { EventExpectationRepository, EventRealityRepository } from './repository';

export class EventExpectationRealityService {
  constructor(private readonly expectations: EventExpectationRepository, private readonly evaluations: EventRealityRepository, private readonly snapshots: CognitionSnapshotRepository) {}
  async saveFrozenEventExpectation(input: EventExpectationRecord): Promise<EventExpectationRecord> { return this.expectations.saveEventExpectation(createEventExpectation(input)); }
  async evaluateEvent(params: { expectationId: string; release: NumericReleaseFields | { releaseId: string; nonNumericOutcome: string; observedAt: string; releaseVersion: string; provenance: EventExpectationRecord['provenance'] }; primaryPriceReactionInput: MarketPriceReactionInput; followThroughReactionInput: MarketPriceReactionInput; relatedMarketReactionInputs: MarketPriceReactionInput[]; postEventCognitionSnapshotId?: string | null; interpretedAt: string }): Promise<EventRealityEvaluation> {
    const expectation = await this.expectations.getEventExpectationById(params.expectationId);
    if (!expectation) throw new Error('event_expectation_not_found');
    if (params.release.releaseId !== expectation.eventReleaseId) throw new Error('release_id_mismatch');
    let postEventCognition: { snapshotId: string; confidence: number; contradiction: number; bias: EventExpectationRecord['expectedAssetDirection'] } | null = null;
    if (params.postEventCognitionSnapshotId) {
      const snapshot = await this.snapshots.getSnapshotById(params.postEventCognitionSnapshotId);
      if (!snapshot) throw new Error('post_event_cognition_not_found');
      if (snapshot.asset !== expectation.asset) throw new Error('post_event_cognition_asset_mismatch');
      if (Date.parse(snapshot.evaluatedAt) < Date.parse(params.release.observedAt)) throw new Error('post_event_cognition_before_release');
      const cognition = deserializeCanonicalCognitionState(snapshot.cognitionJson);
      postEventCognition = { snapshotId: snapshot.snapshotId, confidence: cognition.confidence.score, contradiction: cognition.contradiction.score, bias: cognition.bias };
    }
    const reality = buildEventReality({ expectation, release: params.release, primaryPriceReactionInput: params.primaryPriceReactionInput, followThroughReactionInput: params.followThroughReactionInput, relatedMarketReactionInputs: params.relatedMarketReactionInputs, postEventCognition });
    const evaluation = interpretEventReality({ expectation, reality, interpretedAt: params.interpretedAt });
    return this.evaluations.saveEventEvaluation(evaluation);
  }
  getEventEvaluation(expectationId: string, releaseVersion: string): Promise<EventRealityEvaluation | null> { return this.evaluations.getEventEvaluation(expectationId, releaseVersion); }
}
