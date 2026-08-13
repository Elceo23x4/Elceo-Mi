import type {
  CalibrationTrial,
  ConfigurationVersion,
  HoldoutLifecycle,
  RollbackEvidence,
} from './contracts';
import { canonicalHash } from './identity';
const required = ['ifp1', 'ifp2', 'ifp3', 'ifp4', 'ifp5', 'ifp6', 'ifp7'] as const;
export function createConfiguration(
  draft: Omit<ConfigurationVersion, 'parameterSnapshotHash' | 'canonicalPayloadHash'>,
): ConfigurationVersion {
  const { parameterSnapshotHash: ignoredParameter, canonicalPayloadHash: ignoredHash, ...domainDraft } = draft as ConfigurationVersion;
  void ignoredParameter; void ignoredHash;
  for (const key of required)
    if (!domainDraft.policyVersions[key]) throw new Error('incomplete_ifp_policy_snapshot');
  const parameterSnapshotHash = canonicalHash(domainDraft.parameterSnapshot),
    body = { ...domainDraft, parameterSnapshotHash };
  return Object.freeze({ ...body, canonicalPayloadHash: canonicalHash(body) });
}
export function createTrial(
  draft: Omit<CalibrationTrial, 'canonicalPayloadHash'>,
): CalibrationTrial {
  const { canonicalPayloadHash: ignoredHash, ...domainDraft } = draft as CalibrationTrial;
  void ignoredHash;
  return Object.freeze({ ...domainDraft, canonicalPayloadHash: canonicalHash(domainDraft) });
}
export function createHoldoutLifecycle(
  draft: Omit<
    HoldoutLifecycle,
    'state' | 'openedAt' | 'completedAt' | 'failureReason' | 'canonicalPayloadHash'
  >,
): HoldoutLifecycle {
  const { state: ignoredState, openedAt: ignoredOpened, completedAt: ignoredCompleted, failureReason: ignoredFailure, canonicalPayloadHash: ignoredHash, ...domainDraft } = draft as HoldoutLifecycle;
  void ignoredState; void ignoredOpened; void ignoredCompleted; void ignoredFailure; void ignoredHash;
  const body = {
    ...domainDraft,
    state: 'selected' as const,
    openedAt: null,
    completedAt: null,
    failureReason: null,
  };
  return Object.freeze({ ...body, canonicalPayloadHash: canonicalHash(body) });
}
export function createRollbackEvidence(
  draft: Omit<
    RollbackEvidence,
    'rollbackEvidenceId' | 'reproductionMatch' | 'canonicalPayloadHash'
  >,
): RollbackEvidence {
  const { rollbackEvidenceId: ignoredId, reproductionMatch: ignoredMatch, canonicalPayloadHash: ignoredHash, ...domainDraft } = draft as RollbackEvidence;
  void ignoredId; void ignoredMatch; void ignoredHash;
  if (!domainDraft.reproductions.length) throw new Error('rollback_replay_evidence_empty');
  if (new Set(domainDraft.reproductions.map((row) => row.caseId)).size !== domainDraft.reproductions.length)
    throw new Error('rollback_replay_case_duplicate');
  const reproductions = [...domainDraft.reproductions]
    .sort((a, b) => a.caseId.localeCompare(b.caseId))
    .map((row) => ({
      ...row,
      match: row.previousCanonicalOutputHash === row.restoredCanonicalOutputHash,
    }));
  const body = {
    ...domainDraft,
    reproductions,
    reproductionMatch: reproductions.every((row) => row.match),
  };
  const hash = canonicalHash(body);
  return Object.freeze({
    ...body,
    rollbackEvidenceId: `ifp8-rollback-${hash.slice(0, 32)}`,
    canonicalPayloadHash: hash,
  });
}
export function verifyRollback(
  evidence: RollbackEvidence,
  previous: ConfigurationVersion,
  restored: ConfigurationVersion,
): void {
  if (
    evidence.restoredConfigurationVersionId !== restored.configurationVersionId ||
    evidence.expectedPreviousParameterSnapshotHash !== previous.parameterSnapshotHash ||
    evidence.restoredParameterSnapshotHash !== restored.parameterSnapshotHash ||
    previous.parameterSnapshotHash !== restored.parameterSnapshotHash ||
    !evidence.reproductions.length ||
    !evidence.reproductionMatch ||
    evidence.reproductions.some(
      (row) =>
        !row.caseId ||
        !row.decisionTimeEvidenceHash ||
        !row.match ||
        row.previousCanonicalOutputHash !== row.restoredCanonicalOutputHash,
    ) ||
    new Set(evidence.reproductions.map((row) => row.caseId)).size !== evidence.reproductions.length
  )
    throw new Error('rollback_reproduction_invalid');
}
export function deriveCalibrationDecision(
  configuration: ConfigurationVersion,
  trial: CalibrationTrial | null,
  partitionHash: string,
): 'no_change' | 'candidate_proposed' | 'approved_applied' {
  if (configuration.changeClass === 'no_change') return 'no_change';
  if (configuration.status !== 'approved') return 'candidate_proposed';
  if (
    !configuration.parentConfigurationVersionId ||
    !configuration.approvedBy ||
    !configuration.approvalReference ||
    !trial ||
    trial.configurationVersionId !== configuration.configurationVersionId ||
    trial.parentConfigurationVersionId !== configuration.parentConfigurationVersionId ||
    trial.calibrationPartitionHash !== partitionHash
  )
    throw new Error('approved_calibration_evidence_invalid');
  return 'approved_applied';
}
