import type { CoverageDecision, CoveragePolicy, DecisionTimeEvidence } from './contracts';
import { canonicalHash } from './identity';
export const LAUNCH_ASSETS = [
  'xau_usd',
  'eur_usd',
  'gbp_usd',
  'usd_jpy',
  'aud_usd',
  'usd_chf',
  'nzd_usd',
  'usd_cad',
  'btc_usd',
  'nasdaq_100',
  'sp500',
  'de30',
] as const;
export const DIAGNOSTIC_ASSETS = ['dxy', 'vix'] as const;
export const MISSING_APPROVED_COVERAGE_POLICY: CoveragePolicy = Object.freeze({
  coveragePolicyId: 'ifp8-coverage-policy-pending-approved-event-horizon-contract',
  status: 'missing_approved_event_horizon_contract',
  cells: [],
  diagnosticAssets: DIAGNOSTIC_ASSETS,
  approvalReference: null,
  canonicalPayloadHash: 'f190a9475490d60463a4643ac9bd5f8bf9519ea029176dca90c747875eb6820b',
});
export function validateCoverageAuthority(
  policy: CoveragePolicy,
  approvedStructuralDecisions: ReadonlySet<string>,
): void {
  const { canonicalPayloadHash, ...policyBody } = policy;
  if (
    policy.status !== 'approved' ||
    !policy.approvalReference ||
    canonicalHash(policyBody) !== canonicalPayloadHash
  )
    throw new Error('coverage_policy_authority_invalid');
  for (const cell of policy.cells)
    if (
      cell.structuralDecisionId &&
      !approvedStructuralDecisions.has(cell.structuralDecisionId)
    )
      throw new Error('unapproved_structural_unavailable');
}
export function evaluateCoverage(
  policy: CoveragePolicy,
  cases: readonly DecisionTimeEvidence[],
  approvedStructuralDecisions: ReadonlySet<string>,
  identity: {
    datasetId: string;
    splitId: string;
    acceptanceRunFamilyId: string;
    createdAt: string;
  },
): CoverageDecision[] {
  if (!identity.splitId) throw new Error('coverage_split_id_required');
  if (policy.status !== 'approved') return [];
  validateCoverageAuthority(policy, approvedStructuralDecisions);
  return policy.cells
    .map((cell) => {
      const matching = cases.filter(
          (c) =>
            c.asset === cell.asset &&
            c.eventClass === cell.eventClass &&
            c.horizon === cell.horizon,
        ),
        unique = new Map(matching.map((c) => [c.eventInstanceId, c])),
        missing = [
          ...new Set(
            [...unique.values()].flatMap((c) =>
              cell.requiredEvidenceFamilies.filter((f) => !c.qualifiedEvidenceFamilies.includes(f)),
            ),
          ),
        ].sort();
      let state: 'sufficient' | 'insufficient_data' | 'structurally_unavailable';
      if (cell.structuralDecisionId) {
        if (!approvedStructuralDecisions.has(cell.structuralDecisionId))
          throw new Error('unapproved_structural_unavailable');
        state = 'structurally_unavailable';
      } else
        state =
          unique.size >= cell.minimumUniqueEvents && !missing.length
            ? 'sufficient'
            : 'insufficient_data';
      const observedEvidenceHash = canonicalHash(
          [...unique.values()]
            .map((c) => ({ eventInstanceId: c.eventInstanceId, evidenceHash: canonicalHash(c) }))
            .sort((a, b) => a.eventInstanceId.localeCompare(b.eventInstanceId)),
        ),
        base = {
          ...cell,
          coveragePolicyId: policy.coveragePolicyId,
          ...identity,
          observedEvidenceHash,
          observedUniqueEventCount: cell.structuralDecisionId ? 0 : unique.size,
          missingEvidenceFamilies: cell.structuralDecisionId ? [] : missing,
          state,
        };
      const hash = canonicalHash(base);
      return {
        ...base,
        coverageDecisionId: `ifp8-coverage-${hash.slice(0, 32)}`,
        canonicalPayloadHash: hash,
      };
    })
    .sort((a, b) => a.cellId.localeCompare(b.cellId));
}
