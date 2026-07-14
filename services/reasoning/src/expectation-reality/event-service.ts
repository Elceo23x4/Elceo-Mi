import { deserializeCanonicalCognitionState } from '../persistence/serialization';
import type { CognitionSnapshotRepository } from '../persistence/contracts';
import type { EventExpectationDraft, EventExpectationRecord, EventRealityEvaluation, NumericReleaseFields, ReactionObservationEnvelope } from './contracts';
import { calculateReactionEnvelopeContentHash } from './identity';
import { buildEventReality, createEventExpectation, interpretEventReality } from './event-engine';
import type { EventExpectationRepository, EventRealityRepository } from './repository';

type PostEventCognition = { snapshotId: string; confidence: number; contradiction: number; bias: EventExpectationRecord['expectedAssetDirection'] };
export type ReactionObservationVerification = { effectiveReliability: NonNullable<ReactionObservationEnvelope['effectiveReliability']>; trustBasis: string; verificationRef: string };
export type ReactionObservationVerifier = (envelope: ReactionObservationEnvelope) => Promise<ReactionObservationVerification> | ReactionObservationVerification;
export type ReleaseObservationVerification = { effectiveReliability: NonNullable<ReactionObservationEnvelope['effectiveReliability']>; trustBasis: string; verificationRef: string; verifiedAt: string };
export type ReleaseObservationVerifier = (release: NumericReleaseFields | { releaseId: string; nonNumericOutcome: string; observedAt: string; releaseVersion: string; provenance: EventExpectationRecord['provenance'] }) => Promise<ReleaseObservationVerification> | ReleaseObservationVerification;
const defaultReleaseVerifier: ReleaseObservationVerifier = () => ({ effectiveReliability:'unverified', trustBasis:'missing_release_verifier', verificationRef:'missing_release_verifier', verifiedAt:'1970-01-01T00:00:00.000Z' });
function parseIso(value: string, label: string): number { const t=Date.parse(value); if (!Number.isFinite(t)) throw new Error(`invalid_${label}_timestamp`); return t; }
const defaultVerifier: ReactionObservationVerifier = () => ({ effectiveReliability:'unverified', trustBasis:'missing_verifier', verificationRef:'missing_verifier' });
function validateEnvelopeCutoff(envelope: ReactionObservationEnvelope, interpretedAt: string): void { const seen=new Set<string>(); const cutoff=parseIso(interpretedAt, 'interpreted_at'); for (const c of envelope.reactionInput.candles) { const t=parseIso(c.timestamp, 'reaction_candle'); if (t > cutoff) throw new Error('future_reaction_candle_rejected'); if (seen.has(c.timestamp)) throw new Error('duplicate_reaction_candle_rejected'); seen.add(c.timestamp); } const ordered=[...envelope.reactionInput.candles].sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp)); if (ordered.some((c,i)=>c!==envelope.reactionInput.candles[i])) throw new Error('out_of_order_reaction_candle_rejected'); }

export class EventExpectationRealityService {
  constructor(private readonly expectations: EventExpectationRepository, private readonly evaluations: EventRealityRepository, private readonly snapshots: CognitionSnapshotRepository, private readonly verifier: ReactionObservationVerifier = defaultVerifier, private readonly releaseVerifier: ReleaseObservationVerifier = defaultReleaseVerifier) {}

  private async loadVerifiedCognition(snapshotId: string, expectation: Pick<EventExpectationRecord, 'asset' | 'issuedAt' | 'scheduledReleaseTime'>, role: 'pre' | 'post', releaseObservedAt?: string, interpretedAt?: string): Promise<PostEventCognition> {
    const snapshot = await this.snapshots.getSnapshotById(snapshotId);
    if (!snapshot) throw new Error(`${role}_event_cognition_not_found`);
    if (snapshot.asset !== expectation.asset) throw new Error(`${role}_event_cognition_asset_mismatch`);
    if (role === 'pre') {
      if (parseIso(snapshot.evaluatedAt, `${role}_cognition`) > parseIso(expectation.issuedAt, 'expectation_issued_at')) throw new Error('pre_event_cognition_after_expectation_issuance');
      if (parseIso(snapshot.evaluatedAt, `${role}_cognition`) >= parseIso(expectation.scheduledReleaseTime, 'scheduled_release')) throw new Error('pre_event_cognition_after_release_boundary');
    } else {
      if (releaseObservedAt && parseIso(snapshot.evaluatedAt, `${role}_cognition`) < parseIso(releaseObservedAt, 'release_observed_at')) throw new Error('post_event_cognition_before_release');
      if (interpretedAt && parseIso(snapshot.evaluatedAt, `${role}_cognition`) > parseIso(interpretedAt, 'interpreted_at')) throw new Error('future_post_event_cognition_rejected');
    }
    const cognition = deserializeCanonicalCognitionState(snapshot.cognitionJson);
    return { snapshotId: snapshot.snapshotId, confidence: cognition.confidence.score, contradiction: cognition.contradiction.score, bias: cognition.bias };
  }

  async saveFrozenEventExpectation(input: EventExpectationDraft): Promise<EventExpectationRecord> {
    const pre = await this.loadVerifiedCognition(input.preEventCognitionSnapshotId, input, 'pre');
    parseIso(input.dataCutoffAt, 'expectation_data_cutoff'); parseIso(input.issuedAt, 'expectation_issued_at'); parseIso(input.scheduledReleaseTime, 'scheduled_release'); const verified = createEventExpectation({ ...input, preEventConfidence: pre.confidence, preEventContradiction: pre.contradiction, expectedAssetDirection: pre.bias });
    return this.expectations.saveEventExpectation(verified);
  }

  private async verifyEnvelope(envelope: ReactionObservationEnvelope, interpretedAt: string): Promise<ReactionObservationEnvelope> { validateEnvelopeCutoff(envelope, interpretedAt); const calculatedContentHash = calculateReactionEnvelopeContentHash(envelope); if (envelope.suppliedContentHash && envelope.suppliedContentHash !== calculatedContentHash) throw new Error('reaction_observation_content_hash_mismatch'); const verified = await this.verifier(envelope); if ('verifiedAt' in verified) { const verifiedAt = parseIso((verified as ReactionObservationVerification & { verifiedAt?: string }).verifiedAt ?? new Date(0).toISOString(), 'reaction_verifier_verified_at'); if (verifiedAt > parseIso(interpretedAt, 'interpreted_at')) throw new Error('future_reaction_verification_rejected'); } return { ...envelope, calculatedContentHash, effectiveReliability: verified.effectiveReliability, trustBasis: verified.trustBasis, verificationRef: verified.verificationRef, verifiedAt: (verified as ReactionObservationVerification & { verifiedAt?: string }).verifiedAt ?? null }; }

  async evaluateEvent(params: { expectationId: string; release: NumericReleaseFields | { releaseId: string; nonNumericOutcome: string; observedAt: string; releaseVersion: string; provenance: EventExpectationRecord['provenance'] }; primaryObservationInput: ReactionObservationEnvelope; relatedMarketObservationInputs: ReactionObservationEnvelope[]; postEventCognitionSnapshotId?: string | null; interpretedAt: string }): Promise<EventRealityEvaluation> {
    const expectation = await this.expectations.getEventExpectationById(params.expectationId);
    if (!expectation) throw new Error('event_expectation_not_found');
    if (params.release.releaseId !== expectation.eventReleaseId) throw new Error('release_id_mismatch');
    if (parseIso(params.release.observedAt, 'release_observed_at') > parseIso(params.interpretedAt, 'interpreted_at')) throw new Error('interpreted_before_release_rejected');
    const releaseTrust = await this.releaseVerifier(params.release);
    if (parseIso(releaseTrust.verifiedAt, 'release_verifier_verified_at') > parseIso(params.interpretedAt, 'interpreted_at')) throw new Error('future_release_verification_rejected');
    const release = { ...params.release, provenance: params.release.provenance.map((p) => ({ ...p, effectiveReliability: releaseTrust.effectiveReliability, trustBasis: releaseTrust.trustBasis, verificationRef: releaseTrust.verificationRef, verifiedAt: releaseTrust.verifiedAt })) };
    await this.loadVerifiedCognition(expectation.preEventCognitionSnapshotId, expectation, 'pre');
    const postEventCognition = params.postEventCognitionSnapshotId ? await this.loadVerifiedCognition(params.postEventCognitionSnapshotId, expectation, 'post', release.observedAt, params.interpretedAt) : null;
    const primary = await this.verifyEnvelope(params.primaryObservationInput, params.interpretedAt);
    const related = await Promise.all(params.relatedMarketObservationInputs.map((input) => this.verifyEnvelope(input, params.interpretedAt)));
    const reality = buildEventReality({ expectation, release, primaryPriceReactionInput: primary, followThroughReactionInput: primary, relatedMarketReactionInputs: related, postEventCognition });
    const evaluation = interpretEventReality({ expectation, reality, interpretedAt: params.interpretedAt });
    return this.evaluations.saveEventEvaluation(evaluation);
  }
  getEventEvaluation(expectationId: string, releaseVersion: string): Promise<EventRealityEvaluation | null> { return this.evaluations.getEventEvaluation(expectationId, releaseVersion); }
}
