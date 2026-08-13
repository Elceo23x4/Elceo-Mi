import type {
  AcceptanceEvidenceReference,
  DecisionTimeEvidence,
  EvaluationOutcome,
} from './contracts';
import { OUTCOME_CALCULATION_POLICY_VERSION } from './contracts';
import { canonicalHash } from './identity';

export type OutcomeObservation = Readonly<{
  asset: string;
  observedAt: string;
  availableAt: string;
  price: number;
  sourceReference: AcceptanceEvidenceReference;
}>;
export type OutcomeCalculationInput = Readonly<{
  caseId: string;
  eventInstanceId: string;
  asset: string;
  horizon: string;
  measurementStartAt: string;
  measurementEndAt: string;
  outcomeAvailableAt: string;
  observations: readonly OutcomeObservation[];
}>;
const timestamp = (value: string, reason: string) => {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(reason);
  return parsed;
};
export function calculateOutcome(
  evidence: DecisionTimeEvidence,
  input: OutcomeCalculationInput,
): EvaluationOutcome {
  if (
    input.caseId !== evidence.caseId ||
    input.eventInstanceId !== evidence.eventInstanceId ||
    input.asset !== evidence.asset ||
    input.horizon !== evidence.horizon
  )
    throw new Error('outcome_case_mismatch');
  const cutoff = timestamp(evidence.evidenceCutoffAt, 'outcome_invalid_timestamp'),
    start = timestamp(input.measurementStartAt, 'outcome_invalid_timestamp'),
    end = timestamp(input.measurementEndAt, 'outcome_invalid_timestamp'),
    available = timestamp(input.outcomeAvailableAt, 'outcome_invalid_timestamp');
  if (start < cutoff) throw new Error('outcome_before_decision_cutoff');
  if (end <= start || available < end) throw new Error('outcome_window_invalid');
  const observations = [...input.observations].sort(
    (a, b) =>
      Date.parse(a.observedAt) - Date.parse(b.observedAt) ||
      a.sourceReference.contentHash.localeCompare(b.sourceReference.contentHash),
  );
  for (const observation of observations) {
    if (observation.asset !== evidence.asset || !Number.isFinite(observation.price))
      throw new Error('outcome_observation_invalid');
    const observed = timestamp(observation.observedAt, 'outcome_reference_invalid'),
      referenceAvailable = timestamp(observation.availableAt, 'outcome_reference_invalid');
    if (
      observed < start ||
      observed > end ||
      referenceAvailable > available ||
      observation.sourceReference.availableAt !== observation.availableAt ||
      observation.sourceReference.observedAt !== observation.observedAt
    )
      throw new Error('outcome_reference_outside_policy_window');
  }
  const first = observations.at(0),
    last = observations.at(-1),
    notEvaluable: string[] = [];
  let primaryDirection: string | undefined,
    pathCoherence: number | undefined,
    reversal: boolean | undefined;
  if (first && last && observations.length >= 2) {
    const change = last.price - first.price;
    primaryDirection = change > 0 ? 'bullish' : change < 0 ? 'bearish' : 'neutral';
    const direction = Math.sign(change),
      aligned = observations
        .slice(1)
        .filter(
          (row, index) => Math.sign(row.price - observations[index]!.price) === direction,
        ).length;
    pathCoherence = direction === 0 ? 0 : aligned / (observations.length - 1);
    const extrema =
      direction >= 0
        ? Math.max(...observations.map((x) => x.price))
        : Math.min(...observations.map((x) => x.price));
    reversal = direction >= 0 ? last.price < extrema : last.price > extrema;
  } else notEvaluable.push('price_path_requires_two_qualified_observations');
  for (const property of [
    'releaseAligned',
    'reactionClass',
    'initialImpulse',
    'confirmation',
    'followThrough',
    'narrativeContinued',
    'structuralBreakdown',
    'invalidation',
    'squeezeAmplification',
    'outcomeFamily',
  ])
    notEvaluable.push(`${property}_canonical_calculation_unavailable`);
  const properties = {
    ...(primaryDirection ? { primaryDirection } : {}),
    ...(pathCoherence !== undefined ? { pathCoherence } : {}),
    ...(reversal !== undefined ? { reversal } : {}),
  };
  const body = {
    caseId: input.caseId,
    eventInstanceId: input.eventInstanceId,
    asset: input.asset,
    horizon: input.horizon,
    measurementStartAt: input.measurementStartAt,
    measurementEndAt: input.measurementEndAt,
    outcomeAvailableAt: input.outcomeAvailableAt,
    calculationPolicyVersion: OUTCOME_CALCULATION_POLICY_VERSION,
    sourceReferences: observations.map((x) => x.sourceReference),
    properties,
    notEvaluable: notEvaluable.sort(),
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
    outcome.asset !== evidence.asset ||
    outcome.horizon !== evidence.horizon
  )
    throw new Error('outcome_case_mismatch');
  if (outcome.calculationPolicyVersion !== OUTCOME_CALCULATION_POLICY_VERSION)
    throw new Error('outcome_policy_unknown');
  if (Date.parse(outcome.measurementStartAt) < Date.parse(evidence.evidenceCutoffAt))
    throw new Error('outcome_before_decision_cutoff');
  const { canonicalPayloadHash, ...body } = outcome;
  if (canonicalHash(body) !== canonicalPayloadHash) throw new Error('outcome_hash_mismatch');
}
