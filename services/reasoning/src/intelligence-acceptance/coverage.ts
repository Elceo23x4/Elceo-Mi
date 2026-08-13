import type { CoverageDecision, CoveragePolicy, DecisionTimeEvidence } from './contracts';
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
export function evaluateCoverage(
  policy: CoveragePolicy,
  cases: readonly DecisionTimeEvidence[],
  approvedStructuralDecisions: ReadonlySet<string>,
): CoverageDecision[] {
  if (policy.status !== 'approved') return [];
  return policy.cells
    .map((cell) => {
      const matching = cases.filter(
        (c) =>
          c.asset === cell.asset && c.eventClass === cell.eventClass && c.horizon === cell.horizon,
      );
      const unique = new Map(matching.map((c) => [c.eventInstanceId, c]));
      const missing = [
        ...new Set(
          [...unique.values()].flatMap((c) =>
            cell.requiredEvidenceFamilies.filter((f) => !c.qualifiedEvidenceFamilies.includes(f)),
          ),
        ),
      ].sort();
      if (cell.structuralDecisionId) {
        if (!approvedStructuralDecisions.has(cell.structuralDecisionId))
          throw new Error('unapproved_structural_unavailable');
        return {
          ...cell,
          observedUniqueEventCount: 0,
          missingEvidenceFamilies: [],
          state: 'structurally_unavailable' as const,
        };
      }
      return {
        ...cell,
        observedUniqueEventCount: unique.size,
        missingEvidenceFamilies: missing,
        state:
          unique.size >= cell.minimumUniqueEvents && !missing.length
            ? ('sufficient' as const)
            : ('insufficient_data' as const),
      };
    })
    .sort((a, b) => a.cellId.localeCompare(b.cellId));
}
