import { validateOpsJobLeaseRecord, validateOpsJobRunReport } from '@elceo/schemas';
import type { OpsJobLeaseRecord, OpsJobRunReport } from '@elceo/types';

export const serializeOpsJobRunReport = (r: OpsJobRunReport): string => JSON.stringify(r);
export const serializeOpsJobLeaseRecord = (r: OpsJobLeaseRecord): string => JSON.stringify(r);

export function deserializeOpsJobRunReport(raw: string): OpsJobRunReport {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('malformed_json:ops_job_run_report'); }
  const result = validateOpsJobRunReport(parsed);
  if (result.ok === true) return result.value;
  throw new Error(`invalid_ops_job_run_report:${result.errors.join(';')}`);
}

export function deserializeOpsJobLeaseRecord(raw: string): OpsJobLeaseRecord {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('malformed_json:ops_job_lease_record'); }
  const result = validateOpsJobLeaseRecord(parsed);
  if (result.ok === true) return result.value;
  throw new Error(`invalid_ops_job_lease_record:${result.errors.join(';')}`);
}
