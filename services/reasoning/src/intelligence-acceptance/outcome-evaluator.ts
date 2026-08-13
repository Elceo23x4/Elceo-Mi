import type { DecisionTimeEvidence, EvaluationOutcome } from './contracts';
import { canonicalHash } from './identity';
export function finalizeOutcome(
  draft: Omit<EvaluationOutcome, 'canonicalPayloadHash'>,
): EvaluationOutcome {
  if (
    !Number.isFinite(Date.parse(draft.measurementStartAt)) ||
    !Number.isFinite(Date.parse(draft.measurementEndAt)) ||
    !Number.isFinite(Date.parse(draft.outcomeAvailableAt))
  )
    throw new Error('outcome_invalid_timestamp');
  if (
    Date.parse(draft.measurementStartAt) >= Date.parse(draft.measurementEndAt) ||
    Date.parse(draft.outcomeAvailableAt) < Date.parse(draft.measurementEndAt)
  )
    throw new Error('outcome_window_invalid');
  if (!draft.sourceReferences.length) throw new Error('outcome_source_references_missing');
  const body = {
    ...draft,
    sourceReferences: [...draft.sourceReferences].sort(
      (a, b) => a.sourceId.localeCompare(b.sourceId) || a.contentHash.localeCompare(b.contentHash),
    ),
  };
  return Object.freeze({ ...body, canonicalPayloadHash: canonicalHash(body) });
}
export function validateOutcomeBinding(
  evidence: DecisionTimeEvidence,
  outcome: EvaluationOutcome,
): void {
  if (
    outcome.caseId !== evidence.caseId ||
    outcome.eventInstanceId !== evidence.eventInstanceId ||
    outcome.horizon !== evidence.horizon
  )
    throw new Error('outcome_case_mismatch');
  const { canonicalPayloadHash, ...body } = outcome;
  if (canonicalHash(body) !== canonicalPayloadHash) throw new Error('outcome_hash_mismatch');
}
