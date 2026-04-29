export type IngestionRunStatus = 'succeeded' | 'partial_success' | 'failed' | 'skipped';
import type { OpsJobKind, OpsJobRunStatus } from './ops-runtime';
import type { SnapshotDomainKind, SnapshotRefreshRunStatus } from './refresh-runtime';

export type AdminHealthState = 'healthy' | 'attention_needed' | 'degraded' | 'critical';
export type AdminComponentStatus = 'healthy' | 'stale' | 'degraded' | 'failed' | 'unknown';

export type AdminSystemSummary = {
  generatedAt: string;
  overallHealth: AdminHealthState;
  ingestionStatus: AdminComponentStatus;
  reasoningStatus: AdminComponentStatus;
  notificationsStatus: AdminComponentStatus;
  refreshStatus: AdminComponentStatus;
  opsStatus: AdminComponentStatus;
  workspaceStatus: AdminComponentStatus;
  blockedOpsRunCount: number;
  failedOpsRunCount: number;
  staleFreshnessCount: number;
  failedFreshnessCount: number;
  degradedNotificationTargetCount: number;
  criticalReceiptCount: number;
  latestRefreshRunStatus: SnapshotRefreshRunStatus | null;
  latestOpsRunStatus: OpsJobRunStatus | null;
  latestIngestionRunStatus: IngestionRunStatus | null;
};

export type AdminRuntimeSnapshot = { snapshotId: string; summary: AdminSystemSummary; createdAt: string };
export type AdminAuditEventKind = 'ingestion_run'|'refresh_run'|'ops_run'|'reasoning_run'|'notification_decision'|'notification_outbox'|'notification_receipt'|'notification_feedback'|'journal_case'|'journal_influence'|'analytics_snapshot'|'coaching_snapshot'|'portfolio_snapshot'|'workspace_snapshot';
export type AdminAuditSeverity = 'info'|'warning'|'error'|'critical';
export type AdminAuditEvent = { eventId:string; kind:AdminAuditEventKind; severity:AdminAuditSeverity; occurredAt:string; title:string; summary:string; subjectKind:'user'|'workspace'|'ops'|'global'; subjectId:string; linkedRunId:string|null; linkedEntityId:string|null; linkedSnapshotId:string|null; metadataJson:string };
export type AdminAuditTimeline = { generatedAt:string; events: AdminAuditEvent[] };

export type AdminProviderCapabilitySummary = { generatedAt:string; notificationProviders:Array<{providerKind:string; configured:boolean; enabled:boolean; capabilityStatus:AdminComponentStatus; reasons:string[]}>; ingestionProviders:Array<{providerName:string; category:string; configured:boolean; enabled:boolean; capabilityStatus:AdminComponentStatus; reasons:string[]}> };
export type AdminFreshnessSummary = { generatedAt:string; totalDomains:number; freshCount:number; staleCount:number; missingCount:number; failedCount:number; domainsNeedingRefresh: SnapshotDomainKind[] };
export type AdminOpsSummary = { generatedAt:string; totalRecentRuns:number; failedRecentRuns:number; partialRecentRuns:number; blockedRecentRuns:number; staleLeaseCount:number; mostRecentFailureJobKind: OpsJobKind | null };
