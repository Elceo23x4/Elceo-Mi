import type { IngestionTickJobAdapter, NotificationDispatchJobAdapter, NotificationFeedbackJobAdapter, NotificationVerificationExpiryJobAdapter, SnapshotRefreshJobAdapter, WorkspaceMaintenanceJobAdapter } from './job-contracts';

export function createDefaultSnapshotRefreshAdapter(): SnapshotRefreshJobAdapter {
  return {
    run: async (subjectKind, subjectId, triggerKind, generatedAt) => ({
      refreshRunId: `ops-refresh-${subjectKind}-${subjectId}-${generatedAt ?? 'now'}`,
      subjectKind,
      subjectId,
      triggerKind,
      generatedAt: generatedAt ?? new Date().toISOString(),
      overallStatus: 'success',
      domainResults: [],
      refreshedDomains: [],
      failedDomains: [],
      staleDomains: [],
      warnings: ['default_snapshot_refresh_adapter_noop'],
      createdAt: generatedAt ?? new Date().toISOString()
    })
  };
}

export function createDefaultWorkspaceMaintenanceAdapter(): WorkspaceMaintenanceJobAdapter { return { run: async () => ({ refreshedWorkspace: false, workspaceSnapshotId: null }) }; }
export function createDefaultNotificationDispatchAdapter(): NotificationDispatchJobAdapter { return { run: async () => ({ dispatchedCount: 0, failedCount: 0, deadCount: 0 }) }; }
export function createDefaultNotificationVerificationExpiryAdapter(): NotificationVerificationExpiryJobAdapter { return { run: async () => ({ expiredCount: 0 }) }; }
export function createDefaultNotificationFeedbackAdapter(): NotificationFeedbackJobAdapter { return { run: async () => ({ correlated: false, receiptCount: 0, degradedTargetCount: 0, uncorrelatedPersisted: true }) }; }
export function createDefaultIngestionTickAdapter(): IngestionTickJobAdapter { return { run: async () => ({ completed: true }) }; }
