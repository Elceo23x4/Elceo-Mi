import type { ProviderSourceRequest, ScheduledIngestionJobPolicy, ScheduledIngestionRunMode, ScheduledIngestionRunRecord, ScheduledIngestionRunReport, ScheduledIngestionStalenessReport } from '@elceo/types';
import { CftcCotAdapter } from '../provider-sources/cot/cot-adapter';
import { TiingoMarketDataAdapter } from '../provider-sources/tiingo/tiingo-adapter';
import { IngestionPersistenceService, type IngestionPersistenceReport } from '../provider-sources/ingestion-persistence-service';
import type { ScheduledIngestionRunRepository } from '../persistence/scheduled-ingestion-repository';
import { deriveRetryStatus } from './retry-policy';
import { deriveStalenessStatus } from './staleness-policy';
import { getScheduledIngestionPolicy } from './schedule-policies';

export class ScheduledIngestionService {
  constructor(private readonly ingestion: IngestionPersistenceService, private readonly runs: ScheduledIngestionRunRepository) {}

  async runScheduledIngestionJob(jobId: string, modeOverride?: ScheduledIngestionRunMode, startedAt?: string): Promise<ScheduledIngestionRunReport> {
    const policy = getScheduledIngestionPolicy(jobId);
    const runMode = modeOverride ?? policy?.runMode ?? 'dry_run_fixture';
    const at = startedAt ?? new Date().toISOString();
    if (!policy) return this.persistSimple(jobId, runMode, at, 'skipped', 'unsupported_job_id');
    if (runMode === 'production_live') return this.persistSimple(jobId, runMode, at, 'blocked', 'production_live_blocked', policy);
    if (runMode === 'staging_live') return this.persistSimple(jobId, runMode, at, 'blocked', 'staging_live_not_enabled_in_c5_a22', policy);
    return this.runScheduledIngestionDryRun(jobId, at);
  }

  async runScheduledIngestionDryRun(jobId: string, startedAt?: string): Promise<ScheduledIngestionRunReport> {
    const policy = getScheduledIngestionPolicy(jobId);
    const at = startedAt ?? new Date().toISOString();
    if (!policy) return this.persistSimple(jobId, 'dry_run_fixture', at, 'skipped', 'unsupported_job_id');

    const run = await this.executeFixtureDryRun(policy, at, `run-${jobId}-${at}`);
    await this.runs.saveRun(run);
    return this.buildScheduledIngestionRunReport(run);
  }

  async replayScheduledIngestionRun(runId: string, replayMode: ScheduledIngestionRunMode = 'dry_run_fixture', startedAt?: string): Promise<ScheduledIngestionRunReport> {
    const original = await this.runs.getRunById(runId);
    const at = startedAt ?? new Date().toISOString();
    if (!original) return this.persistReplayBlocked('unknown_replay_run_id', runId, replayMode, at);
    if (replayMode !== 'dry_run_fixture') return this.persistReplayBlocked('unsupported_replay_mode', runId, replayMode, at, original);
    if (original.runMode !== 'dry_run_fixture') return this.persistReplayBlocked('original_run_not_replayable', runId, replayMode, at, original);
    if (original.status === 'blocked' && original.errorCode === 'production_live_blocked') return this.persistReplayBlocked('original_run_live_blocked', runId, replayMode, at, original);
    if (!original.jobId || !original.providerId || !original.capability) return this.persistReplayBlocked('original_run_metadata_missing', runId, replayMode, at, original);

    const policy = getScheduledIngestionPolicy(original.jobId);
    if (!policy) return this.persistReplayBlocked('original_job_descriptor_missing', runId, replayMode, at, original);

    const replayRunId = `run-${original.jobId}-${at}-replay-${original.runId}`;
    const duplicate = await this.runs.getRunById(replayRunId);
    if (duplicate) return this.buildScheduledIngestionRunReport(duplicate);

    const replayRun = await this.executeFixtureDryRun(policy, at, replayRunId);
    replayRun.warnings = [...replayRun.warnings, 'replay_duplicate_decision:created'];
    replayRun.replayOfRunId = original.runId;
    replayRun.originalJobId = original.jobId;
    replayRun.originalExecutionMode = original.runMode;
    replayRun.replayMode = replayMode;
    replayRun.replayedAt = at;
    replayRun.originalSourceRef = original.originalSourceRef ?? original.requestId ?? null;
    replayRun.operatorNote = `replay_of:${original.runId}`;
    await this.runs.saveRun(replayRun);
    return this.buildScheduledIngestionRunReport(replayRun);
  }

  buildScheduledIngestionRunReport(run: ScheduledIngestionRunRecord): ScheduledIngestionRunReport { return { generatedAt: new Date().toISOString(), run, pass: run.status === 'succeeded' || run.status === 'skipped', warnings: run.warnings }; }
  getScheduledIngestionRunReplay(runId: string) { return this.runs.getRunById(runId); }
  listScheduledIngestionRunsByProvider(providerId: string, capability?: string, limit?: number) { return this.runs.listRunsByProvider(providerId, capability, limit); }
  listScheduledIngestionRunsByStatus(status: ScheduledIngestionRunRecord['status'], limit?: number) { return this.runs.listRunsByStatus(status, limit); }
  buildScheduledIngestionStalenessReport(policy: ScheduledIngestionJobPolicy, latestPayloads: Array<{ observedAt: string }>, evaluatedAt?: string): ScheduledIngestionStalenessReport {
    const now = evaluatedAt ?? new Date().toISOString();
    const latest = latestPayloads[0]?.observedAt ?? null;
    return { generatedAt: now, providerId: policy.providerId, capability: policy.capability, asset: policy.asset, region: policy.region, latestObservedAt: latest, stalenessStatus: deriveStalenessStatus(latest, now, policy.staleAfterMinutes, policy.expiresAfterMinutes), reasons: latest ? [] : ['no_payloads_observed'] };
  }

  private async executeFixtureDryRun(policy: ScheduledIngestionJobPolicy, requestedAt: string, runId: string): Promise<ScheduledIngestionRunRecord> {
    let report: IngestionPersistenceReport | null = null;
    if (policy.providerId === 'tiingo_market_data') {
      report = await this.ingestion.persistAdapterFetchAndNormalize(new TiingoMarketDataAdapter({ mode: 'fixture' }), this.buildRequest(policy, requestedAt, 'market_price_history'));
    } else if (policy.providerId === 'cftc_cot') {
      report = await this.ingestion.persistAdapterFetchAndNormalize(new CftcCotAdapter(), this.buildRequest(policy, requestedAt, 'cot_report'));
    }

    if (!report) {
      return this.buildSimpleRun(runId, policy.jobId, 'dry_run_fixture', requestedAt, 'skipped', 'fixture_adapter_not_wired', policy);
    }

    const status: ScheduledIngestionRunRecord['status'] = report.errors.length > 0 ? 'failed' : 'succeeded';
    return {
      runId,
      jobId: policy.jobId,
      providerId: policy.providerId,
      capability: policy.capability,
      asset: policy.asset,
      region: policy.region,
      runMode: 'dry_run_fixture',
      status,
      startedAt: requestedAt,
      completedAt: new Date().toISOString(),
      requestId: report.requestId,
      responseStatus: report.responseStatus,
      payloadCount: report.payloadCount,
      persistedPayloadIds: report.persistedPayloadIds,
      errorCode: report.errors.length > 0 ? 'ingestion_error' : null,
      errorMessage: report.errors[0] ?? null,
      retryStatus: deriveRetryStatus(status, 0, policy.maxRetries),
      retryCount: 0,
      nextRetryAt: null,
      stalenessStatus: deriveStalenessStatus(requestedAt, requestedAt, policy.staleAfterMinutes, policy.expiresAfterMinutes),
      warnings: report.errors,
      originalSourceRef: report.requestId
    };
  }

  private buildRequest(policy: ScheduledIngestionJobPolicy, requestedAt: string, evidenceTypeId: string): ProviderSourceRequest {
    return { requestId: `${policy.jobId}-${requestedAt}`, providerId: policy.providerId, capability: policy.capability, asset: policy.asset, region: policy.region, evidenceTypeId, requestedAt, paramsJson: JSON.stringify({ mode: 'fixture', scheduled: true }) };
  }

  private buildSimpleRun(runId: string, jobId: string, runMode: ScheduledIngestionRunMode, startedAt: string, status: ScheduledIngestionRunRecord['status'], reason: string, policy?: ScheduledIngestionJobPolicy): ScheduledIngestionRunRecord {
    return {
      runId,
      jobId,
      providerId: policy?.providerId ?? 'unknown_provider',
      capability: policy?.capability ?? 'market_price_history',
      asset: policy?.asset ?? null,
      region: policy?.region ?? null,
      runMode,
      status,
      startedAt,
      completedAt: startedAt,
      requestId: null,
      responseStatus: null,
      payloadCount: 0,
      persistedPayloadIds: [],
      errorCode: reason,
      errorMessage: reason,
      retryStatus: 'not_needed',
      retryCount: 0,
      nextRetryAt: null,
      stalenessStatus: 'unknown',
      warnings: [reason]
    };
  }

  private async persistSimple(jobId: string, runMode: ScheduledIngestionRunMode, startedAt: string, status: ScheduledIngestionRunRecord['status'], reason: string, policy?: ScheduledIngestionJobPolicy): Promise<ScheduledIngestionRunReport> {
    const run = this.buildSimpleRun(`run-${jobId}-${startedAt}`, jobId, runMode, startedAt, status, reason, policy);
    await this.runs.saveRun(run);
    return this.buildScheduledIngestionRunReport(run);
  }

  private async persistReplayBlocked(reason: string, replayOfRunId: string, replayMode: ScheduledIngestionRunMode, startedAt: string, original?: ScheduledIngestionRunRecord): Promise<ScheduledIngestionRunReport> {
    const jobId = original?.jobId ?? 'unknown_job';
    const runId = `run-${jobId}-${startedAt}-replay-${replayOfRunId}`;
    const run = this.buildSimpleRun(runId, jobId, 'dry_run_fixture', startedAt, 'blocked', reason, getScheduledIngestionPolicy(jobId) ?? undefined);
    run.replayOfRunId = replayOfRunId;
    run.originalJobId = original?.jobId ?? null;
    run.originalExecutionMode = original?.runMode ?? null;
    run.replayMode = replayMode;
    run.replayedAt = startedAt;
    run.duplicateDecision = 'blocked';
    run.operatorNote = `replay_blocked:${reason}`;
    await this.runs.saveRun(run);
    return this.buildScheduledIngestionRunReport(run);
  }
}
