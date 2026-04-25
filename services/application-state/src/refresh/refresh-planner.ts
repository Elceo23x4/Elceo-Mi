import type { SnapshotDomainKind, SnapshotRefreshTriggerKind } from '@elceo/types';
import type { PersistedSnapshotFreshnessRecord } from '../persistence/contracts';
import { SNAPSHOT_REFRESH_DOMAIN_ORDER } from './constants';
import { expandDependentsRecursively } from './dependency-graph';

export type RefreshPlan = {
  subjectKind: 'user' | 'workspace' | 'ops';
  subjectId: string;
  triggerKind: SnapshotRefreshTriggerKind;
  asOfIso: string;
  baseDomains: SnapshotDomainKind[];
  plannedDomains: SnapshotDomainKind[];
};

function staleOrMissingDomains(currentFreshnessRecords: PersistedSnapshotFreshnessRecord[]): SnapshotDomainKind[] {
  const byDomain = new Map<SnapshotDomainKind, PersistedSnapshotFreshnessRecord>();
  for (const row of currentFreshnessRecords) {
    if (row.assetScope === '*' && row.timeframeScope === '*' && !byDomain.has(row.domain)) {
      byDomain.set(row.domain, row);
    }
  }

  return SNAPSHOT_REFRESH_DOMAIN_ORDER.filter((domain) => {
    const row = byDomain.get(domain);
    if (!row) return true;
    return row.freshnessState === 'stale' || row.freshnessState === 'missing';
  });
}

function baseDomainsForTrigger(triggerKind: SnapshotRefreshTriggerKind, currentFreshnessRecords: PersistedSnapshotFreshnessRecord[]): SnapshotDomainKind[] {
  switch (triggerKind) {
    case 'manual':
      return [...SNAPSHOT_REFRESH_DOMAIN_ORDER];
    case 'scheduled':
      return staleOrMissingDomains(currentFreshnessRecords);
    case 'journal_case_changed':
    case 'journal_case_reviewed':
      return ['journal_influence', 'analytics'];
    case 'portfolio_changed':
      return ['portfolio'];
    case 'reasoning_completed':
    case 'notification_feedback':
      return ['workspace'];
    default:
      return [];
  }
}

export function buildRefreshPlan(
  subjectKind: 'user' | 'workspace' | 'ops',
  subjectId: string,
  triggerKind: SnapshotRefreshTriggerKind,
  asOfIso: string,
  currentFreshnessRecords: PersistedSnapshotFreshnessRecord[]
): RefreshPlan {
  const baseDomains = baseDomainsForTrigger(triggerKind, currentFreshnessRecords);
  const expanded = triggerKind === 'reasoning_completed' || triggerKind === 'notification_feedback'
    ? baseDomains
    : expandDependentsRecursively(baseDomains);

  const planned = SNAPSHOT_REFRESH_DOMAIN_ORDER.filter((domain) => expanded.includes(domain));

  return {
    subjectKind,
    subjectId,
    triggerKind,
    asOfIso,
    baseDomains,
    plannedDomains: planned
  };
}
