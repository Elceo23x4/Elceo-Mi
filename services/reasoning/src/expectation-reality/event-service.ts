import { deserializeCanonicalCognitionState } from '../persistence/serialization';
import type { CognitionSnapshotRepository } from '../persistence/contracts';
import type { EventExpectationDraft, EventExpectationRecord, EventRealityEvaluation, NumericReleaseFields, ReactionObservationEnvelope } from './contracts';
import { calculateReactionEnvelopeContentHash } from './identity';
import { buildEventReality, createEventExpectation, interpretEventReality } from './event-engine';
import type { EventExpectationRepository, EventRealityRepository } from './repository';

type PostEventCognition = { snapshotId: string; confidence: number; contradiction: number; bias: EventExpectationRecord['expectedAssetDirection'] };
export type ReactionObservationVerification = { effectiveReliability: NonNullable<ReactionObservationEnvelope['effectiveReliability']>; trustBasis: string; verificationRef: string };
export type ReactionObservationVerifier = (envelope: ReactionObservationEnvelope) => Promise<ReactionObservationVerification> | ReactionObservationVerification;
const defaultVerifier: ReactionObservationVerifier = () => ({ effectiveReliability:'unverified', trustBasis:'missing_verifier', verificationRef:'missing_verifier' });
function validateEnvelopeCutoff(envelope: ReactionObservationEnvelope, interpretedAt: string): void { const seen=new Set<string>(); const cutoff=Date.parse(interpretedAt); for (const c of envelope.reactionInput.candles) { const t=Date.parse(c.timestamp); if (!Number.isFinite(t)) throw new Error('invalid_reaction_candle_timestamp'); if (t > cutoff) throw new Error('future_reaction_candle_rejected'); if (seen.has(c.timestamp)) throw new Error('duplicate_reaction_candle_rejected'); seen.add(c.timestamp); } const ordered=[...envelope.reactionInput.candles].sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp)); if (ordered.some((c,i)=>c!==envelope.reactionInput.candles[i])) throw new Error('out_of_order_reaction_candle_rejected'); }

export class EventExpectationRealityService {
  constructor(private readonly expectations: EventExpectationRepository, private readonly evaluations: EventRealityRepository, private readonly snapshots: CognitionSnapshotRepository, private readonly verifier: ReactionObservationVerifier = defaultVerifier) {}

  private async loadVerifiedCognition(snapshotId: string, expectation: Pick<EventExpectationRecord, 'asset' | 'issuedAt' | 'scheduledReleaseTime'>, role: 'pre' | 'post', releaseObservedAt?: string, interpretedAt?: string): Promise<PostEventCognition> {
    const snapshot = await this.snapshots.getSnapshotById(snapshotId);
    if (!snapshot) throw new Error(`${role}_event_cognition_not_found`);
    if (snapshot.asset !== expectation.asset) throw new Error(`${role}_event_cognition_asset_mismatch`);
    if (role === 'pre') {
      if (Date.parse(snapshot.evaluatedAt) > Date.parse(expectation.issuedAt)) throw new Error('pre_event_cognition_after_expectation_issuance');
      if (Date.parse(snapshot.evaluatedAt) >= Date.parse(expectation.scheduledReleaseTime)) throw new Error('pre_event_cognition_after_release_boundary');
    } else {
      if (releaseObservedAt && Date.parse(snapshot.evaluatedAt) < Date.parse(releaseObservedAt)) throw new Error('post_event_cognition_before_release');
      if (interpretedAt && Date.parse(snapshot.evaluatedAt) > Date.parse(interpretedAt)) throw new Error('future_post_event_cognition_rejected');
    }
    const cognition = deserializeCanonicalCognitionState(snapshot.cognitionJson);
    return { snapshotId: snapshot.snapshotId, confidence: cognition.confidence.score, contradiction: cognition.contradiction.score, bias: cognition.bias };
  }

  async saveFrozenEventExpectation(input: EventExpectationDraft): Promise<EventExpectationRecord> {
    const pre = await this.loadVerifiedCognition(input.preEventCognitionSnapshotId, input, 'pre');
    const verified = createEventExpectation({ ...input, preEventConfidence: pre.confidence, preEventContradiction: pre.contradiction, expectedAssetDirection: pre.bias });
    return this.expectations.saveEventExpectation(verified);
  }

  private async verifyEnvelope(envelope: ReactionObservationEnvelope, interpretedAt: string): Promise<ReactionObservationEnvelope> { validateEnvelopeCutoff(envelope, interpretedAt); const calculatedContentHash = calculateReactionEnvelopeContentHash(envelope); if (envelope.suppliedContentHash && envelope.suppliedContentHash !== calculatedContentHash) throw new Error('reaction_observation_content_hash_mismatch'); const verified = await this.verifier(envelope); return { ...envelope, calculatedContentHash, effectiveReliability: verified.effectiveReliability, trustBasis: verified.trustBasis, verifiedAt: verified.verificationRef }; }

  async evaluateEvent(params: { expectationId: string; release: NumericReleaseFields | { releaseId: string; nonNumericOutcome: string; observedAt: string; releaseVersion: string; provenance: EventExpectationRecord['provenance'] }; primaryObservationInput: ReactionObservationEnvelope; relatedMarketObservationInputs: ReactionObservationEnvelope[]; postEventCognitionSnapshotId?: string | null; interpretedAt: string }): Promise<EventRealityEvaluation> {
    const expectation = await this.expectations.getEventExpectationById(params.expectationId);
    if (!expectation) throw new Error('event_expectation_not_found');
    if (params.release.releaseId !== expectation.eventReleaseId) throw new Error('release_id_mismatch');
    if (Date.parse(params.interpretedAt) < Date.parse(params.release.observedAt)) throw new Error('interpreted_before_release_rejected');
    await this.loadVerifiedCognition(expectation.preEventCognitionSnapshotId, expectation, 'pre');
    const postEventCognition = params.postEventCognitionSnapshotId ? await this.loadVerifiedCognition(params.postEventCognitionSnapshotId, expectation, 'post', params.release.observedAt, params.interpretedAt) : null;
    const primary = await this.verifyEnvelope(params.primaryObservationInput, params.interpretedAt);
    const related = await Promise.all(params.relatedMarketObservationInputs.map((input) => this.verifyEnvelope(input, params.interpretedAt)));
    const reality = buildEventReality({ expectation, release: params.release, primaryPriceReactionInput: primary, followThroughReactionInput: primary, relatedMarketReactionInputs: related, postEventCognition });
    const evaluation = interpretEventReality({ expectation, reality, interpretedAt: params.interpretedAt });
    return this.evaluations.saveEventEvaluation(evaluation);
  }
  getEventEvaluation(expectationId: string, releaseVersion: string): Promise<EventRealityEvaluation | null> { return this.evaluations.getEventEvaluation(expectationId, releaseVersion); }
}
