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
  EmpiricalCriterionResult,
} from './contracts';
import { INTELLIGENCE_ACCEPTANCE_POLICY_VERSION } from './contracts';
import { verifyDatasetCertification } from './dataset-policy';
import { canonicalHash } from './identity';
import { segmentedEngineDiagnostics } from './metrics';
import { crossEngineViolations } from './reports';
import { deriveCalibrationDecision } from './configuration-registry';
import type { EmpiricalEngineState, EmpiricalAcceptancePolicy } from './contracts';
type EmpiricalCriterion = EmpiricalAcceptancePolicy['criteria'][number];

/** Empty scope arrays are explicit wildcards. Segments match persisted confidence segmentation. */
export function caseMatchesEmpiricalScope(row: FrozenCaseResult, criterion: EmpiricalCriterion) {
  const { scope } = criterion,
    confidence = row.outputs.confidence,
    matches = (allowed: readonly string[], value: string) =>
      allowed.length === 0 || allowed.includes(value),
    segments = [confidence.regime, confidence.evidenceSufficiency, confidence.sourceClass];
  return (
    matches(scope.assets, confidence.asset) &&
    matches(scope.eventClasses, confidence.eventClass) &&
    matches(scope.horizons, confidence.horizon) &&
    (scope.segments.length === 0 || scope.segments.some((segment) => segments.includes(segment)))
  );
}

export function evaluateEmpiricalCriteria(
  policy: EmpiricalAcceptancePolicy,
  cases: readonly FrozenCaseResult[],
  coverage: readonly CoverageDecision[],
): EmpiricalCriterionResult[] {
  return policy.criteria.map((criterion) => {
    const scoped = cases.filter((row) => caseMatchesEmpiricalScope(row, criterion));
    const coverageInScope = coverage.filter((decision) => {
      const matches = (allowed: readonly string[], value: string) =>
        allowed.length === 0 || allowed.includes(value);
      return (
        matches(criterion.scope.assets, decision.asset) &&
        matches(criterion.scope.eventClasses, decision.eventClass) &&
        matches(criterion.scope.horizons, decision.horizon)
      );
    });
    const structurallyUnavailable =
      criterion.structuralTreatment === 'not_applicable_allowed' &&
      criterion.structuralDecisionIds.length > 0 &&
      coverageInScope.length > 0 &&
      coverageInScope.every(
        (decision) =>
          decision.state === 'structurally_unavailable' &&
          decision.structuralDecisionId !== null &&
          criterion.structuralDecisionIds.includes(decision.structuralDecisionId),
      );
    if (structurallyUnavailable)
      return {
        criterionId: criterion.criterionId,
        matchedSampleN: scoped.length,
        metricValue: null,
        state: 'not_applicable',
        reason: 'approved_structural_unavailability',
      };
    if (scoped.length < criterion.minimumSampleSize)
      return {
        criterionId: criterion.criterionId,
        matchedSampleN: scoped.length,
        metricValue: null,
        state: 'insufficient_evidence',
        reason: 'scoped_minimum_sample_not_met',
      };
    const diagnostics = segmentedEngineDiagnostics(scoped),
      value = `${criterion.engine}.${criterion.metric}`
        .split('.')
        .reduce<unknown>(
          (current, key) =>
            typeof current === 'object' && current !== null
              ? (current as Record<string, unknown>)[key]
              : undefined,
          diagnostics,
        ),
      violations = scoped.flatMap((row) => crossEngineViolations(row.outputs));
    let passed: boolean | null = null;
    if (criterion.rule === 'no_correctness_violation')
      passed = !violations.some((item) => item.includes(criterion.metric));
    else if (typeof value === 'number') {
      if (criterion.rule === 'gte' && criterion.threshold !== null)
        passed = value >= criterion.threshold;
      else if (criterion.rule === 'lte' && criterion.threshold !== null)
        passed = value <= criterion.threshold;
      else if (
        criterion.rule === 'between' &&
        criterion.threshold !== null &&
        criterion.upperThreshold !== null
      )
        passed = value >= criterion.threshold && value <= criterion.upperThreshold;
      else if (criterion.rule === 'zero_required') passed = value === 0;
    } else if (criterion.rule === 'monotonic_order_required' && typeof value === 'boolean')
      passed = value;
    return {
      criterionId: criterion.criterionId,
      matchedSampleN: scoped.length,
      metricValue: typeof value === 'number' || typeof value === 'boolean' ? value : null,
      state: passed === null ? 'insufficient_evidence' : passed ? 'pass' : 'fail',
      reason:
        passed === null
          ? 'scoped_metric_unavailable'
          : passed
            ? 'scoped_criterion_satisfied'
            : 'scoped_criterion_failed',
    };
  });
}
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
  const evaluatedCriteria = input.empiricalAcceptancePolicy
    ? evaluateEmpiricalCriteria(input.empiricalAcceptancePolicy, input.cases, input.coverage)
    : [];
  if (input.empiricalAcceptancePolicy)
    input.empiricalAcceptancePolicy.criteria.forEach((criterion, index) => {
      const result = evaluatedCriteria[index];
      if (criterion.required && result && result.state !== 'pass')
        engineStates[criterion.engine] = result.state;
    });
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
    empiricalCriterionResults: evaluatedCriteria,
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
