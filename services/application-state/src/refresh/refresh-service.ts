import { validateSnapshotRefreshRunReport } from '@elceo/schemas';
import type {
  DomainRefreshResult,
  SnapshotDependencyState,
  SnapshotDomainKind,
  SnapshotRefreshRunReport,
  SnapshotRefreshRunStatus,
  SnapshotRefreshTriggerKind
} from '@elceo/types';
import type {
  PersistedSnapshotFreshnessRecord,
  PersistedSnapshotRefreshRunRecord,
  SnapshotFreshnessRepository,
  SnapshotRefreshRunRepository
} from '../persistence/contracts';
import { createId, nowIso } from '../portfolio/helpers';
import { getSnapshotDomainDependencies } from './dependency-graph';
import { evaluateSnapshotFreshness } from './freshness-policy';
import type { SnapshotRefreshLoaders } from './loader-contracts';
import { buildRefreshPlan } from './refresh-planner';
import { serializeSnapshotRefreshRunReport } from './serialization';

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown_refresh_error';
}

function computeDependencyStatus(
  domain: SnapshotDomainKind,
  currentFreshness: Map<SnapshotDomainKind, PersistedSnapshotFreshnessRecord | null>,
  currentRunResults: Map<SnapshotDomainKind, DomainRefreshResult>
): Record<string, SnapshotDependencyState> {
  const dependencies = getSnapshotDomainDependencies(domain);
  if (dependencies.length === 0) return { _self: 'not_required' };

  const status: Record<string, SnapshotDependencyState> = {};
  for (const dependency of dependencies) {
    const currentRun = currentRunResults.get(dependency);
    if (currentRun) {
      status[dependency] = currentRun.status === 'failed' ? 'failed' : 'satisfied';
      continue;
    }
    const persisted = currentFreshness.get(dependency);
    if (!persisted) {
      status[dependency] = 'missing';
      continue;
    }
    if (persisted.freshnessState === 'failed') status[dependency] = 'failed';
    else if (persisted.freshnessState === 'missing') status[dependency] = 'missing';
    else status[dependency] = 'satisfied';
  }
  return status;
}

function toOverallStatus(results: DomainRefreshResult[]): SnapshotRefreshRunStatus {
  const attempted = results.filter((result) => result.status !== 'skipped');
  const failures = attempted.filter((result) => result.status === 'failed').length;
  if (attempted.length > 0 && failures === attempted.length) return 'failed';
  if (failures > 0) return 'partial_success';
  return 'success';
}

function toPersistedRunRecord(report: SnapshotRefreshRunReport): PersistedSnapshotRefreshRunRecord {
  return {
    refreshRunId: report.refreshRunId,
    subjectKind: report.subjectKind,
    subjectId: report.subjectId,
    triggerKind: report.triggerKind,
    overallStatus: report.overallStatus,
    generatedAt: report.generatedAt,
    refreshedDomainsJson: JSON.stringify(report.refreshedDomains),
    failedDomainsJson: JSON.stringify(report.failedDomains),
    staleDomainsJson: JSON.stringify(report.staleDomains),
    warningsJson: JSON.stringify(report.warnings),
    reportJson: serializeSnapshotRefreshRunReport(report),
    createdAt: report.createdAt
  };
}

function persistedRowForDomain(
  subjectKind: 'user' | 'workspace' | 'ops',
  subjectId: string,
  domain: SnapshotDomainKind,
  previous: PersistedSnapshotFreshnessRecord | null,
  evaluatedAt: string,
  latestSnapshotId: string | null,
  latestSnapshotGeneratedAt: string | null,
  dependencyState: SnapshotDependencyState,
  failed: boolean,
  failureReason: string | null
): PersistedSnapshotFreshnessRecord {
  const evaluated = evaluateSnapshotFreshness({
    domain,
    latestSnapshotGeneratedAt,
    evaluatedAt,
    lastRefreshFailed: failed,
    dependencyState
  });

  return {
    freshnessId: previous?.freshnessId ?? createId('sfr'),
    domain,
    subjectKind,
    subjectId,
    assetScope: '*',
    timeframeScope: '*',
    latestSnapshotId,
    freshnessState: evaluated.freshnessState,
    dependencyState,
    snapshotGeneratedAt: latestSnapshotGeneratedAt,
    evaluatedAt,
    ageMinutes: evaluated.ageMinutes,
    maxFreshMinutes: evaluated.maxFreshMinutes,
    failureReason: failed || evaluated.freshnessState === 'failed' ? failureReason ?? 'snapshot_refresh_failed' : null,
    updatedAt: evaluatedAt
  };
}

function aggregateDependencyState(dependencyStatus: Record<string, SnapshotDependencyState>): SnapshotDependencyState {
  const values = Object.values(dependencyStatus);
  if (values.length === 1 && values[0] === 'not_required') return 'not_required';
  if (values.some((state) => state === 'failed')) return 'failed';
  if (values.some((state) => state === 'missing')) return 'missing';
  return 'satisfied';
}

export class SnapshotRefreshService {
  constructor(
    private readonly loaders: SnapshotRefreshLoaders,
    private readonly refreshRunRepository: SnapshotRefreshRunRepository,
    private readonly freshnessRepository: SnapshotFreshnessRepository
  ) {}

  async runSnapshotRefresh(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    triggerKind: SnapshotRefreshTriggerKind,
    generatedAt: string = nowIso()
  ): Promise<SnapshotRefreshRunReport> {
    const currentFreshnessRows = (await this.freshnessRepository.listFreshnessForSubject(subjectKind, subjectId)).filter(
      (row) => row.assetScope === '*' && row.timeframeScope === '*'
    );
    const currentFreshness = new Map<SnapshotDomainKind, PersistedSnapshotFreshnessRecord | null>();
    currentFreshnessRows.forEach((row) => currentFreshness.set(row.domain, row));

    const plan = buildRefreshPlan(subjectKind, subjectId, triggerKind, generatedAt, currentFreshnessRows);

    const domainResults: DomainRefreshResult[] = [];
    const inRunResults = new Map<SnapshotDomainKind, DomainRefreshResult>();
    const warnings: string[] = [];

    for (const domain of plan.plannedDomains) {
      const startedAt = nowIso();
      const dependencyStatus = computeDependencyStatus(domain, currentFreshness, inRunResults);
      const dependencyState = aggregateDependencyState(dependencyStatus);
      const previousFreshnessState = currentFreshness.get(domain)?.freshnessState ?? null;

      let snapshotId: string | null = currentFreshness.get(domain)?.latestSnapshotId ?? null;
      let snapshotGeneratedAt: string | null = currentFreshness.get(domain)?.snapshotGeneratedAt ?? null;
      let failureReason: string | null = null;
      let status: SnapshotRefreshRunStatus = 'success';
      const domainWarnings: string[] = [];

      try {
        if (domain === 'journal_influence') {
          const snapshot = await this.loaders.journalInfluence.generateJournalInfluenceSnapshot(subjectKind, subjectId, '*', '*', generatedAt);
          snapshotId = snapshot.snapshotId;
          snapshotGeneratedAt = snapshot.summary.generatedAt;
        } else if (domain === 'analytics') {
          const snapshot = await this.loaders.analytics.generateAnalyticsSnapshot(subjectKind, subjectId, '*', '*', 180, generatedAt);
          snapshotId = snapshot.snapshotId;
          snapshotGeneratedAt = snapshot.summary.window.generatedAt;
        } else if (domain === 'coaching') {
          const snapshot = await this.loaders.coaching.generateCoachingSnapshot(subjectKind, subjectId, '*', '*', generatedAt);
          snapshotId = snapshot.snapshotId;
          snapshotGeneratedAt = snapshot.summary.generatedAt;
        } else if (domain === 'portfolio') {
          const snapshot = await this.loaders.portfolio.generatePortfolioSnapshot(subjectKind, subjectId, generatedAt);
          snapshotId = snapshot.snapshotId;
          snapshotGeneratedAt = snapshot.generatedAt;
        } else {
          const snapshot = await this.loaders.workspace.generateWorkspaceSnapshot(subjectKind, subjectId, generatedAt);
          snapshotId = snapshot.snapshotId;
          snapshotGeneratedAt = snapshot.summary.generatedAt;
          if (dependencyState === 'failed' || dependencyState === 'missing') {
            domainWarnings.push('workspace_refreshed_with_degraded_dependencies');
          }
        }
      } catch (error) {
        status = 'failed';
        failureReason = asErrorMessage(error);
        domainWarnings.push(`refresh_failed:${domain}`);
      }

      const updatedFreshness = persistedRowForDomain(
        subjectKind,
        subjectId,
        domain,
        currentFreshness.get(domain) ?? null,
        generatedAt,
        snapshotId,
        snapshotGeneratedAt,
        dependencyState,
        status === 'failed',
        failureReason
      );
      await this.freshnessRepository.upsertFreshness(updatedFreshness);
      currentFreshness.set(domain, updatedFreshness);

      const endedAt = nowIso();
      const result: DomainRefreshResult = {
        domain,
        status,
        previousFreshnessState,
        nextFreshnessState: updatedFreshness.freshnessState,
        snapshotId,
        startedAt,
        endedAt,
        durationMs: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)),
        dependencyStatus,
        warnings: domainWarnings,
        failureReason
      };

      if (dependencyState === 'failed' && domain !== 'workspace') {
        warnings.push(`dependency_failed_for_${domain}`);
      }
      warnings.push(...domainWarnings);
      domainResults.push(result);
      inRunResults.set(domain, result);
    }

    const refreshedDomains = domainResults.filter((row) => row.status !== 'failed' && row.status !== 'skipped').map((row) => row.domain);
    const failedDomains = domainResults.filter((row) => row.status === 'failed').map((row) => row.domain);
    const staleDomains = domainResults.filter((row) => row.nextFreshnessState === 'stale').map((row) => row.domain);

    const report: SnapshotRefreshRunReport = {
      refreshRunId: createId('srrun'),
      subjectKind,
      subjectId,
      triggerKind,
      generatedAt,
      overallStatus: toOverallStatus(domainResults),
      domainResults,
      refreshedDomains,
      failedDomains,
      staleDomains,
      warnings,
      createdAt: nowIso()
    };

    const validated = validateSnapshotRefreshRunReport(report);
    if (validated.ok === false) throw new Error(`invalid_snapshot_refresh_report:${validated.errors.join('; ')}`);

    await this.refreshRunRepository.saveRun(toPersistedRunRecord(validated.value));
    return validated.value;
  }
}
