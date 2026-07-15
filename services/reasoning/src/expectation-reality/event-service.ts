import { deserializeCanonicalCognitionState } from '../persistence/serialization';
import type { CognitionSnapshotRepository } from '../persistence/contracts';
import type { EventExpectationDraft, EventExpectationRecord, EventRealityEvaluation, NumericReleaseFields, ReactionObservationEnvelope, RelatedEvidenceDecision } from './contracts';
import { calculateReactionEnvelopeContentHash, calculateSplitSegmentContentHash } from './identity';
import { buildEventReality, createEventExpectation, interpretEventReality } from './event-engine';
import type { EventExpectationRepository, EventRealityRepository } from './repository';
import { EXPECTATION_REALITY_POLICY_V1 } from './policy';

type PostEventCognition = { snapshotId: string; evaluatedAt: string; confidence: number; contradiction: number; bias: EventExpectationRecord['expectedAssetDirection'] };
export type ReactionObservationVerification = { effectiveReliability: NonNullable<ReactionObservationEnvelope['effectiveReliability']>; trustBasis: string; verificationRef: string; verifiedAt: string; splitVerifications?: NonNullable<ReactionObservationEnvelope['splitVerifications']> };
export type ReactionObservationVerifier = (envelope: ReactionObservationEnvelope) => Promise<ReactionObservationVerification> | ReactionObservationVerification;
export type ReleaseObservationVerification = { effectiveReliability: NonNullable<ReactionObservationEnvelope['effectiveReliability']>; trustBasis: string; verificationRef: string; verifiedAt: string };
export type ReleaseObservationVerifier = (release: NumericReleaseFields | { releaseId: string; nonNumericOutcome: string; observedAt: string; releaseVersion: string; provenance: EventExpectationRecord['provenance'] }) => Promise<ReleaseObservationVerification> | ReleaseObservationVerification;
export type RelatedEvidenceAvailabilityResult = { asset: EventExpectationRecord['asset']; availability: 'available' | 'unavailable' | 'unknown'; verificationRef: string; verifiedAt: string; trustBasis: string };
export type RelatedEvidenceAvailabilityVerifier = (input: { asset: EventExpectationRecord['asset']; expectation: EventExpectationRecord; releaseObservedAt: string; interpretedAt: string }) => Promise<RelatedEvidenceAvailabilityResult> | RelatedEvidenceAvailabilityResult;
const defaultAvailabilityVerifier: RelatedEvidenceAvailabilityVerifier = (input) => ({ asset: input.asset, availability:'unknown', verificationRef:'missing_related_availability_verifier', verifiedAt:input.releaseObservedAt, trustBasis:'missing_related_availability_verifier' });
const defaultReleaseVerifier: ReleaseObservationVerifier = (release) => ({ effectiveReliability:'unverified', trustBasis:'missing_release_verifier', verificationRef:'missing_release_verifier', verifiedAt:release.observedAt });
function parseIso(value: string, label: string): number { const t=Date.parse(value); if (!Number.isFinite(t)) throw new Error(`invalid_${label}_timestamp`); return t; }
const defaultVerifier: ReactionObservationVerifier = (envelope) => ({ effectiveReliability:'unverified', trustBasis:'missing_verifier', verificationRef:'missing_verifier', verifiedAt:envelope.reactionInput.candles.at(-1)?.closedAt ?? envelope.reactionInput.eventTime ?? '1970-01-01T00:00:00.000Z' });
function durationFor(envelope: ReactionObservationEnvelope): number { const explicit = typeof envelope.barDurationMinutes === 'number' && Number.isFinite(envelope.barDurationMinutes) && envelope.barDurationMinutes > 0 ? envelope.barDurationMinutes * 60_000 : null; const timeframeDuration = envelope.timeframe ? EXPECTATION_REALITY_POLICY_V1.timeframeMinutes[envelope.timeframe] * 60_000 : null; if (explicit === null && timeframeDuration === null) throw new Error('reaction_bar_duration_missing'); if (explicit !== null && timeframeDuration !== null && Math.abs(explicit - timeframeDuration) > 1000) throw new Error('reaction_timeframe_duration_mismatch'); return explicit ?? timeframeDuration!; }
function validateEnvelopeCutoff(envelope: ReactionObservationEnvelope, interpretedAt: string, releaseObservedAt: string): void { const seen=new Set<string>(); const cutoff=parseIso(interpretedAt, 'interpreted_at'); const release=parseIso(releaseObservedAt, 'release_observed_at'); const requiredDuration=durationFor(envelope); let previousClose=-Infinity; for (const c of envelope.reactionInput.candles) { const open=parseIso(c.openedAt, 'reaction_candle_opened_at'); const close=parseIso(c.closedAt, 'reaction_candle_closed_at'); const t=parseIso(c.timestamp, 'reaction_candle'); if (!c.complete) throw new Error('incomplete_reaction_candle_rejected'); if (open >= close) throw new Error('invalid_reaction_candle_interval'); if (close > cutoff || t > cutoff) throw new Error('future_reaction_candle_rejected'); if (t < open || t > close || Math.abs(t-close) > 1000) throw new Error('reaction_candle_timestamp_not_close'); if (open < previousClose) throw new Error('overlapping_reaction_candle_rejected'); const split = c.verifiedPostEventSplit === true; if (open < release && close > release) throw new Error('release_spanning_candle_rejected'); if (split) { if (!c.parentCandleRef || !c.splitAt || !c.splitProvenance) throw new Error('reaction_split_provenance_missing'); if (parseIso(c.splitAt, 'reaction_split_at') !== release) throw new Error('reaction_split_boundary_mismatch'); if (open < release) throw new Error('reaction_split_segment_before_release'); if ((close-open)-requiredDuration > 1000) throw new Error('reaction_split_duration_exceeds_timeframe'); } else if (Math.abs((close-open)-requiredDuration) > 1000) throw new Error('wrong_reaction_bar_duration'); if (seen.has(`${c.openedAt}|${c.closedAt}`)) throw new Error('duplicate_reaction_candle_rejected'); seen.add(`${c.openedAt}|${c.closedAt}`); previousClose=close; } const ordered=[...envelope.reactionInput.candles].sort((a,b)=>Date.parse(a.openedAt)-Date.parse(b.openedAt)); if (ordered.some((c,i)=>c!==envelope.reactionInput.candles[i])) throw new Error('out_of_order_reaction_candle_rejected'); const post=ordered.filter((c)=>Date.parse(c.openedAt)>=release); for (let i=1;i<post.length;i++){ if (Math.abs(Date.parse(post[i]!.openedAt)-Date.parse(post[i-1]!.closedAt))>1000) throw new Error('non_contiguous_reaction_candles_rejected'); } }

export class EventExpectationRealityService {
  constructor(private readonly expectations: EventExpectationRepository, private readonly evaluations: EventRealityRepository, private readonly snapshots: CognitionSnapshotRepository, private readonly verifier: ReactionObservationVerifier = defaultVerifier, private readonly releaseVerifier: ReleaseObservationVerifier = defaultReleaseVerifier, private readonly availabilityVerifier: RelatedEvidenceAvailabilityVerifier = defaultAvailabilityVerifier) {}

  private async loadVerifiedCognition(snapshotId: string, expectation: Pick<EventExpectationRecord, 'asset' | 'issuedAt' | 'scheduledReleaseTime' | 'dataCutoffAt'>, role: 'pre' | 'post', releaseObservedAt?: string, interpretedAt?: string): Promise<PostEventCognition> {
    const snapshot = await this.snapshots.getSnapshotById(snapshotId);
    if (!snapshot) throw new Error(`${role}_event_cognition_not_found`);
    if (snapshot.asset !== expectation.asset) throw new Error(`${role}_event_cognition_asset_mismatch`);
    if (role === 'pre') {
      if (parseIso(expectation.dataCutoffAt, 'expectation_data_cutoff') > parseIso(expectation.issuedAt, 'expectation_issued_at')) throw new Error('event_expectation_future_cutoff_rejected');
      if (parseIso(snapshot.evaluatedAt, `${role}_cognition`) > parseIso(expectation.dataCutoffAt, 'expectation_data_cutoff')) throw new Error('pre_event_cognition_after_data_cutoff');
      if (parseIso(snapshot.evaluatedAt, `${role}_cognition`) > parseIso(expectation.issuedAt, 'expectation_issued_at')) throw new Error('pre_event_cognition_after_expectation_issuance');
      if (parseIso(snapshot.evaluatedAt, `${role}_cognition`) >= parseIso(expectation.scheduledReleaseTime, 'scheduled_release')) throw new Error('pre_event_cognition_after_release_boundary');
    } else {
      if (releaseObservedAt && parseIso(snapshot.evaluatedAt, `${role}_cognition`) < parseIso(releaseObservedAt, 'release_observed_at')) throw new Error('post_event_cognition_before_release');
      if (interpretedAt && parseIso(snapshot.evaluatedAt, `${role}_cognition`) > parseIso(interpretedAt, 'interpreted_at')) throw new Error('future_post_event_cognition_rejected');
    }
    const cognition = deserializeCanonicalCognitionState(snapshot.cognitionJson);
    return { snapshotId: snapshot.snapshotId, evaluatedAt: snapshot.evaluatedAt, confidence: cognition.confidence.score, contradiction: cognition.contradiction.score, bias: cognition.bias };
  }

  async saveFrozenEventExpectation(input: EventExpectationDraft): Promise<EventExpectationRecord> {
    const pre = await this.loadVerifiedCognition(input.preEventCognitionSnapshotId, input, 'pre');
    parseIso(input.dataCutoffAt, 'expectation_data_cutoff'); parseIso(input.issuedAt, 'expectation_issued_at'); parseIso(input.scheduledReleaseTime, 'scheduled_release'); const verified = createEventExpectation({ ...input, preEventConfidence: pre.confidence, preEventContradiction: pre.contradiction, expectedAssetDirection: pre.bias });
    return this.expectations.saveEventExpectation(verified);
  }

  private async verifyEnvelope(envelope: ReactionObservationEnvelope, interpretedAt: string, releaseObservedAt: string): Promise<ReactionObservationEnvelope> { validateEnvelopeCutoff(envelope, interpretedAt, releaseObservedAt); const calculatedContentHash = calculateReactionEnvelopeContentHash(envelope); if (envelope.suppliedContentHash && envelope.suppliedContentHash !== calculatedContentHash) throw new Error('reaction_observation_content_hash_mismatch'); const verified = await this.verifier(envelope); if (!verified.verificationRef.trim()) throw new Error('reaction_verification_ref_missing'); const verifiedAt = parseIso(verified.verifiedAt, 'reaction_verifier_verified_at'); const availability = Math.max(...envelope.reactionInput.candles.map((c)=>parseIso(c.closedAt, 'reaction_candle_closed_at'))); if (verifiedAt < availability) throw new Error('reaction_verification_before_data_available'); if (verifiedAt > parseIso(interpretedAt, 'interpreted_at')) throw new Error('future_reaction_verification_rejected'); for (const c of envelope.reactionInput.candles.filter((x)=>x.verifiedPostEventSplit)) { const segmentContentHash = calculateSplitSegmentContentHash(c); const match = (verified.splitVerifications ?? []).find((v)=>v.parentCandleRef===c.parentCandleRef && v.splitAt===c.splitAt && v.splitProvenance===c.splitProvenance && v.segmentContentHash===segmentContentHash); if (!match) throw new Error('reaction_split_not_verified'); if (!match.splitVerificationRef.trim()) throw new Error('reaction_split_verification_ref_missing'); const splitVerifiedAt=parseIso(match.verifiedAt, 'reaction_split_verified_at'); if (splitVerifiedAt < parseIso(c.closedAt, 'reaction_split_closed_at')) throw new Error('reaction_split_verification_before_segment_close'); if (splitVerifiedAt > parseIso(interpretedAt, 'interpreted_at')) throw new Error('future_reaction_split_verification_rejected'); } return { ...envelope, calculatedContentHash, effectiveReliability: verified.effectiveReliability, trustBasis: verified.trustBasis, verificationRef: verified.verificationRef, verifiedAt: verified.verifiedAt, splitVerifications: verified.splitVerifications ?? [] };  }


  private async resolveRelatedEvidenceDecision(expectation: EventExpectationRecord, related: ReactionObservationEnvelope[], reality: ReturnType<typeof buildEventReality>, releaseObservedAt: string, interpretedAt: string): Promise<RelatedEvidenceDecision> {
    const required = [...new Set(expectation.requiredRelatedAssets ?? [])];
    const interpreted = parseIso(interpretedAt, 'interpreted_at');
    const release = parseIso(releaseObservedAt, 'release_observed_at');
    const policy = EXPECTATION_REALITY_POLICY_V1.eventInterpretation.relatedEvidenceClosure;
    const decided = () => interpretedAt;
    const withPolicy = (decision: Omit<RelatedEvidenceDecision, 'policyVersion' | 'policyParameters'>): RelatedEvidenceDecision => ({ ...decision, policyVersion: policy.version, policyParameters: { deadlineMinutes: policy.deadlineMinutes } });
    if (required.length === 0) return withPolicy({ status:'not_required', decidedAt:decided(), reasonCodes:['related_evidence_not_required'] });
    const requiredIndexes = related.map((r,i)=>required.includes(r.reactionInput.asset as EventExpectationRecord['asset']) ? i : -1).filter((i)=>i>=0);
    const supplied = new Set(requiredIndexes.map((i)=>related[i]!.reactionInput.asset as EventExpectationRecord['asset']));
    const missing = required.filter((a)=>!supplied.has(a));
    const requiredReactions = requiredIndexes.map((i)=>reality.relatedMarketReactions[i]).filter(Boolean);
    if (missing.length === 0 && requiredReactions.some((r)=>r!.status === 'rejected' || r!.status === 'reversed')) return withPolicy({ status:'conflicting_final', decidedAt:decided(), reasonCodes:['required_related_evidence_conflicting'] });
    if (missing.length === 0 && requiredReactions.length === required.length && requiredReactions.every((r)=>r!.status === 'confirmed' || r!.status === 'delayed')) return withPolicy({ status:'confirmed', decidedAt:decided(), reasonCodes:['required_related_evidence_confirmed'] });
    if (missing.length > 0) {
      const availability = await Promise.all(missing.map((asset)=>this.availabilityVerifier({ asset, expectation, releaseObservedAt, interpretedAt })));
      const unavailable = availability.filter((a)=>a.availability === 'unavailable' && a.verificationRef.trim());
      for (const a of unavailable) { const t=parseIso(a.verifiedAt, 'related_availability_verified_at'); if (t < release || t > interpreted) throw new Error('related_availability_verification_time_invalid'); }
      if (unavailable.length === missing.length) return withPolicy({ status:'explicitly_unavailable', decidedAt:decided(), reasonCodes:['required_related_evidence_structurally_unavailable'], evidenceRefs: unavailable.map((a)=>`${a.asset}:${a.verificationRef}`) });
    }
    const deadlineElapsed = interpreted >= release + policy.deadlineMinutes * 60_000;
    if (deadlineElapsed) return withPolicy({ status:'insufficient_final', decidedAt:decided(), reasonCodes:['required_related_evidence_insufficient_final'] });
    return withPolicy({ status:'pending', decidedAt:null, reasonCodes:['required_related_evidence_pending'] });
  }

  async evaluateEvent(params: { expectationId: string; release: NumericReleaseFields | { releaseId: string; nonNumericOutcome: string; observedAt: string; releaseVersion: string; provenance: EventExpectationRecord['provenance'] }; primaryObservationInput: ReactionObservationEnvelope; relatedMarketObservationInputs: ReactionObservationEnvelope[]; postEventCognitionSnapshotId?: string | null; interpretedAt: string; relatedEvidenceClosure?: never }): Promise<EventRealityEvaluation> {
    const expectation = await this.expectations.getEventExpectationById(params.expectationId);
    if (!expectation) throw new Error('event_expectation_not_found');
    if (params.release.releaseId !== expectation.eventReleaseId) throw new Error('release_id_mismatch');
    if (parseIso(params.release.observedAt, 'release_observed_at') > parseIso(params.interpretedAt, 'interpreted_at')) throw new Error('interpreted_before_release_rejected');
    const releaseTrust = await this.releaseVerifier(params.release);
    if (!releaseTrust.verificationRef.trim()) throw new Error('release_verification_ref_missing');
    const releaseVerifiedAt = parseIso(releaseTrust.verifiedAt, 'release_verifier_verified_at');
    if (releaseVerifiedAt < parseIso(params.release.observedAt, 'release_observed_at')) throw new Error('release_verification_before_data_available');
    if (releaseVerifiedAt > parseIso(params.interpretedAt, 'interpreted_at')) throw new Error('future_release_verification_rejected');
    const release = { ...params.release, provenance: params.release.provenance.map((p) => ({ ...p, effectiveReliability: releaseTrust.effectiveReliability, trustBasis: releaseTrust.trustBasis, verificationRef: releaseTrust.verificationRef, verifiedAt: releaseTrust.verifiedAt })) };
    await this.loadVerifiedCognition(expectation.preEventCognitionSnapshotId, expectation, 'pre');
    const postEventCognition = params.postEventCognitionSnapshotId ? await this.loadVerifiedCognition(params.postEventCognitionSnapshotId, expectation, 'post', release.observedAt, params.interpretedAt) : null;
    const primary = await this.verifyEnvelope(params.primaryObservationInput, params.interpretedAt, release.observedAt);
    const related = await Promise.all(params.relatedMarketObservationInputs.map((input) => this.verifyEnvelope(input, params.interpretedAt, release.observedAt)));
    const preliminary = buildEventReality({ expectation, release, primaryPriceReactionInput: primary, relatedMarketReactionInputs: related, postEventCognition });
    const relatedEvidenceDecision = await this.resolveRelatedEvidenceDecision(expectation, related, preliminary, release.observedAt, params.interpretedAt);
    const reality = buildEventReality({ expectation, release, primaryPriceReactionInput: primary, relatedMarketReactionInputs: related, postEventCognition, relatedEvidenceDecision });
    const evaluation = interpretEventReality({ expectation, reality, interpretedAt: params.interpretedAt });
    return this.evaluations.saveEventEvaluation(evaluation);
  }
  getEventEvaluation(expectationId: string, releaseVersion: string): Promise<EventRealityEvaluation | null> { return this.evaluations.getEventEvaluation(expectationId, releaseVersion); }
}
