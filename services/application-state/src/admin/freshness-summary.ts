import type { AdminFreshnessSummary } from '@elceo/types';
import type { SnapshotFreshnessRepository } from '../persistence/contracts';
import { FRESHNESS_STATE_PRIORITY, SNAPSHOT_FRESHNESS_SEVERITY_DOMAIN_ORDER } from '../refresh/constants';

export async function getAdminFreshnessSummary(
  repository: SnapshotFreshnessRepository,
  subjectKind: 'user' | 'workspace' | 'ops',
  subjectId: string
): Promise<AdminFreshnessSummary> {
  const rows = await repository.listFreshnessForSubject(subjectKind, subjectId);
  const freshCount = rows.filter((r) => r.freshnessState === 'fresh').length;
  const staleCount = rows.filter((r) => r.freshnessState === 'stale').length;
  const missingCount = rows.filter((r) => r.freshnessState === 'missing').length;
  const failedCount = rows.filter((r) => r.freshnessState === 'failed').length;

  const domainsNeedingRefresh = rows
    .filter((r) => r.freshnessState !== 'fresh')
    .sort(
      (a, b) =>
        FRESHNESS_STATE_PRIORITY[a.freshnessState] - FRESHNESS_STATE_PRIORITY[b.freshnessState] ||
        SNAPSHOT_FRESHNESS_SEVERITY_DOMAIN_ORDER.indexOf(a.domain) - SNAPSHOT_FRESHNESS_SEVERITY_DOMAIN_ORDER.indexOf(b.domain)
    )
    .map((r) => r.domain);

  return {
    generatedAt: new Date().toISOString(),
    totalDomains: rows.length,
    freshCount,
    staleCount,
    missingCount,
    failedCount,
    domainsNeedingRefresh
  };
}
