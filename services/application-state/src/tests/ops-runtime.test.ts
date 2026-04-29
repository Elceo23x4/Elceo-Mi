import { strict as assert } from 'assert';
import { CanonicalOpsBoundaryService } from '../runtime/canonical-ops-boundary';
import { runOpsJob } from '../ops/job-service';
import { runScheduledOpsCycle, runSubjectMaintenanceCycle } from '../ops/scheduler-service';
import { buildLeaseExpiry, getLeaseDurationMinutes } from '../ops/lease-policy';
import { deserializeOpsJobLeaseRecord, deserializeOpsJobRunReport, serializeOpsJobLeaseRecord, serializeOpsJobRunReport } from '../ops/serialization';
import { MemoryOpsJobLeaseRepository, MemoryOpsJobRunRepository, getOpsJobLeaseRepository, getOpsJobRunRepository } from '../persistence/ops-runtime-repository';

export async function runOpsRuntimeTests(): Promise<void> {
  assert.equal(getLeaseDurationMinutes('ingestion_tick'), 30);
  const leaseRepo = new MemoryOpsJobLeaseRepository();
  const now = '2026-04-28T00:00:00.000Z';
  const lease = { leaseId: 'l1', jobKind: 'snapshot_refresh' as const, scopeKind: 'subject' as const, scopeKey: 'user:1', leaseState: 'acquired' as const, acquiredAt: now, expiresAt: buildLeaseExpiry(now, 'snapshot_refresh'), releasedAt: null, holderId: 'h', createdAt: now };
  assert.equal((await leaseRepo.acquireLease(lease)).acquired, true);
  assert.equal((await leaseRepo.acquireLease({ ...lease, leaseId: 'l2' })).acquired, false);
  assert.equal(await leaseRepo.cleanupExpiredLeases('2026-04-28T00:30:00.000Z'), 1);
  assert.equal((await leaseRepo.listStaleLeases('2026-04-28T00:30:00.000Z')).length, 1);

  const run = { runId: 'r1', jobKind: 'snapshot_refresh' as const, triggerKind: 'manual' as const, scopeKind: 'subject' as const, scopeKey: 'user:1', startedAt: now, endedAt: now, durationMs: 0, status: 'success' as const, warnings: [], failureReason: null, childReportIds: [], metricsJson: '{}', createdAt: now };
  assert.equal(deserializeOpsJobRunReport(serializeOpsJobRunReport(run)).runId, 'r1');
  assert.throws(() => deserializeOpsJobRunReport('{bad'));
  assert.equal(deserializeOpsJobLeaseRecord(serializeOpsJobLeaseRecord(lease)).leaseId, 'l1');
  assert.throws(() => deserializeOpsJobLeaseRecord('{bad'));

  const job = await runOpsJob({ jobKind: 'notification_dispatch', triggerKind: 'scheduled', scopeKind: 'global', scopeKey: 'global', holderId: 't1', startedAt: now });
  assert.equal(job.status, 'success');
  assert.equal(typeof JSON.parse(job.metricsJson), 'object');

  const cycle = await runScheduledOpsCycle(now);
  assert.equal(cycle.childReports.length, 2);
  assert.equal(cycle.childReports[0]?.jobKind, 'notification_dispatch');
  assert.equal(cycle.childReports[1]?.jobKind, 'notification_verification_expiry');

  const maintenance = await runSubjectMaintenanceCycle('user', 'abc', now);
  assert.equal(maintenance.childReports.length, 2);
  assert.equal(maintenance.childReports[0]?.jobKind, 'snapshot_refresh');
  assert.equal(maintenance.childReports[1]?.jobKind, 'workspace_maintenance');

  const runRepo = getOpsJobRunRepository();
  const failed = await runRepo.listRecentFailedRuns(10);
  assert(Array.isArray(failed));

  const boundary = new CanonicalOpsBoundaryService();
  const report = await boundary.runOpsJob({ jobKind: 'ingestion_tick', triggerKind: 'manual', scopeKind: 'global', scopeKey: 'global', holderId: 'boundary', startedAt: now });
  assert.equal(report.jobKind, 'ingestion_tick');
  const summary = await boundary.getOpsJobHealthSummary(now, 48);
  assert(summary.totalRecentRuns >= 1);

  const rawRunRepo = new MemoryOpsJobRunRepository();
  await rawRunRepo.saveRun({ runId: 'rfail', jobKind: 'snapshot_refresh', triggerKind: 'manual', scopeKind: 'subject', scopeKey: 's', startedAt: now, endedAt: now, durationMs: 0, status: 'failed', warningsJson: '[]', failureReason: 'x', childReportIdsJson: '[]', metricsJson: '{}', reportJson: '{}', createdAt: now });
  assert.equal((await rawRunRepo.listRecentFailedRuns()).length, 1);

  assert(Boolean(getOpsJobLeaseRepository()));
}
