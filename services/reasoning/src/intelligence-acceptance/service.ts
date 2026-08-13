import type {
  AcceptanceBundle,
  AcceptanceRecord,
  CalibrationTrial,
  ConfigurationVersion,
  DatasetCertification,
  DatasetManifest,
  DecisionTimeEvidence,
  FrozenCaseResult,
  ResidualRisk,
  RollbackEvidence,
  SplitManifest,
  OutcomePolicyAuthorityRecord,
  EmpiricalAcceptancePolicy,
} from './contracts';
import type { IntelligenceAcceptanceRepository } from './repository';
import { verifyDatasetCertification, validateDecisionTimeEvidence } from './dataset-policy';
import { verifyManifestSplit } from './split-policy';
import { MISSING_APPROVED_COVERAGE_POLICY, evaluateCoverage } from './coverage';
import type { CoveragePolicy } from './contracts';
import { calculateOutcome, validateOutcomeBinding } from './outcome-evaluator';
import type { OutcomeCalculationInput } from './outcome-evaluator';
import { canonicalHash } from './identity';
import { verifyRollback } from './configuration-registry';
import { decideValidatedAcceptance } from './acceptance-gate';
import type { ProductionIfpChainAdapter } from './production-chain';

export interface DatasetCertificationAuthority {
  verify(certification: DatasetCertification, manifest: DatasetManifest): Promise<boolean>;
}
export interface HoldoutCaseSource {
  list(datasetId: string, eventIds: readonly string[]): Promise<readonly DecisionTimeEvidence[]>;
  outcomeObservations(caseId: string): Promise<OutcomeCalculationInput | null>;
}
export interface CoveragePolicyAuthority {
  resolve(): Promise<{
    policy: CoveragePolicy;
    approvedStructuralDecisionIds: ReadonlySet<string>;
  } | null>;
}
export interface AcceptancePolicyAuthority {
  resolveOutcomePolicy(): Promise<OutcomePolicyAuthorityRecord | null>;
  resolveEmpiricalPolicy(): Promise<EmpiricalAcceptancePolicy | null>;
}
export class IntelligenceAcceptanceService {
  constructor(
    private readonly repository: IntelligenceAcceptanceRepository,
    private readonly chain: ProductionIfpChainAdapter,
    private readonly source: HoldoutCaseSource,
    private readonly certificationAuthority: DatasetCertificationAuthority,
    private readonly coverageAuthority: CoveragePolicyAuthority,
    private readonly acceptancePolicyAuthority: AcceptancePolicyAuthority,
  ) {}
  async run(input: {
    runFamilyId: string;
    datasetId: string;
    configurationVersionId: string;
    rollbackEvidenceId: string;
    residualRisks?: readonly ResidualRisk[];
    createdAt: string;
  }): Promise<AcceptanceRecord> {
    let holdoutExposed = false;
    try {
      const dataset = (await this.required('dataset_manifest', input.datasetId)) as DatasetManifest;
      const persistedCertification = await this.findCertification(dataset);
      const certification =
        persistedCertification &&
        (await this.certificationAuthority.verify(persistedCertification, dataset))
          ? persistedCertification
          : null;
      const split = (await this.required('split_manifest', dataset.datasetId)) as SplitManifest;
      verifyManifestSplit(dataset, split);
      const configuration = (await this.required(
        'configuration_version',
        input.configurationVersionId,
      )) as ConfigurationVersion;
      await this.chain.validateConfiguration(configuration);
      const trial = configuration.sourceCalibrationRunId
        ? await this.repository.get('calibration_trial', configuration.sourceCalibrationRunId)
        : null;
      if (configuration.changeClass === 'explicitly_approved_parameter_calibration' && !trial)
        throw new Error('preflight_calibration_trial_missing');
      const rollback = (await this.required(
        'rollback_evidence',
        input.rollbackEvidenceId,
      )) as RollbackEvidence;
      const restored = (await this.required(
        'configuration_version',
        rollback.restoredConfigurationVersionId,
      )) as ConfigurationVersion;
      const previous = (await this.required(
        'configuration_version',
        rollback.fromConfigurationVersionId,
      )) as ConfigurationVersion;
      verifyRollback(rollback, previous, restored);
      if (
        rollback.datasetId !== dataset.datasetId ||
        rollback.splitId !== split.splitId ||
        rollback.acceptanceRunFamilyId !== input.runFamilyId
      )
        throw new Error('rollback_acceptance_scope_mismatch');
      const authority = await this.coverageAuthority.resolve();
      const outcomePolicy = await this.acceptancePolicyAuthority.resolveOutcomePolicy(),
        empiricalPolicy = await this.acceptancePolicyAuthority.resolveEmpiricalPolicy();
      const approvedPolicy = (
        policy: OutcomePolicyAuthorityRecord | EmpiricalAcceptancePolicy | null,
      ) => {
        if (!policy || policy.status !== 'approved' || !policy.approvalReference) return false;
        const { canonicalPayloadHash, ...body } = policy;
        return canonicalHash(body) === canonicalPayloadHash;
      };
      if (!certification) throw new Error('preflight_blocked_missing_certified_evidence');
      if (!authority || authority.policy.status !== 'approved')
        throw new Error('preflight_blocked_missing_approved_coverage_contract');
      if (!approvedPolicy(outcomePolicy))
        throw new Error('preflight_blocked_missing_approved_outcome_policy');
      if (!approvedPolicy(empiricalPolicy))
        throw new Error('preflight_blocked_missing_approved_empirical_acceptance_policy');
      const lifecycle = await this.repository.get('holdout_lifecycle', input.runFamilyId);
      if (
        !lifecycle ||
        lifecycle.selectedConfigurationVersionId !== configuration.configurationVersionId ||
        lifecycle.holdoutPartitionHash !== split.holdoutPartitionHash
      )
        throw new Error('durable_holdout_selection_missing');
      const opened = await this.repository.openHoldout(input.runFamilyId, input.createdAt);
      if (opened.state !== 'opened') throw new Error('holdout_open_transition_failed');
      holdoutExposed = true;
      const evidence = [...(await this.source.list(dataset.datasetId, split.holdoutEventIds))];
      if (
        evidence.length !== split.holdoutEventIds.length ||
        new Set(evidence.map((e) => e.eventInstanceId)).size !== evidence.length ||
        evidence.some((e) => !split.holdoutEventIds.includes(e.eventInstanceId))
      )
        throw new Error('holdout_case_membership_mismatch');
      const cases: FrozenCaseResult[] = [];
      for (const item of evidence.sort((a, b) => a.caseId.localeCompare(b.caseId))) {
        validateDecisionTimeEvidence(item);
        const outputs = await this.chain.runAndPersist(item.productionInput, item, configuration);
        const confidence = outputs.confidence;
        if (
          confidence.caseId !== item.caseId ||
          confidence.eventEvaluationId !== item.productionInput.eventEvaluationId ||
          confidence.asset !== item.asset ||
          confidence.eventClass !== item.eventClass ||
          confidence.horizon !== item.horizon ||
          confidence.evidenceCutoffAt !== item.evidenceCutoffAt ||
          confidence.canonicalSourceHash !== canonicalHash(outputs.ifp1)
        )
          throw new Error('confidence_provenance_mismatch');
        const draft = await this.source.outcomeObservations(item.caseId);
        if (!draft) throw new Error('required_holdout_outcome_missing');
        if (!certification) throw new Error('outcome_certification_missing');
        for (const observation of draft.observations) {
          const reference = observation.sourceReference,
            effective = reference.effectiveReliability ?? reference.reliability;
          if (
            !certification.sourceIds.includes(reference.sourceId) ||
            !certification.rawArtifactHashes.includes(reference.contentHash) ||
            ![
              ...certification.captureReplayProvenance,
              ...certification.certificationEvidenceReferences,
            ].includes(reference.captureId) ||
            !['verified', 'replay'].includes(effective ?? '')
          )
            throw new Error('outcome_observation_not_certified');
        }
        const outcome = calculateOutcome(item, draft);
        validateOutcomeBinding(item, outcome);
        const body = {
          caseId: item.caseId,
          eventInstanceId: item.eventInstanceId,
          decisionTimeEvidenceHash: canonicalHash(item),
          outputs,
          canonicalOutputHashes: outputs.canonicalOutputHashes,
          frozenAt: input.createdAt,
          outcome,
        };
        const hash = canonicalHash(body);
        cases.push(
          Object.freeze({
            ...body,
            caseResultId: `ifp8-case-${hash.slice(0, 32)}`,
            canonicalPayloadHash: hash,
          }),
        );
      }
      const rollbackCases = new Map(rollback.reproductions.map((row) => [row.caseId, row]));
      if (
        rollbackCases.size !== cases.length ||
        cases.some(
          (row) =>
            rollbackCases.get(row.caseId)?.decisionTimeEvidenceHash !==
            row.decisionTimeEvidenceHash,
        )
      )
        throw new Error('rollback_acceptance_cases_mismatch');
      const coveragePolicy = authority?.policy ?? MISSING_APPROVED_COVERAGE_POLICY;
      const qualifiedEvidence = evidence.map((item) => {
        const result = cases.find((row) => row.caseId === item.caseId)!;
        const families: string[] = [];
        if (
          result.outputs.ifp1.finalizationStatus === 'final' &&
          result.outputs.ifp1.reality.provenance.every((source) =>
            ['verified', 'replay'].includes(source.effectiveReliability ?? source.reliability),
          )
        )
          families.push('ifp1_event_reality');
        if (result.outputs.ifp2?.evidenceSufficiency === 'sufficient')
          families.push('ifp2_historical_analog');
        if (result.outputs.ifp3.evidenceSufficiency === 'sufficient')
          families.push('ifp3_contradiction');
        if (result.outputs.ifp4.cleanlinessState !== 'insufficient_data')
          families.push('ifp4_cleanliness');
        if (result.outputs.ifp5.evidenceSufficiency === 'sufficient')
          families.push('ifp5_narrative');
        if (result.outputs.ifp6.positioningEvidenceState === 'available')
          families.push('ifp6_positioning');
        if (result.outputs.ifp7.evidenceSufficiency === 'sufficient')
          families.push('ifp7_fragility');
        return { ...item, qualifiedEvidenceFamilies: families };
      });
      const coverage = evaluateCoverage(
        coveragePolicy,
        qualifiedEvidence,
        authority?.approvedStructuralDecisionIds ?? new Set(),
        {
          datasetId: dataset.datasetId,
          splitId: split.splitId,
          acceptanceRunFamilyId: input.runFamilyId,
          createdAt: input.createdAt,
        },
      );
      const risks = input.residualRisks ?? [];
      const run = decideValidatedAcceptance({
        runFamilyId: input.runFamilyId,
        dataset,
        certification,
        split,
        configuration,
        trial: trial as CalibrationTrial | null,
        cases,
        coverage,
        coverageContractApproved: coveragePolicy.status === 'approved' && authority !== null,
        outcomePolicyApproved: approvedPolicy(outcomePolicy),
        empiricalAcceptancePolicy: approvedPolicy(empiricalPolicy) ? empiricalPolicy : null,
        rollback,
        residualRisks: risks,
        createdAt: input.createdAt,
      });
      const references: AcceptanceBundle['referenceLinks'] = [
        { kind: 'dataset_manifest', id: dataset.datasetId },
        { kind: 'split_manifest', id: dataset.datasetId },
        { kind: 'configuration_version', id: configuration.configurationVersionId },
        { kind: 'rollback_evidence', id: rollback.rollbackEvidenceId },
        ...(certification
          ? [{ kind: 'dataset_certification' as const, id: dataset.datasetId }]
          : []),
        ...(trial ? [{ kind: 'calibration_trial' as const, id: trial.trialId }] : []),
        ...cases.map((c) => ({ kind: 'case_result' as const, id: c.caseResultId })),
        ...coverage.map((c) => ({ kind: 'coverage_decision' as const, id: c.coverageDecisionId })),
      ];
      await this.repository.finalizeAcceptanceBundle(
        input.runFamilyId,
        {
          run,
          cases,
          coverage,
          risks,
          rollback,
          referenceLinks: references,
        },
        input.createdAt,
      );
      return run;
    } catch (error) {
      if (holdoutExposed)
        await this.repository.failHoldout(
          input.runFamilyId,
          input.createdAt,
          error instanceof Error ? error.message : 'unknown_failure',
        );
      throw error;
    }
  }
  private async required<K extends Parameters<IntelligenceAcceptanceRepository['get']>[0]>(
    kind: K,
    id: string,
  ) {
    const value = await this.repository.get(kind, id);
    if (!value) throw new Error(`ifp8_${kind}_missing`);
    return value;
  }
  private async findCertification(dataset: DatasetManifest): Promise<DatasetCertification | null> {
    const value = await this.repository.get('dataset_certification', dataset.datasetId);
    if (!value || verifyDatasetCertification(dataset, value).length) return null;
    return value;
  }
}
