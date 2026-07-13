import type { MarketPriceReactionInput } from '@elceo/types';
import { deserializeCanonicalCognitionState } from '../persistence/serialization';
import type { CognitionSnapshotRepository } from '../persistence/contracts';
import type { EventExpectationDraft, EventExpectationRecord, EventRealityEvaluation, NumericReleaseFields } from './contracts';
import { buildEventReality, createEventExpectation, interpretEventReality } from './event-engine';
import type { EventExpectationRepository, EventRealityRepository } from './repository';

type PostEventCognition = { snapshotId: string; confidence: number; contradiction: number; bias: EventExpectationRecord['expectedAssetDirection'] };

export class EventExpectationRealityService {
  constructor(private readonly expectations: EventExpectationRepository, private readonly evaluations: EventRealityRepository, private readonly snapshots: CognitionSnapshotRepository) {}

  private async loadVerifiedCognition(snapshotId: string, expectation: Pick<EventExpectationRecord, 'asset' | 'issuedAt' | 'scheduledReleaseTime'>, role: 'pre' | 'post', releaseObservedAt?: string): Promise<PostEventCognition> {
    const snapshot = await this.snapshots.getSnapshotById(snapshotId);
    if (!snapshot) throw new Error(`${role}_event_cognition_not_found`);
    if (snapshot.asset !== expectation.asset) throw new Error(`${role}_event_cognition_asset_mismatch`);
    if (role === 'pre') {
      if (Date.parse(snapshot.evaluatedAt) > Date.parse(expectation.issuedAt)) throw new Error('pre_event_cognition_after_expectation_issuance');
      if (Date.parse(snapshot.evaluatedAt) >= Date.parse(expectation.scheduledReleaseTime)) throw new Error('pre_event_cognition_after_release_boundary');
    } else if (releaseObservedAt && Date.parse(snapshot.evaluatedAt) < Date.parse(releaseObservedAt)) {
      throw new Error('post_event_cognition_before_release');
    }
    const cognition = deserializeCanonicalCognitionState(snapshot.cognitionJson);
    return { snapshotId: snapshot.snapshotId, confidence: cognition.confidence.score, contradiction: cognition.contradiction.score, bias: cognition.bias };
  }

  async saveFrozenEventExpectation(input: EventExpectationDraft): Promise<EventExpectationRecord> {
    const pre = await this.loadVerifiedCognition(input.preEventCognitionSnapshotId, input, 'pre');
    const verified = createEventExpectation({ ...input, preEventConfidence: pre.confidence, preEventContradiction: pre.contradiction, expectedAssetDirection: pre.bias });
    return this.expectations.saveEventExpectation(verified);
  }

  async evaluateEvent(params: { expectationId: string; release: NumericReleaseFields | { releaseId: string; nonNumericOutcome: string; observedAt: string; releaseVersion: string; provenance: EventExpectationRecord['provenance'] }; primaryPriceReactionInput: MarketPriceReactionInput; followThroughReactionInput: MarketPriceReactionInput; relatedMarketReactionInputs: MarketPriceReactionInput[]; postEventCognitionSnapshotId?: string | null; interpretedAt: string }): Promise<EventRealityEvaluation> {
    const expectation = await this.expectations.getEventExpectationById(params.expectationId);
    if (!expectation) throw new Error('event_expectation_not_found');
    if (params.release.releaseId !== expectation.eventReleaseId) throw new Error('release_id_mismatch');
    await this.loadVerifiedCognition(expectation.preEventCognitionSnapshotId, expectation, 'pre');
    const postEventCognition = params.postEventCognitionSnapshotId ? await this.loadVerifiedCognition(params.postEventCognitionSnapshotId, expectation, 'post', params.release.observedAt) : null;
    const reality = buildEventReality({ expectation, release: params.release, primaryPriceReactionInput: params.primaryPriceReactionInput, followThroughReactionInput: params.followThroughReactionInput, relatedMarketReactionInputs: params.relatedMarketReactionInputs, postEventCognition });
    const evaluation = interpretEventReality({ expectation, reality, interpretedAt: params.interpretedAt });
    return this.evaluations.saveEventEvaluation(evaluation);
  }
  getEventEvaluation(expectationId: string, releaseVersion: string): Promise<EventRealityEvaluation | null> { return this.evaluations.getEventEvaluation(expectationId, releaseVersion); }
}
