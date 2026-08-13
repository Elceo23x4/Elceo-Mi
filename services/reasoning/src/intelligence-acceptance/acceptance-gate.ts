import type {
  AcceptanceRecord,
  CalibrationTrial,
  ConfigurationVersion,
  CoverageDecision,
  DatasetCertification,
  DatasetManifest,
  FrozenCaseResult,
  ResidualRisk,
  RollbackEvidence,
  SplitManifest,
} from './contracts';
import { INTELLIGENCE_ACCEPTANCE_POLICY_VERSION } from './contracts';
import { verifyDatasetCertification } from './dataset-policy';
import { canonicalHash } from './identity';
import { segmentedEngineDiagnostics } from './metrics';
import { crossEngineViolations } from './reports';
import { deriveCalibrationDecision } from './configuration-registry';
import type { EmpiricalEngineState, EmpiricalAcceptancePolicy } from './contracts';
function empiricalStates(
  cases: readonly FrozenCaseResult[],
  violations: readonly string[] = [],
  policy: EmpiricalAcceptancePolicy | null = null,
): Record<'ifp1' | 'ifp2' | 'ifp3' | 'ifp4' | 'ifp5' | 'ifp6' | 'ifp7', EmpiricalEngineState> {
  const available = (name: string) =>
    cases.length > 0 &&
    cases.every(
      (row) => !row.outcome.notEvaluable.includes(`${name}_canonical_calculation_unavailable`),
    );
  const states: Record<
    'ifp1' | 'ifp2' | 'ifp3' | 'ifp4' | 'ifp5' | 'ifp6' | 'ifp7',
    EmpiricalEngineState
  > = {
    ifp1:
      available('releaseAligned') &&
      available('reactionClass') &&
      available('initialImpulse') &&
      available('followThrough')
        ? 'pass'
        : 'insufficient_evidence',
    ifp2: available('outcomeFamily') ? 'pass' : 'insufficient_evidence',
    ifp3: available('invalidation') ? 'pass' : 'insufficient_evidence',
    ifp4:
      cases.length && cases.every((row) => row.outcome.properties.pathCoherence !== undefined)
        ? 'pass'
        : 'insufficient_evidence',
    ifp5: available('narrativeContinued') ? 'pass' : 'insufficient_evidence',
    ifp6:
      cases.length &&
      cases.every(
        (row) =>
          row.outputs.ifp6.positioningEvidenceState === 'structurally_unavailable' ||
          row.outcome.properties.squeezeAmplification !== undefined,
      )
        ? 'pass'
        : 'insufficient_evidence',
    ifp7: available('structuralBreakdown') ? 'pass' : 'insufficient_evidence',
  };
  if (policy)
    for (const engine of Object.keys(states) as (keyof typeof states)[])
      if (cases.length < policy.minimumSamples[engine]) states[engine] = 'insufficient_evidence';
  if (violations.some((v) => v.includes('invalidation'))) states.ifp3 = 'fail';
  if (violations.includes('proxy_promoted_to_direct_crowding')) states.ifp6 = 'fail';
  return states;
}
export type ValidatedAcceptanceState = {
  runFamilyId: string;
  dataset: DatasetManifest;
  certification: DatasetCertification | null;
  split: SplitManifest | null;
  configuration: ConfigurationVersion;
  trial: CalibrationTrial | null;
  cases: readonly FrozenCaseResult[];
  coverage: readonly CoverageDecision[];
  coverageContractApproved: boolean;
  outcomePolicyApproved: boolean;
  empiricalAcceptancePolicy: EmpiricalAcceptancePolicy | null;
  rollback: RollbackEvidence | null;
  residualRisks: readonly ResidualRisk[];
  createdAt: string;
};
export function decideValidatedAcceptance(input: ValidatedAcceptanceState): AcceptanceRecord {
  const reasons = verifyDatasetCertification(input.dataset, input.certification);
  if (!input.split) reasons.push('blocked_missing_split');
  if (!input.coverageContractApproved) reasons.push('blocked_missing_approved_coverage_contract');
  if (!input.outcomePolicyApproved) reasons.push('blocked_missing_approved_outcome_policy');
  if (!input.empiricalAcceptancePolicy)
    reasons.push('blocked_missing_approved_empirical_acceptance_policy');
  if (!input.coverage.length || input.coverage.some((c) => c.state === 'insufficient_data'))
    reasons.push('blocked_mandatory_coverage');
  if (!input.cases.length) reasons.push('blocked_missing_holdout_outcomes');
  if (!input.rollback) reasons.push('blocked_missing_rollback_proof');
  const violations = input.cases.flatMap((c) => crossEngineViolations(c.outputs)).sort();
  if (violations.length) reasons.push('blocked_cross_engine_invariant');
  const diagnostics = segmentedEngineDiagnostics(input.cases),
    unexplainedZeroCount = diagnostics.confidence.unexplainedZeroCount;
  const engineStates = input.empiricalAcceptancePolicy
    ? empiricalStates(input.cases, violations, input.empiricalAcceptancePolicy)
    : (Object.fromEntries(
        ['ifp1', 'ifp2', 'ifp3', 'ifp4', 'ifp5', 'ifp6', 'ifp7'].map((key) => [
          key,
          'insufficient_evidence',
        ]),
      ) as ReturnType<typeof empiricalStates>);
  if (input.empiricalAcceptancePolicy) {
    const metric = (path: string) =>
      path
        .split('.')
        .reduce<unknown>(
          (value, key) =>
            typeof value === 'object' && value !== null
              ? (value as Record<string, unknown>)[key]
              : undefined,
          diagnostics,
        );
    for (const criterion of input.empiricalAcceptancePolicy.criteria) {
      if (input.cases.length < criterion.minimumSampleSize) {
        if (criterion.required) engineStates[criterion.engine] = 'insufficient_evidence';
        continue;
      }
      const value = metric(`${criterion.engine}.${criterion.metric}`);
      let passed = false;
      if (criterion.rule === 'no_correctness_violation')
        passed = !violations.some((item) => item.includes(criterion.metric));
      else if (typeof value === 'number')
        passed =
          criterion.rule === 'gte' && criterion.threshold !== null
            ? value >= criterion.threshold
            : criterion.rule === 'lte' && criterion.threshold !== null
              ? value <= criterion.threshold
              : criterion.rule === 'between' &&
                  criterion.threshold !== null &&
                  criterion.upperThreshold !== null
                ? value >= criterion.threshold && value <= criterion.upperThreshold
                : criterion.rule === 'zero_required'
                  ? value === 0
                  : false;
      else if (criterion.rule === 'monotonic_order_required') passed = value === true;
      if (!passed)
        engineStates[criterion.engine] = value === undefined ? 'insufficient_evidence' : 'fail';
    }
  }
  if (
    Object.values(engineStates).some(
      (state) => state === 'fail' || state === 'insufficient_evidence',
    )
  )
    reasons.push('blocked_empirical_engine_insufficient_evidence');
  if (unexplainedZeroCount) reasons.push('blocked_unexplained_confidence_zero');
  if (input.residualRisks.some((r) => r.blocksAcceptance)) reasons.push('blocked_residual_risk');
  let calibrationDecision: 'no_change' | 'candidate_proposed' | 'approved_applied' = 'no_change';
  try {
    calibrationDecision = deriveCalibrationDecision(
      input.configuration,
      input.trial,
      input.split?.calibrationPartitionHash ?? '',
    );
  } catch {
    reasons.push('blocked_configuration_approval');
  }
  const unique = [...new Set(reasons)].sort(),
    state: AcceptanceRecord['state'] = unique.length ? 'blocked' : 'accepted';
  const body = {
    acceptanceRunFamilyId: input.runFamilyId,
    policyVersion: INTELLIGENCE_ACCEPTANCE_POLICY_VERSION,
    datasetId: input.dataset.datasetId,
    certificationId: input.certification?.certificationId ?? null,
    splitId: input.split?.splitId ?? null,
    configurationVersionId: input.configuration.configurationVersionId,
    evidenceIntegrityGate: (verifyDatasetCertification(input.dataset, input.certification).length
      ? 'fail'
      : 'pass') as 'fail' | 'pass',
    mandatoryCoverageGate: (input.coverageContractApproved &&
    input.coverage.length &&
    input.coverage.every((c) => c.state !== 'insufficient_data')
      ? 'pass'
      : 'fail') as 'pass' | 'fail',
    empiricalIntelligenceGate: (input.cases.length &&
    !violations.length &&
    !unexplainedZeroCount &&
    Object.values(engineStates).every((state) => state === 'pass' || state === 'not_applicable')
      ? 'pass'
      : 'not_evaluated') as 'pass' | 'not_evaluated',
    empiricalEngineStates: engineStates,
    state,
    productionAcceptance: state === 'accepted',
    reasonCodes: unique,
    caseResultHashes: input.cases.map((c) => c.canonicalPayloadHash).sort(),
    coverageDecisions: input.coverage,
    engineDiagnostics: diagnostics,
    crossEngineViolations: violations,
    unexplainedZeroCount,
    rollbackEvidenceId: input.rollback?.rollbackEvidenceId ?? null,
    calibrationDecision,
    residualRisks: [...input.residualRisks].sort((a, b) => a.riskId.localeCompare(b.riskId)),
    createdAt: input.createdAt,
  };
  const hash = canonicalHash(body);
  return Object.freeze({
    ...body,
    acceptanceRunId: `ifp8-${hash.slice(0, 32)}`,
    canonicalPayloadHash: hash,
  });
}
