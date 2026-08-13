import type { AcceptanceEntityMap, AcceptanceRecordKind } from './contracts';
import { canonicalHash } from './identity';
const derivedField: Partial<Record<AcceptanceRecordKind, string>> = {
  dataset_certification: 'certificationId',
  split_manifest: 'splitId',
  case_result: 'caseResultId',
  coverage_decision: 'coverageDecisionId',
  rollback_evidence: 'rollbackEvidenceId',
  acceptance_run: 'acceptanceRunId',
};
export function validateAcceptanceEntity<K extends AcceptanceRecordKind>(
  kind: K,
  id: string,
  value: AcceptanceEntityMap[K],
): void {
  const record = { ...(value as unknown as Record<string, unknown>) };
  const hash = String(record.canonicalPayloadHash);
  delete record.canonicalPayloadHash;
  const field = derivedField[kind];
  if (field) delete record[field];
  if (canonicalHash(record) !== hash) throw new Error(`invalid_${kind}_canonical_hash`);
  if (
    field &&
    ['case_result', 'coverage_decision', 'rollback_evidence', 'acceptance_run'].includes(kind) &&
    String((value as unknown as Record<string, unknown>)[field]) !== id
  )
    throw new Error(`invalid_${kind}_derived_id`);
}
