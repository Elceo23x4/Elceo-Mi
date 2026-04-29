import type { OpsJobKind, OpsJobRunReport, OpsJobRunStatus, OpsJobScope, OpsJobTriggerKind } from '@elceo/types';

type OpsReportInput = {
  runId: string;
  jobKind: OpsJobKind;
  triggerKind: OpsJobTriggerKind;
  scopeKind: OpsJobScope;
  scopeKey: string;
  startedAt: string;
  endedAt: string;
  warnings?: string[];
  failureReason?: string | null;
  childReportIds?: string[];
  metricsJson: string;
};

export function buildOpsMetricsJson(metrics: Record<string, unknown>): string { return JSON.stringify(metrics); }

function build(p: OpsReportInput, status: OpsJobRunStatus): OpsJobRunReport {
  return { runId: p.runId, jobKind: p.jobKind, triggerKind: p.triggerKind, scopeKind: p.scopeKind, scopeKey: p.scopeKey, startedAt: p.startedAt, endedAt: p.endedAt, durationMs: Math.max(0, Date.parse(p.endedAt) - Date.parse(p.startedAt)), status, warnings: p.warnings ?? [], failureReason: p.failureReason ?? null, childReportIds: p.childReportIds ?? [], metricsJson: p.metricsJson, createdAt: p.endedAt };
}

export const buildBlockedOpsRunReport = (p: OpsReportInput): OpsJobRunReport => build({ ...p, warnings: ['lease_blocked'] }, 'skipped');
export const buildSuccessfulOpsRunReport = (p: OpsReportInput): OpsJobRunReport => build(p, 'success');
export const buildFailedOpsRunReport = (p: OpsReportInput): OpsJobRunReport => build(p, 'failed');
export const buildPartialOpsRunReport = (p: OpsReportInput): OpsJobRunReport => build(p, 'partial_success');

export function mapMetricsForJobKind(jobKind: OpsJobKind, adapterResult: unknown): Record<string, unknown> {
  if (jobKind === 'ingestion_tick') return { completed: true };
  return typeof adapterResult === 'object' && adapterResult !== null ? (adapterResult as Record<string, unknown>) : { completed: true };
}
