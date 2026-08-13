import type { EventRealityEvaluation } from '../expectation-reality/contracts';
import type { HistoricalAnalogRetrievalResult } from '../historical-analog-memory/contracts';
import type { ProtocolAuditRecord } from '../contradiction-action-protocol/contracts';
import type { MarketCleanlinessEvaluation } from '../market-cleanliness/contracts';
import type { NarrativeDecayEvaluation } from '../narrative-decay/contracts';
import type { PositioningStressEvaluation } from '../positioning-stress/contracts';
import type { FragilityScoreEvaluation } from '../fragility-score/contracts';

export const INTELLIGENCE_ACCEPTANCE_POLICY_VERSION = 'intelligence-acceptance-v1' as const;
export const DATASET_CERTIFICATION_POLICY_VERSION = 'ifp8-dataset-certification-v1' as const;
export const COVERAGE_POLICY_VERSION = 'ifp8-launch-coverage-v1' as const;
export const OUTCOME_CALCULATION_POLICY_VERSION = 'ifp8-outcome-observation-v1' as const;

export type DatasetClass =
  | 'fixture'
  | 'golden_fixture'
  | 'dry_run'
  | 'captured_fixture'
  | 'certified_replay'
  | 'staging_capture'
  | 'production_like_certified'
  | 'unknown';
export type DatasetManifest = Readonly<{
  datasetId: string;
  datasetVersion: string;
  datasetClass: DatasetClass;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  sourceRegistryVersion: string;
  sourceRegistryHash: string;
  sourceIds: readonly string[];
  assetCoverage: readonly string[];
  eventClassCoverage: readonly string[];
  horizonCoverage: readonly string[];
  sampleCount: number;
  eventInstanceCount: number;
  provenanceSummary: string;
  rawArtifactHashes: readonly string[];
  normalizationPolicyVersion: string;
  outcomePolicyVersion: string;
  splitPolicyVersion: string;
  calibrationPartitionHash: string;
  embargoPartitionHash: string;
  holdoutPartitionHash: string;
  canonicalPayloadHash: string;
}>;
export type DatasetCertification = Readonly<{
  certificationId: string;
  datasetId: string;
  datasetVersion: string;
  datasetManifestHash: string;
  claimedDatasetClass: DatasetClass;
  sourceRegistryVersion: string;
  sourceRegistryHash: string;
  rawArtifactHashes: readonly string[];
  captureReplayProvenance: readonly string[];
  sourceIds: readonly string[];
  reliabilitySummary: Readonly<Record<string, number>>;
  fixtureContamination: boolean;
  unverifiedContamination: boolean;
  certificationPolicyVersion: typeof DATASET_CERTIFICATION_POLICY_VERSION;
  certificationEvidenceReferences: readonly string[];
  certifiedAt: string;
  canonicalPayloadHash: string;
}>;
export type AcceptanceEvidenceReference = Readonly<{
  observedAt: string;
  availableAt: string;
  sourceId: string;
  provider: string;
  captureId: string;
  contentHash: string;
  reliability?: string;
  effectiveReliability?: string;
}>;
export type ProductionChainInput = Readonly<{
  eventEvaluationId: string;
  evidenceCutoffAt: string;
  positioningEvidenceIds?: readonly string[];
  sessionLiquidityContextId?: string;
}>;
export type DecisionTimeEvidence = Readonly<{
  caseId: string;
  eventInstanceId: string;
  eventFamilyId: string;
  evidenceCutoffAt: string;
  asset: string;
  eventClass: string;
  horizon: string;
  qualifiedEvidenceFamilies: readonly string[];
  references: readonly AcceptanceEvidenceReference[];
  productionInput: ProductionChainInput;
}>;
export type EvaluationOutcome = Readonly<{
  caseId: string;
  eventInstanceId: string;
  horizon: string;
  measurementStartAt: string;
  measurementEndAt: string;
  outcomeAvailableAt: string;
  asset: string;
  calculationPolicyVersion: typeof OUTCOME_CALCULATION_POLICY_VERSION;
  sourceReferences: readonly AcceptanceEvidenceReference[];
  properties: Readonly<{
    releaseAligned?: boolean;
    reactionClass?: string;
    primaryDirection?: string;
    initialImpulse?: boolean;
    confirmation?: boolean;
    followThrough?: boolean;
    reversal?: boolean;
    pathCoherence?: number;
    turbulence?: number;
    narrativeContinued?: boolean;
    structuralBreakdown?: boolean;
    invalidation?: boolean;
    squeezeAmplification?: number;
    outcomeFamily?: string;
  }>;
  notEvaluable: readonly string[];
  canonicalPayloadHash: string;
}>;
export type SplitManifest = Readonly<{
  splitId: string;
  datasetId: string;
  calibrationEventIds: readonly string[];
  embargoEventIds: readonly string[];
  holdoutEventIds: readonly string[];
  eventFamilies: Readonly<Record<string, string>>;
  eventTimes: Readonly<Record<string, string>>;
  outcomeWindowEnds: Readonly<Record<string, string>>;
  maximumOutcomeHorizonMs: number;
  calibrationPartitionHash: string;
  embargoPartitionHash: string;
  holdoutPartitionHash: string;
  canonicalPayloadHash: string;
}>;
export type ConfigurationVersion = Readonly<{
  configurationVersionId: string;
  parentConfigurationVersionId: string | null;
  status: 'baseline' | 'candidate' | 'approved' | 'superseded';
  policyVersions: Readonly<
    Record<'ifp1' | 'ifp2' | 'ifp3' | 'ifp4' | 'ifp5' | 'ifp6' | 'ifp7', string>
  >;
  parameterSnapshot: Readonly<Record<string, unknown>>;
  parameterSnapshotHash: string;
  sourceCalibrationRunId: string | null;
  approvedBy: string | null;
  approvalReference: string | null;
  changeClass: 'no_change' | 'explicitly_approved_parameter_calibration';
  changeReason: string;
  createdAt: string;
  supersededAt: string | null;
  rollbackTargetVersionId: string | null;
  canonicalPayloadHash: string;
}>;
export type CalibrationTrial = Readonly<{
  trialId: string;
  acceptanceRunFamilyId: string;
  configurationVersionId: string;
  parentConfigurationVersionId: string;
  datasetId: string;
  calibrationPartitionHash: string;
  candidateSequence: number;
  parametersChanged: Readonly<Record<string, unknown>>;
  reasonForCandidate: string;
  calibrationMetricsHash: string;
  createdAt: string;
  canonicalPayloadHash: string;
}>;
export type HoldoutLifecycle = Readonly<{
  acceptanceRunFamilyId: string;
  datasetId: string;
  holdoutPartitionHash: string;
  selectedConfigurationVersionId: string;
  state: 'selected' | 'opened' | 'completed' | 'failed';
  selectedAt: string;
  openedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
  canonicalPayloadHash: string;
}>;
export type RollbackEvidence = Readonly<{
  rollbackEvidenceId: string;
  fromConfigurationVersionId: string;
  restoredConfigurationVersionId: string;
  expectedPreviousParameterSnapshotHash: string;
  restoredParameterSnapshotHash: string;
  datasetId: string;
  splitId: string;
  acceptanceRunFamilyId: string;
  reproductions: readonly Readonly<{
    caseId: string;
    decisionTimeEvidenceHash: string;
    previousCanonicalOutputHash: string;
    restoredCanonicalOutputHash: string;
    match: boolean;
  }>[];
  reproductionMatch: boolean;
  createdAt: string;
  canonicalPayloadHash: string;
}>;
export type CoverageCell = Readonly<{
  cellId: string;
  asset: string;
  eventClass: string;
  horizon: string;
  requiredEvidenceFamilies: readonly string[];
  minimumUniqueEvents: number;
  structuralDecisionId: string | null;
  policyVersion: typeof COVERAGE_POLICY_VERSION;
}>;
export type CoveragePolicy = Readonly<{
  coveragePolicyId: string;
  status: 'approved' | 'missing_approved_event_horizon_contract';
  cells: readonly CoverageCell[];
  diagnosticAssets: readonly string[];
  approvalReference: string | null;
  canonicalPayloadHash: string;
}>;
export type CoverageDecision = CoverageCell &
  Readonly<{
    coverageDecisionId: string;
    coveragePolicyId: string;
    datasetId: string;
    splitId: string;
    acceptanceRunFamilyId: string;
    observedEvidenceHash: string;
    observedUniqueEventCount: number;
    missingEvidenceFamilies: readonly string[];
    state: 'sufficient' | 'insufficient_data' | 'structurally_unavailable';
  }>;
export type ConfidenceAnatomy = Readonly<{
  caseId: string;
  eventEvaluationId: string;
  asset: string;
  eventClass: string;
  horizon: string;
  evidenceCutoffAt: string;
  regime: string;
  evidenceSufficiency: string;
  sourceClass: string;
  preClampValue: number;
  postClampValue: number | null;
  componentContributions: Readonly<Record<string, number>>;
  penalties: Readonly<Record<string, number>>;
  evidenceCompleteness: number;
  providerQualification: string;
  priceConfirmationStatus: string;
  contradictionContribution: number;
  fxCompleteness: number | null;
  macroCompleteness: number;
  coverageWeightEffects: Readonly<Record<string, number>>;
  reasonCodes: readonly string[];
  sourceRefs: readonly string[];
  canonicalSourceHash: string;
  preSnapshotId: string;
  postSnapshotId: string | null;
  preReasoningRunId: string;
  postReasoningRunId: string | null;
  availability: 'available' | 'provisional';
}>;
export type EmpiricalEngineState = 'pass' | 'fail' | 'insufficient_evidence' | 'not_applicable';
export type EngineOutputs = Readonly<{
  ifp1: EventRealityEvaluation;
  ifp2: HistoricalAnalogRetrievalResult | null;
  ifp3: ProtocolAuditRecord;
  ifp4: MarketCleanlinessEvaluation;
  ifp5: NarrativeDecayEvaluation;
  ifp6: PositioningStressEvaluation;
  ifp7: FragilityScoreEvaluation;
  canonicalOutputHashes: readonly string[];
  confidence: ConfidenceAnatomy;
  configurationVersionId: string;
  configurationPayloadHash: string;
  parameterSnapshotHash: string;
}>;
export type OutcomePolicyAuthorityRecord = Readonly<{
  policyId: string;
  policyVersion: string;
  status: 'approved' | 'missing';
  supportedProperties: readonly string[];
  approvalReference: string | null;
  canonicalPayloadHash: string;
}>;
export type EmpiricalAcceptancePolicy = Readonly<{
  policyId: string;
  policyVersion: string;
  status: 'approved' | 'missing';
  minimumSamples: Readonly<
    Record<'ifp1' | 'ifp2' | 'ifp3' | 'ifp4' | 'ifp5' | 'ifp6' | 'ifp7', number>
  >;
  requiredMetrics: Readonly<
    Record<'ifp1' | 'ifp2' | 'ifp3' | 'ifp4' | 'ifp5' | 'ifp6' | 'ifp7', readonly string[]>
  >;
  approvalReference: string | null;
  canonicalPayloadHash: string;
}>;
export type FrozenCaseResult = Readonly<{
  caseResultId: string;
  caseId: string;
  eventInstanceId: string;
  decisionTimeEvidenceHash: string;
  outputs: EngineOutputs;
  canonicalOutputHashes: readonly string[];
  frozenAt: string;
  outcome: EvaluationOutcome;
  canonicalPayloadHash: string;
}>;
export type ResidualRisk = Readonly<{
  riskId: string;
  scope: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: readonly string[];
  affectedAssets: readonly string[];
  eventClasses: readonly string[];
  horizons: readonly string[];
  classification:
    | 'empirical_limitation'
    | 'data_gap'
    | 'reasoning_correction_required'
    | 'calibration_candidate'
    | 'external_environment_dependency';
  resolutionState: string;
  blocksAcceptance: boolean;
  owner: string;
  canonicalPayloadHash: string;
}>;
export type AcceptanceRecord = Readonly<{
  acceptanceRunId: string;
  acceptanceRunFamilyId: string;
  policyVersion: typeof INTELLIGENCE_ACCEPTANCE_POLICY_VERSION;
  datasetId: string;
  certificationId: string | null;
  splitId: string | null;
  configurationVersionId: string;
  evidenceIntegrityGate: 'pass' | 'fail';
  mandatoryCoverageGate: 'pass' | 'fail';
  empiricalIntelligenceGate: 'pass' | 'fail' | 'not_evaluated';
  empiricalEngineStates: Readonly<
    Record<'ifp1' | 'ifp2' | 'ifp3' | 'ifp4' | 'ifp5' | 'ifp6' | 'ifp7', EmpiricalEngineState>
  >;
  state: 'blocked' | 'evidence_ready' | 'accepted';
  productionAcceptance: boolean;
  reasonCodes: readonly string[];
  caseResultHashes: readonly string[];
  coverageDecisions: readonly CoverageDecision[];
  engineDiagnostics: Readonly<Record<string, unknown>>;
  crossEngineViolations: readonly string[];
  unexplainedZeroCount: number;
  rollbackEvidenceId: string | null;
  calibrationDecision: 'no_change' | 'candidate_proposed' | 'approved_applied';
  residualRisks: readonly ResidualRisk[];
  createdAt: string;
  canonicalPayloadHash: string;
}>;
export type AcceptanceBundle = Readonly<{
  run: AcceptanceRecord;
  cases: readonly FrozenCaseResult[];
  coverage: readonly CoverageDecision[];
  risks: readonly ResidualRisk[];
  rollback: RollbackEvidence;
  referenceLinks: readonly { kind: AcceptanceRecordKind; id: string }[];
}>;
export type AcceptanceRecordKind =
  | 'dataset_manifest'
  | 'dataset_certification'
  | 'split_manifest'
  | 'configuration_version'
  | 'calibration_trial'
  | 'holdout_lifecycle'
  | 'case_result'
  | 'coverage_decision'
  | 'residual_risk'
  | 'rollback_evidence'
  | 'acceptance_run';
export type AcceptanceEntityMap = {
  dataset_manifest: DatasetManifest;
  dataset_certification: DatasetCertification;
  split_manifest: SplitManifest;
  configuration_version: ConfigurationVersion;
  calibration_trial: CalibrationTrial;
  holdout_lifecycle: HoldoutLifecycle;
  case_result: FrozenCaseResult;
  coverage_decision: CoverageDecision;
  residual_risk: ResidualRisk;
  rollback_evidence: RollbackEvidence;
  acceptance_run: AcceptanceRecord;
};
