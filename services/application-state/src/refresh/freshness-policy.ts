import type { SnapshotDependencyState, SnapshotDomainKind, SnapshotFreshnessState } from '@elceo/types';

const FRESHNESS_WINDOWS_MINUTES: Record<SnapshotDomainKind, number> = {
  journal_influence: 1440,
  analytics: 1440,
  coaching: 1440,
  portfolio: 240,
  workspace: 120
};

export function getMaxFreshMinutesForDomain(domain: SnapshotDomainKind): number {
  return FRESHNESS_WINDOWS_MINUTES[domain];
}

export type EvaluateSnapshotFreshnessParams = {
  domain: SnapshotDomainKind;
  latestSnapshotGeneratedAt: string | null;
  evaluatedAt: string;
  lastRefreshFailed: boolean;
  dependencyState: SnapshotDependencyState;
};

export type EvaluatedSnapshotFreshness = {
  freshnessState: SnapshotFreshnessState;
  ageMinutes: number | null;
  maxFreshMinutes: number;
};

function toAgeMinutes(snapshotIso: string, evaluatedIso: string): number {
  const ageMs = Math.max(0, Date.parse(evaluatedIso) - Date.parse(snapshotIso));
  return Number((ageMs / 60000).toFixed(6));
}

export function evaluateSnapshotFreshness(params: EvaluateSnapshotFreshnessParams): EvaluatedSnapshotFreshness {
  const maxFreshMinutes = getMaxFreshMinutesForDomain(params.domain);

  if (params.dependencyState === 'failed' || params.lastRefreshFailed) {
    return { freshnessState: 'failed', ageMinutes: null, maxFreshMinutes };
  }
  if (params.latestSnapshotGeneratedAt === null) {
    return { freshnessState: 'missing', ageMinutes: null, maxFreshMinutes };
  }

  const ageMinutes = toAgeMinutes(params.latestSnapshotGeneratedAt, params.evaluatedAt);
  return {
    freshnessState: ageMinutes > maxFreshMinutes ? 'stale' : 'fresh',
    ageMinutes,
    maxFreshMinutes
  };
}
