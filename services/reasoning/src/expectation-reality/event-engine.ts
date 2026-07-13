import type { MarketPriceReactionInput } from '@elceo/types';
import { normalizeMacroSurprise } from '../macro-surprise-normalization/index';
import { evaluatePriceReaction } from '../price-reaction/index';
import type { EventExpectationRecord, EventRealityEvaluation, EventRealityRecord, NumericReleaseFields } from './contracts';
import { EXPECTATION_REALITY_POLICY_V1 } from './policy';

const unique = (xs: string[]) => [...new Set(xs)];
const reliable = (r: EventRealityRecord) => r.provenance.some((p) => (EXPECTATION_REALITY_POLICY_V1.eventInterpretation.reliableProvenance as readonly string[]).includes(p.reliability));
const material = (r: EventRealityRecord) => Math.abs(r.normalizedSurprise?.normalizedSurpriseScore ?? 0) >= EXPECTATION_REALITY_POLICY_V1.eventInterpretation.materialSurpriseScore;
const relatedSupports = (r: EventRealityRecord) => r.relatedMarketReactions.some((x) => x.status === 'confirmed' || x.status === 'delayed');

export function createEventExpectation(input: EventExpectationRecord): EventExpectationRecord {
  if (Date.parse(input.dataCutoffAt) > Date.parse(input.issuedAt)) throw new Error('event_expectation_future_cutoff_rejected');
  if (Date.parse(input.issuedAt) >= Date.parse(input.scheduledReleaseTime)) throw new Error('event_expectation_not_pre_event');
  return Object.freeze({ ...input, affectedAssets: [...input.affectedAssets], affectedCurrencies: [...input.affectedCurrencies], expectedConfirmationConditions: [...input.expectedConfirmationConditions], provenance: input.provenance.map((p) => ({ ...p })) });
}

export function buildEventReality(params: { expectation: EventExpectationRecord; release: NumericReleaseFields | { nonNumericOutcome: string; observedAt: string; releaseVersion: string; provenance: EventExpectationRecord['provenance'] }; primaryPriceReactionInput: MarketPriceReactionInput; followThroughReactionInput: MarketPriceReactionInput; relatedMarketReactionInputs: MarketPriceReactionInput[]; postEventCognition?: { snapshotId: string; confidence: number; contradiction: number; bias: EventExpectationRecord['expectedAssetDirection'] } | null }): EventRealityRecord {
  const { expectation, release } = params;
  const numeric = 'actual' in release;
  if (Date.parse(release.observedAt) < Date.parse(expectation.scheduledReleaseTime)) throw new Error('event_reality_before_release_rejected');
  const normalizedSurprise = numeric && expectation.expectationBasis.kind === 'numeric' ? normalizeMacroSurprise({ releaseId: expectation.eventReleaseId, indicatorKind: expectation.indicatorKind, category: expectation.indicatorCategory, region: expectation.region, currency: expectation.currency, importance: expectation.importance, actual: release.actual, forecast: expectation.expectationBasis.forecast, previous: expectation.expectationBasis.previous, revisedPrevious: release.revisedPrevious, unit: expectation.expectationBasis.unit, observedAt: release.observedAt }) : null;
  const primaryPriceReaction = evaluatePriceReaction(params.primaryPriceReactionInput);
  const followThroughReaction = evaluatePriceReaction(params.followThroughReactionInput);
  const relatedMarketReactions = params.relatedMarketReactionInputs.map(evaluatePriceReaction);
  const post = params.postEventCognition ?? null;
  return { releaseId: expectation.eventReleaseId, releaseVersion: release.releaseVersion, observedAt: release.observedAt, actual: numeric ? release.actual : null, forecast: expectation.expectationBasis.kind === 'numeric' ? expectation.expectationBasis.forecast : null, previous: expectation.expectationBasis.kind === 'numeric' ? expectation.expectationBasis.previous : null, revisedPrevious: numeric ? release.revisedPrevious : null, normalizedSurprise, nonNumericOutcome: numeric ? null : release.nonNumericOutcome, provenance: release.provenance.map((p) => ({ ...p })), primaryPriceReaction, followThroughReaction, relatedMarketReactions, postEventCognitionSnapshotId: post?.snapshotId ?? null, postEventConfidence: post?.confidence ?? null, confidenceDelta: post ? post.confidence - expectation.preEventConfidence : null, postEventContradiction: post?.contradiction ?? null, contradictionDelta: post ? post.contradiction - expectation.preEventContradiction : null, biasChange: { before: expectation.expectedAssetDirection, after: post?.bias ?? null, changed: post ? post.bias !== expectation.expectedAssetDirection : false }, warnings: unique([...(normalizedSurprise?.warnings ?? []), ...primaryPriceReaction.warnings, ...followThroughReaction.warnings, ...(relatedMarketReactions.length === 0 ? ['missing_related_market_context'] : [])]), limitations: relatedMarketReactions.length === 0 ? ['related_market_confirmation_unavailable'] : [] };
}

export function interpretEventReality(params: { expectation: EventExpectationRecord; reality: EventRealityRecord; interpretedAt: string }): EventRealityEvaluation {
  const { expectation, reality, interpretedAt } = params;
  const reasonCodes: string[] = [];
  const warnings = [...reality.warnings];
  let outcome: EventRealityEvaluation['outcome'] = 'ambiguous';
  if (!reality.primaryPriceReaction || reality.primaryPriceReaction.status === 'insufficient_data') { outcome = 'insufficient_data'; reasonCodes.push('primary_price_reaction_insufficient'); }
  else if (!material(reality) && expectation.expectationBasis.kind === 'numeric') { outcome = 'ambiguous'; reasonCodes.push('event_surprise_not_material'); }
  else if ((reality.primaryPriceReaction.status === 'rejected' || reality.primaryPriceReaction.status === 'absorbed') && (reality.followThroughReaction.status === 'confirmed' || reality.followThroughReaction.status === 'delayed') && relatedSupports(reality) && reliable(reality) && material(reality) && !warnings.includes('volatility_context_unavailable')) { outcome = 'mispriced_candidate'; reasonCodes.push('strict_mispricing_candidate_conditions_met'); }
  else if (reality.primaryPriceReaction.status === 'confirmed' && (relatedSupports(reality) || reality.relatedMarketReactions.length === 0)) { outcome = reality.relatedMarketReactions.length === 0 ? 'ambiguous' : 'confirmed'; reasonCodes.push(outcome === 'confirmed' ? 'event_confirmed_by_primary_and_related' : 'missing_related_market_context'); }
  else if (reality.primaryPriceReaction.status === 'rejected') { outcome = 'rejected'; reasonCodes.push('event_rejected_by_primary_price'); }
  else if (reality.primaryPriceReaction.status === 'absorbed') { outcome = 'absorbed'; reasonCodes.push('event_absorbed_by_primary_price'); }
  else if (reality.primaryPriceReaction.status === 'reversed') { outcome = 'reversed'; reasonCodes.push('event_reversed_after_initial_reaction'); }
  else if (reality.primaryPriceReaction.status === 'delayed' || reality.followThroughReaction.status === 'confirmed') { outcome = 'delayed'; reasonCodes.push('event_delayed_follow_through'); }
  else { reasonCodes.push('event_interpretation_ambiguous'); }
  if (outcome === 'mispriced_candidate') warnings.push('candidate_not_proven_mispricing');
  return { eventEvaluationId: `event-reality-${expectation.expectationId}-${reality.releaseVersion}`, expectationId: expectation.expectationId, releaseId: reality.releaseId, releaseVersion: reality.releaseVersion, asset: expectation.asset, interpretedAt, outcome, reasonCodes: unique(reasonCodes), warnings: unique(warnings), rationale: `Event release ${reality.releaseId} interpreted as ${outcome}; classification is evidence-qualified and not financial advice.`, expectation, reality, createdAt: interpretedAt };
}
