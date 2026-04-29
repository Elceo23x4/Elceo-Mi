import type { AdminAuditEvent, AdminAuditTimeline } from '@elceo/types';
import type { OpsJobRunRepository, SnapshotRefreshRunRepository } from '../persistence/contracts';
import { ADMIN_AUDIT_DEFAULT_LIMIT } from './constants';

export async function getAdminAuditTimeline(
  refreshRepo: SnapshotRefreshRunRepository,
  opsRepo: OpsJobRunRepository,
  limit = ADMIN_AUDIT_DEFAULT_LIMIT
): Promise<AdminAuditTimeline> {
  const [refreshRuns, opsRuns] = await Promise.all([
    refreshRepo.listRecentRuns('ops', 'global', 50),
    opsRepo.listRecentRuns({ limit: 50 })
  ]);
  const events: AdminAuditEvent[] = [];
  for (const r of refreshRuns) {
    events.push({
      eventId: `refresh|${r.refreshRunId}`,
      kind: 'refresh_run',
      severity: r.overallStatus === 'failed' ? 'error' : 'info',
      occurredAt: r.generatedAt,
      title: 'Refresh run completed',
      summary: `Refresh run ${r.overallStatus}`,
      subjectKind: r.subjectKind,
      subjectId: r.subjectId,
      linkedRunId: r.refreshRunId,
      linkedEntityId: null,
      linkedSnapshotId: null,
      metadataJson: JSON.stringify({ status: r.overallStatus, triggerKind: r.triggerKind })
    });
  }
  for (const r of opsRuns) {
    events.push({
      eventId: `ops|${r.runId}`,
      kind: 'ops_run',
      severity: r.status === 'failed' ? 'critical' : r.status === 'partial_success' ? 'warning' : 'info',
      occurredAt: r.createdAt,
      title: r.status === 'skipped' ? 'Ops job blocked by active lease' : 'Ops run persisted',
      summary: `Ops ${r.jobKind} ${r.status}`,
      subjectKind: 'ops',
      subjectId: r.scopeKey,
      linkedRunId: r.runId,
      linkedEntityId: null,
      linkedSnapshotId: null,
      metadataJson: JSON.stringify({ jobKind: r.jobKind, status: r.status })
    });
  }
  const dedup = new Map(events.map((e) => [e.eventId, e]));
  const sorted = [...dedup.values()]
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || a.eventId.localeCompare(b.eventId))
    .slice(0, limit);
  return { generatedAt: new Date().toISOString(), events: sorted };
}
