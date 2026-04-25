import type { CanonicalAssetSymbol, Timeframe } from './events';

export const SNAPSHOT_DOMAIN_KINDS = ['journal_influence', 'analytics', 'coaching', 'portfolio', 'workspace'] as const;
export type SnapshotDomainKind = (typeof SNAPSHOT_DOMAIN_KINDS)[number];

export const SNAPSHOT_REFRESH_TRIGGER_KINDS = [
  'manual',
  'scheduled',
  'journal_case_changed',
  'journal_case_reviewed',
  'portfolio_changed',
  'reasoning_completed',
  'notification_feedback'
] as const;
export type SnapshotRefreshTriggerKind = (typeof SNAPSHOT_REFRESH_TRIGGER_KINDS)[number];

export const SNAPSHOT_FRESHNESS_STATES = ['fresh', 'stale', 'missing', 'failed'] as const;
export type SnapshotFreshnessState = (typeof SNAPSHOT_FRESHNESS_STATES)[number];

export const SNAPSHOT_DEPENDENCY_STATES = ['satisfied', 'missing', 'failed', 'not_required'] as const;
export type SnapshotDependencyState = (typeof SNAPSHOT_DEPENDENCY_STATES)[number];

export const SNAPSHOT_REFRESH_RUN_STATUSES = ['success', 'partial_success', 'failed'] as const;
export type SnapshotRefreshRunStatus = (typeof SNAPSHOT_REFRESH_RUN_STATUSES)[number];

export type SnapshotRefreshSubjectKind = 'user' | 'workspace' | 'ops';

export type DomainRefreshResult = {
  domain: SnapshotDomainKind;
  status: SnapshotRefreshRunStatus | 'skipped';
  previousFreshnessState: SnapshotFreshnessState | null;
  nextFreshnessState: SnapshotFreshnessState;
  snapshotId: string | null;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  dependencyStatus: Record<string, SnapshotDependencyState>;
  warnings: string[];
  failureReason: string | null;
};

export type SnapshotRefreshRunReport = {
  refreshRunId: string;
  subjectKind: SnapshotRefreshSubjectKind;
  subjectId: string;
  triggerKind: SnapshotRefreshTriggerKind;
  generatedAt: string;
  overallStatus: SnapshotRefreshRunStatus;
  domainResults: DomainRefreshResult[];
  refreshedDomains: SnapshotDomainKind[];
  failedDomains: SnapshotDomainKind[];
  staleDomains: SnapshotDomainKind[];
  warnings: string[];
  createdAt: string;
};

export type SnapshotFreshnessRecord = {
  freshnessId: string;
  domain: SnapshotDomainKind;
  subjectKind: SnapshotRefreshSubjectKind;
  subjectId: string;
  assetScope: CanonicalAssetSymbol | '*';
  timeframeScope: Timeframe | '*';
  latestSnapshotId: string | null;
  freshnessState: SnapshotFreshnessState;
  dependencyState: SnapshotDependencyState;
  snapshotGeneratedAt: string | null;
  evaluatedAt: string;
  ageMinutes: number | null;
  maxFreshMinutes: number;
  failureReason: string | null;
  updatedAt: string;
};

export type RefreshAttentionSummary = {
  subjectKind: SnapshotRefreshSubjectKind;
  subjectId: string;
  generatedAt: string;
  freshCount: number;
  staleCount: number;
  missingCount: number;
  failedCount: number;
  mostCriticalDomain: SnapshotDomainKind | null;
  overallFreshnessState: SnapshotFreshnessState;
};
