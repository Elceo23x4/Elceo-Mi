import type { EventRealityEvaluation } from '../expectation-reality/contracts';
import type { EvidenceSufficiency, ProtocolDecisionState, ProtocolEvidenceBundle, TransitionReason } from './contracts';

const stageOrder = { immediate: 1, confirmation: 2, follow_through: 3 } as const;
const severityOrder: Record<string, number> = { none: 0, low: 1, moderate: 2, high: 3, critical: 4 };

export function assessmentStageOrder(stage: EventRealityEvaluation['assessmentStage']): number {
  return stageOrder[stage];
}

export function directConfirmedInvalidation(bundle: ProtocolEvidenceBundle): boolean {
  const invalidation = bundle.invalidationState;
  return invalidation.primary !== null && invalidation.primary.confirmed === true && invalidation.riskLabel === 'broken';
}

const requiredEvidenceIsTrusted = (bundle: ProtocolEvidenceBundle): boolean =>
  bundle.requiredDirectReliability.length > 0 && bundle.requiredDirectReliability.every((value) => value === 'verified' || value === 'replay');

export function decideProtocolState(bundle: ProtocolEvidenceBundle): { state: ProtocolDecisionState; sufficiency: EvidenceSufficiency; reasons: TransitionReason[]; warnings: string[]; limitations: string[]; rationale: string } {
  const evaluation = bundle.eventEvaluation;
  const matrix = bundle.contradictionMatrix;
  const warnings = [...new Set([...evaluation.warnings, ...matrix.warnings])].sort();
  const limitations = [...new Set([...evaluation.reality.limitations, ...(bundle.analogRetrieval?.limitations ?? [])])].sort();
  const trusted = requiredEvidenceIsTrusted(bundle);

  if (directConfirmedInvalidation(bundle) && trusted) {
    return { state: 'invalidate_thesis', sufficiency: 'sufficient', reasons: ['confirmed_canonical_invalidation'], warnings, limitations, rationale: 'Direct persisted canonical cognition evidence confirms invalidation; confidence, contradiction score, and analog context are not independent causes.' };
  }

  const reasons: TransitionReason[] = [];
  if (evaluation.finalizationStatus !== 'final') reasons.push('non_final_assessment');
  if (evaluation.outcome === 'insufficient_data') reasons.push('insufficient_direct_evidence');
  if (evaluation.relatedEvidenceStatus === 'pending') reasons.push('pending_related_market_evidence');
  if (evaluation.finalizationStatus !== 'final' && (matrix.status === 'pending_confirmation' || matrix.warnings.includes('pending_price_confirmation'))) reasons.push('pending_price_confirmation');
  if (!trusted) reasons.push('provenance_limitation');
  if (matrix.warnings.includes('source_independence_unverified')) reasons.push('source_disagreement_unresolved');
  if (evaluation.finalizationStatus !== 'final' && evaluation.outcome === 'absorbed') reasons.push('absorbed_reaction_pending_later_window');
  if (evaluation.finalizationStatus !== 'final' && evaluation.outcome === 'delayed') reasons.push('delayed_reaction_pending_later_window');
  if (evaluation.finalizationStatus !== 'final' && evaluation.outcome === 'ambiguous') reasons.push('ambiguous_reaction_pending_later_window');
  if (reasons.length > 0) {
    return { state: 'wait_for_confirmation', sufficiency: !trusted ? 'provenance_limited' : evaluation.outcome === 'insufficient_data' ? 'insufficient' : evaluation.finalizationStatus !== 'final' ? 'provisional' : 'pending_confirmation', reasons: [...new Set(reasons)].sort(), warnings, limitations, rationale: 'Evidence remains non-final, insufficient, pending, or provenance-limited, so the protocol waits for required confirmation evidence.' };
  }

  const severity = severityOrder[matrix.highestSeverity] ?? 0;
  const families = new Set(matrix.signals.map((signal) => signal.family));
  if (evaluation.outcome === 'ambiguous' || evaluation.outcome === 'delayed') {
    return { state: 'review_required', sufficiency: 'sufficient', reasons: ['final_ambiguous_evidence'], warnings, limitations, rationale: 'Final delayed or ambiguous direct evidence requires review and cannot be archived implicitly.' };
  }
  if (evaluation.outcome === 'reversed' && severity >= 4) reasons.push('critical_direct_contradiction');
  if (evaluation.relatedEvidenceStatus === 'conflicting_final' && severity >= 3) reasons.push('compound_direct_contradiction', 'related_market_conflict');
  if (evaluation.outcome === 'mispriced_candidate' && severity >= 3) reasons.push('mispriced_candidate_critical_conflict');
  if (families.size >= 2 && severity >= 3) reasons.push('compound_direct_contradiction');
  if (reasons.length > 0) return { state: 'escalate_review', sufficiency: 'sufficient', reasons: [...new Set(reasons)].sort(), warnings, limitations, rationale: 'Sufficient trusted direct current evidence shows a critical or compound contradiction requiring analyst or risk review; analog outcomes are context only.' };

  if (evaluation.outcome === 'rejected') reasons.push('rejected_expectation');
  if (severity >= 2 || matrix.status === 'contradiction') reasons.push('material_contradiction');
  if (evaluation.relatedEvidenceStatus === 'conflicting_final') reasons.push('related_market_conflict');
  if (reasons.length > 0) return { state: 'review_required', sufficiency: 'sufficient', reasons: [...new Set(reasons)].sort(), warnings, limitations, rationale: 'Trusted direct current evidence contains a material contradiction that requires interpretation without proving canonical invalidation.' };

  return { state: 'archive_resolved', sufficiency: 'resolved', reasons: ['final_resolved_non_actionable'], warnings, limitations, rationale: 'Final direct evidence is resolved or non-actionable with no active invalidation or unresolved evidence requirement.' };
}
