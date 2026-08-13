import type { AcceptanceEntityMap, AcceptanceRecordKind } from './contracts';
import { canonicalHash, partitionHash } from './identity';
const without = <T extends Record<string, unknown>>(value: T, ...keys: string[]) =>
  Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
export function validateAcceptanceEntity<K extends AcceptanceRecordKind>(
  kind: K,
  id: string,
  value: AcceptanceEntityMap[K],
): void {
  const record = value as unknown as Record<string, unknown>,
    hash = String(record.canonicalPayloadHash),
    body = without(record, 'canonicalPayloadHash');
  const timestampFields: Record<AcceptanceRecordKind, string> = {
    dataset_manifest: 'generatedAt',
    dataset_certification: 'certifiedAt',
    split_manifest: 'createdAt',
    configuration_version: 'createdAt',
    calibration_trial: 'createdAt',
    holdout_lifecycle: 'selectedAt',
    case_result: 'frozenAt',
    coverage_decision: 'createdAt',
    residual_risk: 'createdAt',
    rollback_evidence: 'createdAt',
    acceptance_run: 'createdAt',
  };
  if (!Number.isFinite(Date.parse(String(record[timestampFields[kind]] ?? ''))))
    throw new Error(`invalid_${kind}_persistence_timestamp`);
  let hashBody = body;
  if (kind === 'dataset_certification') hashBody = without(body, 'certificationId');
  if (kind === 'split_manifest') hashBody = without(body, 'splitId');
  if (kind === 'case_result') hashBody = without(body, 'caseResultId');
  if (kind === 'coverage_decision') hashBody = without(body, 'coverageDecisionId');
  if (kind === 'rollback_evidence') hashBody = without(body, 'rollbackEvidenceId');
  if (kind === 'acceptance_run') hashBody = without(body, 'acceptanceRunId');
  if (canonicalHash(hashBody) !== hash) throw new Error(`invalid_${kind}_canonical_hash`);
  if (
    kind === 'dataset_certification' &&
    record.certificationId !== `ifp8-cert-${hash.slice(0, 32)}`
  )
    throw new Error('invalid_dataset_certification_derived_id');
  if (kind === 'split_manifest') {
    if (record.splitId !== `ifp8-split-${hash.slice(0, 32)}`)
      throw new Error('invalid_split_manifest_derived_id');
    const row = value as AcceptanceEntityMap['split_manifest'];
    if (
      row.calibrationPartitionHash !== partitionHash(row.calibrationEventIds) ||
      row.embargoPartitionHash !== partitionHash(row.embargoEventIds) ||
      row.holdoutPartitionHash !== partitionHash(row.holdoutEventIds)
    )
      throw new Error('invalid_split_manifest_partition_hash');
  }
  if (kind === 'configuration_version') {
    const row = value as AcceptanceEntityMap['configuration_version'];
    if (row.parameterSnapshotHash !== canonicalHash(row.parameterSnapshot))
      throw new Error('invalid_configuration_parameter_snapshot_hash');
  }
  if (kind === 'rollback_evidence') {
    const row = value as AcceptanceEntityMap['rollback_evidence'];
    if (
      id !== row.rollbackEvidenceId ||
      row.rollbackEvidenceId !== `ifp8-rollback-${hash.slice(0, 32)}`
    )
      throw new Error('invalid_rollback_evidence_derived_id');
    if (
      !row.reproductions.length ||
      new Set(row.reproductions.map((x) => x.caseId)).size !== row.reproductions.length ||
      row.reproductionMatch !==
        row.reproductions.every(
          (x) => x.match && x.previousCanonicalOutputHash === x.restoredCanonicalOutputHash,
        )
    )
      throw new Error('invalid_rollback_reproduction_state');
  }
  if (kind === 'case_result') {
    const row = value as AcceptanceEntityMap['case_result'];
    if (id !== row.caseResultId || row.caseResultId !== `ifp8-case-${hash.slice(0, 32)}`)
      throw new Error('invalid_case_result_derived_id');
  }
  if (kind === 'coverage_decision') {
    const row = value as AcceptanceEntityMap['coverage_decision'];
    if (
      id !== row.coverageDecisionId ||
      row.coverageDecisionId !== `ifp8-coverage-${hash.slice(0, 32)}`
    )
      throw new Error('invalid_coverage_decision_derived_id');
  }
  if (kind === 'acceptance_run') {
    const row = value as AcceptanceEntityMap['acceptance_run'];
    if (id !== row.acceptanceRunId || row.acceptanceRunId !== `ifp8-${hash.slice(0, 32)}`)
      throw new Error('invalid_acceptance_run_derived_id');
  }
  if (kind === 'holdout_lifecycle') {
    const row = value as AcceptanceEntityMap['holdout_lifecycle'];
    if (
      (row.state === 'selected' && (row.openedAt || row.completedAt || row.failureReason)) ||
      (row.state === 'opened' && (!row.openedAt || row.completedAt)) ||
      (['completed', 'failed'].includes(row.state) && (!row.openedAt || !row.completedAt)) ||
      (row.state === 'failed' && !row.failureReason) ||
      (row.state === 'completed' && row.failureReason)
    )
      throw new Error('invalid_holdout_lifecycle_state');
  }
}
