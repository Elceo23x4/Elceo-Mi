import type { MarketAssetDirectionResolutionResult, MarketPriceReactionExpectedDirection, MarketPriceReactionInput } from '@elceo/types';
import { resolveAssetContextualEvidenceDirection } from '../asset-direction-resolution/index';
import { normalizeMacroSurprise } from '../macro-surprise-normalization/index';
import { evaluatePriceReaction } from '../price-reaction/index';
import type { EventExpectationRecord, EventRealityEvaluation, EventRealityRecord, NumericReleaseFields, ReactionObservationEnvelope, ReleaseAlignment } from './contracts';
import { calculateReactionEnvelopeContentHash, canonicalHash } from './identity';
import { EXPECTATION_REALITY_POLICY_V1 } from './policy';

const unique = (xs: string[]) => [...new Set(xs)];
const known = (d: string | null | undefined) => d === 'bullish' || d === 'bearish' || d === 'neutral' || d === 'mixed';
const reliable = (r: EventRealityRecord) => r.provenance.some((p) => (EXPECTATION_REALITY_POLICY_V1.eventInterpretation.reliableProvenance as readonly string[]).includes(p.reliability));
const material = (r: EventRealityRecord) => Math.abs(r.normalizedSurprise?.normalizedSurpriseScore ?? 0) >= EXPECTATION_REALITY_POLICY_V1.eventInterpretation.materialSurpriseScore;
const relatedSupports = (r: EventRealityRecord) => relatedState(r.relatedMarketReactions) === 'confirmed';
const isReliableObservation = (e: ReactionObservationEnvelope) => (EXPECTATION_REALITY_POLICY_V1.eventInterpretation.reliableProvenance as readonly string[]).includes(e.reliability);
function asEnvelope(input: MarketPriceReactionInput | ReactionObservationEnvelope, role: string): ReactionObservationEnvelope { const envelope = 'reactionInput' in input ? input : { reactionInput: input, sourceId: role, provider: 'caller_unspecified', observationVersion: 'unspecified', reliability: 'unverified' } as ReactionObservationEnvelope; const calculatedContentHash = calculateReactionEnvelopeContentHash(envelope); if (envelope.suppliedContentHash && envelope.suppliedContentHash !== calculatedContentHash) throw new Error(`${role}_reaction_content_hash_mismatch`); return { ...envelope, calculatedContentHash }; }
function relatedState(reactions: EventRealityRecord['relatedMarketReactions']): EventRealityRecord['relatedMarketState'] { if (reactions.length === 0) return 'unavailable'; if (reactions.some((r) => r.status === 'rejected' || r.status === 'reversed')) return 'conflicting'; if (reactions.some((r) => r.status === 'insufficient_data' || r.status === 'unknown' || r.status === 'ambiguous')) return 'insufficient'; return reactions.some((r) => r.status === 'confirmed' || r.status === 'delayed') ? 'confirmed' : 'unavailable'; }

function releaseMetadata(expectation: EventExpectationRecord, normalized: EventRealityRecord['normalizedSurprise']) {
  return JSON.stringify({
    releaseId: expectation.eventReleaseId,
    indicatorKind: expectation.indicatorKind,
    indicatorName: expectation.indicatorKind,
    category: expectation.indicatorCategory,
    region: expectation.region,
    currency: expectation.currency,
    affectedCurrency: expectation.currency,
    issuerCurrency: expectation.currency,
    policyIssuerCurrency: expectation.currency,
    policyIssuerRegion: expectation.region,
    actual: normalized?.actual ?? null,
    forecast: normalized?.forecast ?? null,
    previous: normalized?.previous ?? null,
    revisedPrevious: normalized?.revisedPrevious ?? null,
    economicMeaning: normalized?.economicMeaning ?? 'unknown',
    policyPressure: normalized?.policyPressure ?? 'unknown',
    policyTone: normalized?.policyPressure ?? 'unknown',
    riskRegime: normalized?.riskPressure === 'risk_negative' ? 'risk_off' : normalized?.riskPressure === 'risk_supportive' ? 'risk_on' : 'unknown',
    driverKind: normalized?.category === 'inflation' || normalized?.category === 'central_bank_policy' ? 'central_bank_policy' : 'unknown'
  });
}

function resolveReleaseDirection(expectation: EventExpectationRecord, asset: string, normalized: EventRealityRecord['normalizedSurprise']): MarketAssetDirectionResolutionResult {
  if (!expectation.affectedAssets.includes(asset as never)) throw new Error(`unrelated_related_market_rejected:${asset}`);
  const resolved = resolveAssetContextualEvidenceDirection({ asset: asset as never, evidenceClass: 'macro_release', metadataJson: releaseMetadata(expectation, normalized), policyTone: normalized?.policyPressure ?? 'unknown', policyIssuerRegion: String(expectation.region), affectedCurrency: String(expectation.currency), observedAt: normalized ? expectation.scheduledReleaseTime : null });
  if (!known(resolved.resolvedDirection)) throw new Error(`canonical_direction_unavailable:${asset}`);
  return resolved;
}

function assertReaction(input: MarketPriceReactionInput, expectation: EventExpectationRecord, role: 'primary' | 'follow_through' | 'related', releaseObservedAt: string, direction: MarketPriceReactionExpectedDirection) {
  if (role !== 'related' && input.asset !== expectation.asset) throw new Error(`${role}_reaction_asset_mismatch`);
  if (role === 'related' && input.asset === expectation.asset) throw new Error('related_market_primary_asset_rejected');
  if (input.eventKind !== expectation.eventKind && !(expectation.eventKind === 'macro_release' && input.eventKind === 'macro_release')) throw new Error(`${role}_reaction_event_kind_mismatch`);
  if (input.eventTime !== releaseObservedAt) throw new Error(`${role}_reaction_release_time_mismatch`);
  if (input.expectedDirection && input.expectedDirection !== direction) throw new Error(`${role}_reaction_direction_mismatch`);
  return { ...input, eventTime: releaseObservedAt, expectedDirection: direction };
}

function alignRelease(expectation: EventExpectationRecord, normalized: EventRealityRecord['normalizedSurprise'], directions: EventRealityRecord['actualAssetDirections']): ReleaseAlignment {
  const reasonCodes: string[] = [];
  if (!normalized) return { status:'insufficient_data', reasonCodes:['release_alignment_non_numeric_or_missing'], economicMeaningAlignment:'insufficient_data', policyPressureAlignment:'insufficient_data', actualVsForecastAlignment:'insufficient_data', revisionEffect:'unavailable', primaryAssetDirectionAlignment:'insufficient_data', relatedMarketDirectionAlignment:'insufficient_data', expectedEconomicMeaning: expectation.expectedEconomicMeaning, actualEconomicMeaning: null, expectedPolicyPressure: expectation.expectedPolicyPressure, actualPolicyPressure: null, expectedDirection: expectation.expectedAssetDirection, actualDirection: null };
  const meaning = String(normalized.economicMeaning) === String(expectation.expectedEconomicMeaning) ? 'aligned' : 'contradicted';
  const pressure = String(normalized.policyPressure) === String(expectation.expectedPolicyPressure) ? 'aligned' : 'contradicted';
  const actualVsForecast = normalized.surpriseDirection === 'inline' ? 'inline' : normalized.surpriseDirection === 'mixed' || normalized.surpriseDirection === 'unknown' ? 'mixed' : 'aligned';
  const revisionEffect = normalized.revisedPrevious === null || normalized.previous === null || normalized.actual === null || normalized.forecast === null ? 'unavailable' : Math.abs(normalized.revisedPrevious - normalized.previous) < 0.000001 ? 'immaterial' : Math.sign(normalized.revisedPrevious - normalized.previous) === Math.sign(normalized.actual - normalized.forecast) ? 'reinforces_surprise' : Math.abs(normalized.revisedPrevious - normalized.previous) >= Math.abs(normalized.actual - normalized.forecast) ? 'reverses_interpretation' : 'offsets_surprise';
  const primaryDirection = directions.find((d) => d.asset === expectation.asset)?.resolvedDirection ?? 'unknown';
  const primaryDir = primaryDirection === expectation.expectedAssetDirection ? 'aligned' : primaryDirection === 'unknown' ? 'insufficient_data' : 'contradicted';
  const relatedKnown = directions.filter((d) => d.asset !== expectation.asset);
  const relatedAlignment = relatedKnown.length === 0 ? 'insufficient_data' : relatedKnown.every((d) => d.resolvedDirection !== 'unknown') ? 'aligned' : 'mixed';
  for (const [prefix, state] of [['economic_meaning', meaning], ['policy_pressure', pressure], ['actual_vs_forecast', actualVsForecast], ['revision_effect', revisionEffect], ['primary_asset_direction', primaryDir], ['related_market_direction', relatedAlignment]] as const) reasonCodes.push(`${prefix}_${state}`);
  const core = [meaning, pressure, primaryDir].filter((x) => x !== 'insufficient_data');
  const components = [meaning, pressure, actualVsForecast, primaryDir].filter((x) => x !== 'insufficient_data');
  const status = components.length === 0 ? 'insufficient_data' : core.length > 0 && core.every((x) => x === 'contradicted') ? 'contradicted' : components.every((x) => x === 'aligned' || x === 'inline') ? 'aligned' : components.some((x) => x === 'contradicted') ? 'mixed' : 'inline';
  return { status, reasonCodes, economicMeaningAlignment: meaning, policyPressureAlignment: pressure, actualVsForecastAlignment: actualVsForecast, revisionEffect, primaryAssetDirectionAlignment: primaryDir, relatedMarketDirectionAlignment: relatedAlignment, expectedEconomicMeaning: expectation.expectedEconomicMeaning, actualEconomicMeaning: normalized.economicMeaning, expectedPolicyPressure: expectation.expectedPolicyPressure, actualPolicyPressure: normalized.policyPressure, expectedDirection: expectation.expectedAssetDirection, actualDirection: primaryDirection as never };
}

export function createEventExpectation(input: EventExpectationRecord): EventExpectationRecord {
  if (Date.parse(input.dataCutoffAt) > Date.parse(input.issuedAt)) throw new Error('event_expectation_future_cutoff_rejected');
  if (Date.parse(input.issuedAt) >= Date.parse(input.scheduledReleaseTime)) throw new Error('event_expectation_not_pre_event');
  return Object.freeze({ ...input, affectedAssets: [...input.affectedAssets], affectedCurrencies: [...input.affectedCurrencies], expectedConfirmationConditions: [...input.expectedConfirmationConditions], provenance: input.provenance.map((p) => ({ ...p })) });
}

export function buildEventReality(params: { expectation: EventExpectationRecord; release: NumericReleaseFields | { releaseId: string; nonNumericOutcome: string; observedAt: string; releaseVersion: string; provenance: EventExpectationRecord['provenance'] }; primaryPriceReactionInput: MarketPriceReactionInput | ReactionObservationEnvelope; followThroughReactionInput: MarketPriceReactionInput | ReactionObservationEnvelope; relatedMarketReactionInputs: Array<MarketPriceReactionInput | ReactionObservationEnvelope>; postEventCognition?: { snapshotId: string; confidence: number; contradiction: number; bias: EventExpectationRecord['expectedAssetDirection'] } | null }): EventRealityRecord {
  const { expectation, release } = params;
  const numeric = 'actual' in release;
  if (release.releaseId !== expectation.eventReleaseId) throw new Error('release_id_mismatch');
  if (Date.parse(release.observedAt) < Date.parse(expectation.scheduledReleaseTime)) throw new Error('event_reality_before_release_rejected');
  const normalizedSurprise = numeric && expectation.expectationBasis.kind === 'numeric' ? normalizeMacroSurprise({ releaseId: expectation.eventReleaseId, indicatorKind: expectation.indicatorKind, category: expectation.indicatorCategory, region: expectation.region, currency: expectation.currency, importance: expectation.importance, actual: release.actual, forecast: expectation.expectationBasis.forecast, previous: expectation.expectationBasis.previous, revisedPrevious: release.revisedPrevious, unit: expectation.expectationBasis.unit, observedAt: release.observedAt }) : null;
  const directionAssets = unique([expectation.asset, ...params.relatedMarketReactionInputs.map((r) => asEnvelope(r, 'related').reactionInput.asset as string)]);
  const actualAssetDirections = directionAssets.map((asset) => resolveReleaseDirection(expectation, asset, normalizedSurprise)).map((r) => ({ asset: r.asset, resolvedDirection: r.resolvedDirection, confidence: r.confidence, reasonCodes: r.reasonCodes, warnings: r.warnings }));
  const dirFor = (asset: string) => actualAssetDirections.find((d) => d.asset === asset)?.resolvedDirection as MarketPriceReactionExpectedDirection | undefined;
  const primaryDirection = dirFor(expectation.asset); if (!primaryDirection) throw new Error('primary_direction_unavailable');
  const primaryEnvelope = asEnvelope(params.primaryPriceReactionInput, 'primary');
  const followEnvelope = asEnvelope(params.followThroughReactionInput, 'follow_through');
  const relatedEnvelopes = params.relatedMarketReactionInputs.map((input) => asEnvelope(input, 'related'));
  const primaryPriceReaction = evaluatePriceReaction(assertReaction(primaryEnvelope.reactionInput, expectation, 'primary', release.observedAt, primaryDirection));
  const followThroughReaction = evaluatePriceReaction(assertReaction(followEnvelope.reactionInput, expectation, 'follow_through', release.observedAt, primaryDirection));
  const relatedMarketReactions = relatedEnvelopes.map((envelope) => { const direction = dirFor(envelope.reactionInput.asset); if (!direction) throw new Error(`canonical_direction_unavailable:${envelope.reactionInput.asset}`); return evaluatePriceReaction(assertReaction(envelope.reactionInput, expectation, 'related', release.observedAt, direction)); });
  const relatedMarketState = relatedState(relatedMarketReactions);
  const post = params.postEventCognition ?? null;
  const releaseAlignment = alignRelease(expectation, normalizedSurprise, actualAssetDirections);
  const reactionProvenance = [primaryEnvelope, followEnvelope, ...relatedEnvelopes];
  const observationContentHash = canonicalHash({ releaseId: release.releaseId, releaseVersion: release.releaseVersion, observedAt: release.observedAt, actual: numeric ? release.actual : null, forecast: expectation.expectationBasis.kind === 'numeric' ? expectation.expectationBasis.forecast : null, previous: expectation.expectationBasis.kind === 'numeric' ? expectation.expectationBasis.previous : null, revisedPrevious: numeric ? release.revisedPrevious : null, releaseProvenance: release.provenance, primary: primaryEnvelope, followThrough: followEnvelope, related: relatedEnvelopes });
  return { releaseAlignment, actualAssetDirections, observationContentHash, reactionProvenance, relatedMarketState, releaseId: expectation.eventReleaseId, releaseVersion: release.releaseVersion, observedAt: release.observedAt, actual: numeric ? release.actual : null, forecast: expectation.expectationBasis.kind === 'numeric' ? expectation.expectationBasis.forecast : null, previous: expectation.expectationBasis.kind === 'numeric' ? expectation.expectationBasis.previous : null, revisedPrevious: numeric ? release.revisedPrevious : null, normalizedSurprise, nonNumericOutcome: numeric ? null : release.nonNumericOutcome, provenance: release.provenance.map((p) => ({ ...p })), primaryPriceReaction, followThroughReaction, relatedMarketReactions, postEventCognitionSnapshotId: post?.snapshotId ?? null, postEventConfidence: post?.confidence ?? null, confidenceDelta: post ? post.confidence - expectation.preEventConfidence : null, postEventContradiction: post?.contradiction ?? null, contradictionDelta: post ? post.contradiction - expectation.preEventContradiction : null, biasChange: { before: expectation.expectedAssetDirection, after: post?.bias ?? null, changed: post ? post.bias !== expectation.expectedAssetDirection : false }, warnings: unique([...(normalizedSurprise?.warnings ?? []), ...actualAssetDirections.flatMap((d) => d.warnings), ...primaryPriceReaction.warnings, ...followThroughReaction.warnings, ...(relatedMarketReactions.length === 0 ? ['missing_related_market_context'] : []), ...(relatedMarketState === 'conflicting' ? ['related_market_conflict'] : [])]), limitations: relatedMarketReactions.length === 0 ? ['related_market_confirmation_unavailable'] : [] };
}

export function interpretEventReality(params: { expectation: EventExpectationRecord; reality: EventRealityRecord; interpretedAt: string }): EventRealityEvaluation {
  const { expectation, reality, interpretedAt } = params;
  const reasonCodes: string[] = [...reality.releaseAlignment.reasonCodes];
  const warnings = [...reality.warnings];
  let outcome: EventRealityEvaluation['outcome'] = 'ambiguous';
  const actualKnown = known(reality.releaseAlignment.actualDirection);
  const effectiveRelatedState = relatedState(reality.relatedMarketReactions);
  const priceProvenanceReliable = reality.reactionProvenance.every(isReliableObservation);
  const criticalAmbiguity = warnings.includes('volatility_context_unavailable') || warnings.includes('volatility_basis_missing') || warnings.includes('observation_content_hash_mismatch') || !actualKnown || reality.releaseAlignment.status === 'mixed' || effectiveRelatedState === 'conflicting' || !priceProvenanceReliable;
  if (!reality.primaryPriceReaction || reality.primaryPriceReaction.status === 'insufficient_data') { outcome = 'insufficient_data'; reasonCodes.push('primary_price_reaction_insufficient'); }
  else if (!material(reality) && expectation.expectationBasis.kind === 'numeric') { outcome = 'ambiguous'; reasonCodes.push('event_surprise_not_material'); }
  else if ((reality.primaryPriceReaction.status === 'rejected' || reality.primaryPriceReaction.status === 'absorbed') && (reality.followThroughReaction.status === 'confirmed' || reality.followThroughReaction.status === 'delayed') && relatedSupports(reality) && reliable(reality) && material(reality) && (reality.releaseAlignment.status === 'contradicted' || reality.releaseAlignment.status === 'aligned') && !criticalAmbiguity) { outcome = 'mispriced_candidate'; reasonCodes.push(reality.releaseAlignment.status === 'aligned' ? 'expectation_aligned_market_initially_rejected' : 'expectation_contradicted_market_initially_rejected_actual_reality'); }
  else if (reality.releaseAlignment.status === 'contradicted') { outcome = 'rejected'; reasonCodes.push('release_expectation_semantic_contradiction'); }
  else if (effectiveRelatedState === 'conflicting') { outcome = 'ambiguous'; reasonCodes.push('related_market_conflict_blocks_mispricing'); }
  else if (reality.releaseAlignment.status === 'mixed') { outcome = 'ambiguous'; reasonCodes.push('release_expectation_mixed_alignment'); }
  else if (reality.primaryPriceReaction.status === 'confirmed' && relatedSupports(reality)) { outcome = 'confirmed'; reasonCodes.push('event_confirmed_by_primary_and_related'); }
  else if (reality.primaryPriceReaction.status === 'confirmed' && reality.relatedMarketReactions.length === 0) { outcome = 'ambiguous'; reasonCodes.push('missing_related_market_context'); }
  else if (reality.primaryPriceReaction.status === 'rejected') { outcome = 'rejected'; reasonCodes.push('event_rejected_by_primary_price'); }
  else if (reality.primaryPriceReaction.status === 'absorbed') { outcome = 'absorbed'; reasonCodes.push('event_absorbed_by_primary_price'); }
  else if (reality.primaryPriceReaction.status === 'reversed') { outcome = 'reversed'; reasonCodes.push('event_reversed_after_initial_reaction'); }
  else if (reality.primaryPriceReaction.status === 'delayed' || reality.followThroughReaction.status === 'confirmed') { outcome = 'delayed'; reasonCodes.push('event_delayed_follow_through'); }
  else { reasonCodes.push('event_interpretation_ambiguous'); }
  if (!reality.postEventCognitionSnapshotId && ['confirmed','rejected','absorbed','delayed','reversed','mispriced_candidate'].includes(outcome)) { outcome = 'insufficient_data'; reasonCodes.push('post_event_cognition_required'); warnings.push('missing_confidence_shift_context'); }
  if (outcome === 'mispriced_candidate') warnings.push('candidate_not_proven_mispricing');
  return { eventEvaluationId: `event-reality-${expectation.expectationId}-${reality.releaseVersion}`, expectationId: expectation.expectationId, releaseId: reality.releaseId, releaseVersion: reality.releaseVersion, asset: expectation.asset, preEventCognitionSnapshotId: expectation.preEventCognitionSnapshotId, postEventCognitionSnapshotId: reality.postEventCognitionSnapshotId, observationContentHash: reality.observationContentHash, reactionProvenance: reality.reactionProvenance, interpretedAt, outcome, reasonCodes: unique(reasonCodes), warnings: unique(warnings), rationale: `Event release ${reality.releaseId} interpreted as ${outcome}; classification is evidence-qualified and not financial advice.`, expectation, reality, createdAt: interpretedAt };
}
