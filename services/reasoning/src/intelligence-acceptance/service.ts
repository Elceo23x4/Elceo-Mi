import type {
  AcceptanceBundle,
  AcceptanceRecord,
  CalibrationTrial,
  ConfidenceAnatomy,
  ConfigurationVersion,
  DatasetCertification,
  DatasetManifest,
  DecisionTimeEvidence,
  EvaluationOutcome,
  FrozenCaseResult,
  ResidualRisk,
  RollbackEvidence,
  SplitManifest,
} from './contracts';
import type { IntelligenceAcceptanceRepository } from './repository';
import { verifyDatasetCertification, validateDecisionTimeEvidence } from './dataset-policy';
import { verifyManifestSplit } from './split-policy';
import { MISSING_APPROVED_COVERAGE_POLICY, evaluateCoverage } from './coverage';
import type { CoveragePolicy } from './contracts';
import { finalizeOutcome, validateOutcomeBinding } from './outcome-evaluator';
import { canonicalHash } from './identity';
import { verifyRollback } from './configuration-registry';
import { decideValidatedAcceptance } from './acceptance-gate';
import type { ProductionIfpChainAdapter } from './production-chain';

export interface DatasetCertificationAuthority {
  verify(certification: DatasetCertification, manifest: DatasetManifest): Promise<boolean>;
}
export interface HoldoutCaseSource {
  list(datasetId: string, eventIds: readonly string[]): Promise<readonly DecisionTimeEvidence[]>;
  outcome(caseId: string): Promise<Omit<EvaluationOutcome, 'canonicalPayloadHash'> | null>;
  confidence(caseId: string): Promise<ConfidenceAnatomy>;
}
export class IntelligenceAcceptanceService {
  constructor(
    private readonly repository: IntelligenceAcceptanceRepository,
    private readonly chain: ProductionIfpChainAdapter,
    private readonly source: HoldoutCaseSource,
    private readonly certificationAuthority: DatasetCertificationAuthority,
    private readonly coveragePolicy: CoveragePolicy = MISSING_APPROVED_COVERAGE_POLICY,
    private readonly approvedStructuralDecisions: ReadonlySet<string> = new Set(),
  ) {}
  async run(input: {
    runFamilyId: string;
    datasetId: string;
    configurationVersionId: string;
    rollbackEvidenceId: string;
    residualRisks?: readonly ResidualRisk[];
    createdAt: string;
  }): Promise<AcceptanceRecord> {
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
    const trial = configuration.sourceCalibrationRunId
      ? await this.repository.get('calibration_trial', configuration.sourceCalibrationRunId)
      : null;
    const lifecycle = await this.repository.get('holdout_lifecycle', input.runFamilyId);
    if (
      !lifecycle ||
      lifecycle.selectedConfigurationVersionId !== configuration.configurationVersionId ||
      lifecycle.holdoutPartitionHash !== split.holdoutPartitionHash
    )
      throw new Error('durable_holdout_selection_missing');
    await this.repository.openHoldout(input.runFamilyId, input.createdAt);
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
      const confidence = await this.source.confidence(item.caseId);
      const outputs = await this.chain.runAndPersist(item.productionInput, confidence);
      const draft = await this.source.outcome(item.caseId);
      if (!draft) throw new Error('required_holdout_outcome_missing');
      const outcome = finalizeOutcome(draft);
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
    const coverage = evaluateCoverage(
      this.coveragePolicy,
      evidence,
      this.approvedStructuralDecisions,
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
      coverageContractApproved: this.coveragePolicy.status === 'approved',
      rollback,
      residualRisks: risks,
      createdAt: input.createdAt,
    });
    const references: AcceptanceBundle['referenceLinks'] = [
      { kind: 'dataset_manifest', id: dataset.datasetId },
      { kind: 'split_manifest', id: split.splitId },
      { kind: 'configuration_version', id: configuration.configurationVersionId },
      { kind: 'rollback_evidence', id: rollback.rollbackEvidenceId },
      ...(certification
        ? [{ kind: 'dataset_certification' as const, id: certification.certificationId }]
        : []),
      ...(trial ? [{ kind: 'calibration_trial' as const, id: trial.trialId }] : []),
      ...cases.map((c) => ({ kind: 'case_result' as const, id: c.caseResultId })),
      ...coverage.map((c) => ({ kind: 'coverage_decision' as const, id: c.cellId })),
    ];
    await this.repository.saveBundle({
      run,
      cases,
      coverage,
      risks,
      rollback,
      referenceLinks: references,
    });
    return run;
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
    if (value && verifyDatasetCertification(dataset, value).length) return value;
    return value;
  }
}
