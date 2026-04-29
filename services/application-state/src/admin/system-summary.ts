import type { AdminComponentStatus, AdminHealthState, AdminSystemSummary } from '@elceo/types';
import type {
  OpsJobLeaseRepository,
  OpsJobRunRepository,
  SnapshotFreshnessRepository,
  SnapshotRefreshRunRepository
} from '../persistence/contracts';

function mapComponentStatus(input: { hasData: boolean; failed: boolean; stale: boolean; degraded: boolean }): AdminComponentStatus {
  if (input.failed) return 'failed';
  if (input.stale) return 'stale';
  if (input.degraded) return 'degraded';
  if (input.hasData) return 'healthy';
  return 'unknown';
}

function mapOverallHealth(statuses: AdminComponentStatus[], failedFreshnessCount: number): AdminHealthState {
  const failedCount = statuses.filter((s) => s === 'failed').length;
  const staleOrDegradedCount = statuses.filter((s) => s === 'stale' || s === 'degraded').length;
  if (failedCount > 0 || failedFreshnessCount > 0) return 'critical';
  if (staleOrDegradedCount >= 2) return 'degraded';
  if (staleOrDegradedCount === 1) return 'attention_needed';
  return 'healthy';
}

export async function getAdminSystemSummary(
  refreshRunRepo: SnapshotRefreshRunRepository,
  freshRepo: SnapshotFreshnessRepository,
  opsRunRepo: OpsJobRunRepository,
  opsLeaseRepo: OpsJobLeaseRepository,
  subjectKind: 'user' | 'workspace' | 'ops',
  subjectId: string
): Promise<AdminSystemSummary> {
  const generatedAt = new Date().toISOString();
  const [latestRefresh, latestOps, freshRows, opsRuns, staleLeases] = await Promise.all([
    refreshRunRepo.getLatestRun(subjectKind, subjectId),
    opsRunRepo.getLatestRun('snapshot_refresh', 'subject', subjectId),
    freshRepo.listFreshnessForSubject(subjectKind, subjectId),
    opsRunRepo.listRecentRuns({ limit: 100 }),
    opsLeaseRepo.listStaleLeases(generatedAt)
  ]);

  const failedFreshnessCount = freshRows.filter((r) => r.freshnessState === 'failed').length;
  const staleFreshnessCount = freshRows.filter((r) => r.freshnessState === 'stale').length;
  const failedOpsRunCount = opsRuns.filter((r) => r.status === 'failed').length;
  const blockedOpsRunCount = opsRuns.filter((r) => r.status === 'skipped').length;

  const refreshStatus = mapComponentStatus({
    hasData: latestRefresh !== null,
    failed: latestRefresh?.overallStatus === 'failed',
    stale: staleFreshnessCount > 0,
    degraded: latestRefresh?.overallStatus === 'partial_success'
  });
  const opsStatus = mapComponentStatus({
    hasData: latestOps !== null,
    failed: failedOpsRunCount > 0,
    stale: staleLeases.length > 0,
    degraded: blockedOpsRunCount > 0 || opsRuns.some((r) => r.status === 'partial_success')
  });
  const workspaceStatus = mapComponentStatus({
    hasData: freshRows.length > 0,
    failed: failedFreshnessCount > 0,
    stale: staleFreshnessCount > 0,
    degraded: freshRows.some((r) => r.freshnessState === 'missing')
  });

  const ingestionStatus: AdminComponentStatus = 'unknown';
  const reasoningStatus: AdminComponentStatus = 'unknown';
  const notificationsStatus: AdminComponentStatus = 'unknown';
  const overallHealth = mapOverallHealth(
    [ingestionStatus, reasoningStatus, notificationsStatus, refreshStatus, opsStatus, workspaceStatus],
    failedFreshnessCount
  );

  return {
    generatedAt,
    overallHealth,
    ingestionStatus,
    reasoningStatus,
    notificationsStatus,
    refreshStatus,
    opsStatus,
    workspaceStatus,
    blockedOpsRunCount,
    failedOpsRunCount,
    staleFreshnessCount,
    failedFreshnessCount,
    degradedNotificationTargetCount: 0,
    criticalReceiptCount: 0,
    latestRefreshRunStatus: latestRefresh?.overallStatus ?? null,
    latestOpsRunStatus: latestOps?.status ?? null,
    latestIngestionRunStatus: null
  };
}
