import type { RefreshAttentionSummary, SnapshotDomainKind, SnapshotFreshnessRecord, SnapshotFreshnessState } from '@elceo/types';
import { validateRefreshAttentionSummary } from '@elceo/schemas';
import type { PersistedSnapshotFreshnessRecord, SnapshotFreshnessRepository } from '../persistence/contracts';
import { createId, nowIso } from '../portfolio/helpers';
import { SNAPSHOT_FRESHNESS_SEVERITY_DOMAIN_ORDER, SNAPSHOT_REFRESH_DOMAIN_ORDER } from './constants';
import { evaluateSnapshotFreshness } from './freshness-policy';

function toCanonicalRow(row: PersistedSnapshotFreshnessRecord): SnapshotFreshnessRecord {
  return { ...row };
}

function findByDomain(rows: PersistedSnapshotFreshnessRecord[], domain: SnapshotDomainKind): PersistedSnapshotFreshnessRecord | null {
  return rows.find((row) => row.domain === domain && row.assetScope === '*' && row.timeframeScope === '*') ?? null;
}

function overallFromCounts(failedCount: number, staleCount: number, missingCount: number): SnapshotFreshnessState {
  if (failedCount > 0) return 'failed';
  if (staleCount > 0) return 'stale';
  if (missingCount > 0) return 'missing';
  return 'fresh';
}

function mostCriticalDomain(rows: PersistedSnapshotFreshnessRecord[]): SnapshotDomainKind | null {
  const findDomain = (state: SnapshotFreshnessState): SnapshotDomainKind | null => {
    for (const domain of SNAPSHOT_FRESHNESS_SEVERITY_DOMAIN_ORDER) {
      if (rows.some((row) => row.domain === domain && row.freshnessState === state && row.assetScope === '*' && row.timeframeScope === '*')) return domain;
    }
    return null;
  };

  return findDomain('failed') ?? findDomain('stale') ?? findDomain('missing') ?? null;
}

export class SnapshotFreshnessService {
  constructor(private readonly freshnessRepository: SnapshotFreshnessRepository) {}

  async recomputeFreshnessForSubject(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    evaluatedAt: string = nowIso()
  ): Promise<SnapshotFreshnessRecord[]> {
    const current = await this.freshnessRepository.listFreshnessForSubject(subjectKind, subjectId);

    for (const domain of SNAPSHOT_REFRESH_DOMAIN_ORDER) {
      const existing = findByDomain(current, domain);
      const evaluated = evaluateSnapshotFreshness({
        domain,
        latestSnapshotGeneratedAt: existing?.snapshotGeneratedAt ?? null,
        evaluatedAt,
        lastRefreshFailed: (existing?.freshnessState ?? 'missing') === 'failed',
        dependencyState: existing?.dependencyState ?? 'not_required'
      });

      const next: PersistedSnapshotFreshnessRecord = {
        freshnessId: existing?.freshnessId ?? createId('sfr'),
        domain,
        subjectKind,
        subjectId,
        assetScope: '*',
        timeframeScope: '*',
        latestSnapshotId: existing?.latestSnapshotId ?? null,
        freshnessState: evaluated.freshnessState,
        dependencyState: existing?.dependencyState ?? 'not_required',
        snapshotGeneratedAt: existing?.snapshotGeneratedAt ?? null,
        evaluatedAt,
        ageMinutes: evaluated.ageMinutes,
        maxFreshMinutes: evaluated.maxFreshMinutes,
        failureReason: evaluated.freshnessState === 'failed' ? existing?.failureReason ?? 'freshness_recompute_failed_state' : null,
        updatedAt: evaluatedAt
      };
      await this.freshnessRepository.upsertFreshness(next);
    }

    const updated = await this.freshnessRepository.listFreshnessForSubject(subjectKind, subjectId);
    return updated.filter((row) => row.assetScope === '*' && row.timeframeScope === '*').map(toCanonicalRow);
  }

  async getLatestRefreshAttentionSummary(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    evaluatedAt: string = nowIso()
  ): Promise<RefreshAttentionSummary> {
    const rows = (await this.freshnessRepository.listFreshnessForSubject(subjectKind, subjectId)).filter((row) => row.assetScope === '*' && row.timeframeScope === '*');

    const freshCount = rows.filter((row) => row.freshnessState === 'fresh').length;
    const staleCount = rows.filter((row) => row.freshnessState === 'stale').length;
    const missingCount = rows.filter((row) => row.freshnessState === 'missing').length;
    const failedCount = rows.filter((row) => row.freshnessState === 'failed').length;

    const summary: RefreshAttentionSummary = {
      subjectKind,
      subjectId,
      generatedAt: evaluatedAt,
      freshCount,
      staleCount,
      missingCount,
      failedCount,
      mostCriticalDomain: mostCriticalDomain(rows),
      overallFreshnessState: overallFromCounts(failedCount, staleCount, missingCount)
    };

    const validated = validateRefreshAttentionSummary(summary);
    if (validated.ok === false) throw new Error(`invalid_refresh_attention_summary:${validated.errors.join('; ')}`);
    return validated.value;
  }
}
