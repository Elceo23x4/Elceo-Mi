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
  for (const key of required)
    if (!draft.policyVersions[key]) throw new Error('incomplete_ifp_policy_snapshot');
  const parameterSnapshotHash = canonicalHash(draft.parameterSnapshot),
    body = { ...draft, parameterSnapshotHash };
  return Object.freeze({ ...body, canonicalPayloadHash: canonicalHash(body) });
}
export function createTrial(
  draft: Omit<CalibrationTrial, 'canonicalPayloadHash'>,
): CalibrationTrial {
  return Object.freeze({ ...draft, canonicalPayloadHash: canonicalHash(draft) });
}
export function createHoldoutLifecycle(
  draft: Omit<HoldoutLifecycle, 'state' | 'openedAt' | 'completedAt' | 'canonicalPayloadHash'>,
): HoldoutLifecycle {
  const body = { ...draft, state: 'selected' as const, openedAt: null, completedAt: null };
  return Object.freeze({ ...body, canonicalPayloadHash: canonicalHash(body) });
}
export function createRollbackEvidence(
  draft: Omit<RollbackEvidence, 'rollbackEvidenceId' | 'canonicalPayloadHash'>,
): RollbackEvidence {
  const body = {
    ...draft,
    replayCaseIds: [...draft.replayCaseIds].sort(),
    previousCanonicalOutputHashes: [...draft.previousCanonicalOutputHashes].sort(),
    restoredCanonicalOutputHashes: [...draft.restoredCanonicalOutputHashes].sort(),
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
    !evidence.reproductionMatch ||
    JSON.stringify(evidence.previousCanonicalOutputHashes) !==
      JSON.stringify(evidence.restoredCanonicalOutputHashes)
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
