import type { SnapshotDomainKind, SnapshotFreshnessState } from '@elceo/types';

export const SNAPSHOT_REFRESH_DOMAIN_ORDER: readonly SnapshotDomainKind[] = [
  'journal_influence',
  'analytics',
  'coaching',
  'portfolio',
  'workspace'
] as const;

export const SNAPSHOT_FRESHNESS_SEVERITY_DOMAIN_ORDER: readonly SnapshotDomainKind[] = [
  'workspace',
  'portfolio',
  'coaching',
  'analytics',
  'journal_influence'
] as const;

export const FRESHNESS_STATE_PRIORITY: Record<SnapshotFreshnessState, number> = {
  failed: 0,
  stale: 1,
  missing: 2,
  fresh: 3
};
