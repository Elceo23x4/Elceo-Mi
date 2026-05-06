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

    let report: IngestionPersistenceReport | null = null;
    if (policy.providerId === 'tiingo_market_data') {
      report = await this.ingestion.persistAdapterFetchAndNormalize(new TiingoMarketDataAdapter({ mode: 'fixture' }), this.buildRequest(policy, at, 'market_price_history'));
    } else if (policy.providerId === 'cftc_cot') {
      report = await this.ingestion.persistAdapterFetchAndNormalize(new CftcCotAdapter(), this.buildRequest(policy, at, 'cot_report'));
    }

    if (!report) return this.persistSimple(jobId, 'dry_run_fixture', at, 'skipped', 'fixture_adapter_not_wired', policy);

    const status: ScheduledIngestionRunRecord['status'] = report.errors.length > 0 ? 'failed' : 'succeeded';
    const run: ScheduledIngestionRunRecord = {
      runId: `run-${jobId}-${at}`,
      jobId,
      providerId: policy.providerId,
      capability: policy.capability,
      asset: policy.asset,
      region: policy.region,
      runMode: 'dry_run_fixture',
      status,
      startedAt: at,
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
      stalenessStatus: deriveStalenessStatus(at, at, policy.staleAfterMinutes, policy.expiresAfterMinutes),
      warnings: report.errors
    };
    await this.runs.saveRun(run);
    return this.buildScheduledIngestionRunReport(run);
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

  private buildRequest(policy: ScheduledIngestionJobPolicy, requestedAt: string, evidenceTypeId: string): ProviderSourceRequest {
    return { requestId: `${policy.jobId}-${requestedAt}`, providerId: policy.providerId, capability: policy.capability, asset: policy.asset, region: policy.region, evidenceTypeId, requestedAt, paramsJson: JSON.stringify({ mode: 'fixture', scheduled: true }) };
  }

  private async persistSimple(jobId: string, runMode: ScheduledIngestionRunMode, startedAt: string, status: ScheduledIngestionRunRecord['status'], reason: string, policy?: ScheduledIngestionJobPolicy): Promise<ScheduledIngestionRunReport> {
    const run: ScheduledIngestionRunRecord = {
      runId: `run-${jobId}-${startedAt}`,
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
    await this.runs.saveRun(run);
    return this.buildScheduledIngestionRunReport(run);
  }
}
