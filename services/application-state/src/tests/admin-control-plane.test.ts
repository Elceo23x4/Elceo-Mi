import { strict as assert } from 'assert';
import { CanonicalAdminBoundaryService } from '../runtime/canonical-admin-boundary';
import { getAdminAuditTimeline } from '../admin/audit-timeline';
import { getAdminFreshnessSummary } from '../admin/freshness-summary';
import { getAdminOpsSummary } from '../admin/ops-summary';
import { getAdminProviderCapabilitySummary } from '../admin/provider-summary';
import { getAdminSystemSummary } from '../admin/system-summary';
import type { OpsJobLeaseRepository, OpsJobRunRepository, SnapshotFreshnessRepository, SnapshotRefreshRunRepository } from '../persistence/contracts';

export async function runAdminControlPlaneTests(): Promise<void> {
  const refreshRepo: SnapshotRefreshRunRepository = {
    saveRun: async () => {}, getRunById: async () => null,
    listRecentRuns: async () => [{ refreshRunId: 'r1', subjectKind: 'ops', subjectId: 'global', triggerKind: 'scheduled', overallStatus: 'failed', generatedAt: '2026-01-02T00:00:00.000Z', refreshedDomainsJson: '[]', failedDomainsJson: '[]', staleDomainsJson: '[]', warningsJson: '[]', reportJson: '{}', createdAt: '2026-01-02T00:00:00.000Z' }],
    getLatestRun: async () => ({ refreshRunId: 'r1', subjectKind: 'ops', subjectId: 'global', triggerKind: 'scheduled', overallStatus: 'failed', generatedAt: '2026-01-02T00:00:00.000Z', refreshedDomainsJson: '[]', failedDomainsJson: '[]', staleDomainsJson: '[]', warningsJson: '[]', reportJson: '{}', createdAt: '2026-01-02T00:00:00.000Z' })
  };
  const freshRepo: SnapshotFreshnessRepository = {
    upsertFreshness: async () => {}, getFreshness: async () => null,
    listFreshnessForSubject: async () => [
      { freshnessId: 'f1', domain: 'workspace', subjectKind: 'ops', subjectId: 'global', assetScope: '*', timeframeScope: '*', latestSnapshotId: null, freshnessState: 'failed', dependencyState: 'failed', snapshotGeneratedAt: null, evaluatedAt: '2026-01-01T00:00:00.000Z', ageMinutes: null, maxFreshMinutes: 30, failureReason: 'x', updatedAt: '2026-01-01T00:00:00.000Z' },
      { freshnessId: 'f2', domain: 'portfolio', subjectKind: 'ops', subjectId: 'global', assetScope: '*', timeframeScope: '*', latestSnapshotId: null, freshnessState: 'stale', dependencyState: 'satisfied', snapshotGeneratedAt: null, evaluatedAt: '2026-01-01T00:00:00.000Z', ageMinutes: 300, maxFreshMinutes: 240, failureReason: null, updatedAt: '2026-01-01T00:00:00.000Z' }
    ],
    listDomainsNeedingRefresh: async () => []
  };
  const opsRunRepo: OpsJobRunRepository = {
    saveRun: async () => {}, getRunById: async () => null,
    getLatestRun: async () => ({ runId: 'o-latest', jobKind: 'snapshot_refresh', triggerKind: 'scheduled', scopeKind: 'subject', scopeKey: 'global', startedAt: '2026-01-01T00:00:00.000Z', endedAt: '2026-01-01T00:00:00.000Z', durationMs: 10, status: 'failed', warningsJson: '[]', failureReason: 'x', childReportIdsJson: '[]', metricsJson: '{}', reportJson: '{}', createdAt: '2026-01-01T00:00:00.000Z' }),
    listRecentRuns: async () => [
      { runId: 'o2', jobKind: 'snapshot_refresh', triggerKind: 'scheduled', scopeKind: 'subject', scopeKey: 'global', startedAt: '2026-01-01T00:00:00.000Z', endedAt: '2026-01-01T00:00:00.000Z', durationMs: 10, status: 'failed', warningsJson: '[]', failureReason: 'x', childReportIdsJson: '[]', metricsJson: '{}', reportJson: '{}', createdAt: '2026-01-02T00:00:00.000Z' },
      { runId: 'o1', jobKind: 'ingestion_tick', triggerKind: 'scheduled', scopeKind: 'global', scopeKey: 'global', startedAt: '2026-01-01T00:00:00.000Z', endedAt: '2026-01-01T00:00:00.000Z', durationMs: 10, status: 'skipped', warningsJson: '[]', failureReason: null, childReportIdsJson: '[]', metricsJson: '{}', reportJson: '{}', createdAt: '2026-01-01T00:00:00.000Z' }
    ],
    listRecentFailedRuns: async () => []
  };
  const leaseRepo: OpsJobLeaseRepository = {
    acquireLease: async () => ({ acquired: true, lease: { leaseId: 'l', jobKind: 'snapshot_refresh', scopeKind: 'global', scopeKey: 'global', leaseState: 'acquired', acquiredAt: '', expiresAt: '', releasedAt: null, holderId: 'h', createdAt: '' } }),
    releaseLease: async () => {}, getLeaseByJobScope: async () => null, cleanupExpiredLeases: async () => 0,
    listStaleLeases: async () => [{ leaseId: 'l', jobKind: 'snapshot_refresh', scopeKind: 'global', scopeKey: 'global', leaseState: 'acquired', acquiredAt: '', expiresAt: '', releasedAt: null, holderId: 'h', createdAt: '' }]
  };

  const system = await getAdminSystemSummary(refreshRepo, freshRepo, opsRunRepo, leaseRepo, 'ops', 'global');
  assert.equal(system.overallHealth, 'critical');
  assert.equal(system.latestRefreshRunStatus, 'failed');
  assert.equal(system.latestOpsRunStatus, 'failed');

  const freshness = await getAdminFreshnessSummary(freshRepo, 'ops', 'global');
  assert.equal(freshness.failedCount, 1); assert.equal(freshness.staleCount, 1);
  assert.deepEqual(freshness.domainsNeedingRefresh, ['workspace', 'portfolio']);

  const ops = await getAdminOpsSummary(opsRunRepo, leaseRepo, '2026-01-03T00:00:00.000Z');
  assert.equal(ops.failedRecentRuns, 1); assert.equal(ops.blockedRecentRuns, 1);
  assert.equal(ops.mostRecentFailureJobKind, 'snapshot_refresh');

  const providerEnv: Record<string, string> = { APP_ENV: 'staging', NOTIFICATION_EMAIL_PROVIDER: 'disabled' };
  providerEnv.FINNHUB_API_KEY = ['PROV', 'P0', 'ADMIN', 'SENTINEL'].join('_');
  providerEnv.TIINGO_API_KEY = ['PROV', 'P0', 'TIINGO', 'SENTINEL'].join('_');
  const providers = getAdminProviderCapabilitySummary(providerEnv);
  assert.equal(providers.notificationProviders[0]?.providerKind, 'email');
  assert.equal(providers.ingestionProviders[0]?.category, 'geopolitics');
  const finnhub = providers.ingestionProviders.find((provider) => provider.providerName === 'finnhub');
  assert.equal(finnhub?.credentialPresent, true);
  assert.equal(finnhub?.configured, true);
  assert.equal(finnhub?.enabled, false);
  assert.equal(finnhub?.stagingLiveAuthorized, false);
  assert.equal(finnhub?.stagingLiveValidated, false);
  assert.notEqual(finnhub?.capabilityStatus, 'healthy');
  assert.equal(JSON.stringify(providers).includes('PROV_P0_ADMIN_SENTINEL'), false);

  const timeline = await getAdminAuditTimeline(refreshRepo, opsRunRepo, 2);
  assert.equal(timeline.events.length, 2);
  assert.equal(timeline.events[0]?.severity, 'critical');

  const boundary = new CanonicalAdminBoundaryService({
    getAdminSystemSummary: async () => system,
    getAdminFreshnessSummary: async () => freshness,
    getAdminOpsSummary: async () => ops,
    getAdminProviderCapabilitySummary: async () => providers,
    getAdminAuditTimeline: async () => timeline
  } as never);
  assert.equal((await boundary.getAdminSystemSummary('ops', 'global')).overallHealth, 'critical');
}
