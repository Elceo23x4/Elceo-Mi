import type { ProviderSourceRequest, ScheduledIngestionJobPolicy, ScheduledIngestionRunMode, ScheduledIngestionRunRecord, ScheduledIngestionRunReport, ScheduledIngestionStalenessReport } from '@elceo/types';
import { CftcCotAdapter } from '../provider-sources/cot/cot-adapter';
import { TiingoMarketDataAdapter } from '../provider-sources/tiingo/tiingo-adapter';
import { FinnhubMacroCalendarEvidenceAdapter, FinnhubMarketDataFallbackAdapter } from '../provider-sources/finnhub/finnhub-adapter';
import { GdeltNewsAdapter, MarketauxMarketNewsAdapter } from '../provider-sources/news/news-adapters';
import { createOfficialAdapter } from '../provider-sources/official/official-adapter-catalog';
import { IngestionPersistenceService, type IngestionPersistenceReport } from '../provider-sources/ingestion-persistence-service';
import type { ScheduledIngestionRunRepository } from '../persistence/scheduled-ingestion-repository';
import { computeBoundedProviderRetryAt, deriveRetryStatus, isRetryableProviderFailure } from './retry-policy';
import { deriveStalenessStatus } from './staleness-policy';
import { getScheduledIngestionPolicy } from './schedule-policies';
import { executeProviderApiGateRequest, resolveProviderRuntimeRequest, type ProviderActivationMode, type ProviderApiGatePolicy, type ProviderRuntimeResolverDecision, type ProviderRuntimeRequest, type ProviderRuntimeResponse } from '../provider-sources/provider-api-gate';
import type { TrustedProviderExecutionResolver } from '../provider-sources/provider-adapter-resolver';

export type ScheduledIngestionGatePolicyResolver = (policy: ScheduledIngestionJobPolicy, runMode: ScheduledIngestionRunMode, requestedAt: string) => ProviderApiGatePolicy | undefined;
export type ScheduledIngestionExecutionOptions={gatePolicyResolver?:ScheduledIngestionGatePolicyResolver;liveExecutionResolver?:TrustedProviderExecutionResolver;retryJitter?:()=>number;now?:()=>string;gateExecutor?:typeof executeProviderApiGateRequest};

function trustedScheduledProviderParams(policy:ScheduledIngestionJobPolicy):Record<string,unknown>{
 if(policy.providerId==='tiingo_market_data')return{frequency:'daily'};
 if(policy.providerId==='finnhub_market_data')return{frequency:'daily',fallbackFor:'tiingo_market_data'};
 if(policy.providerId==='finnhub_macro')return{profile:'economic_calendar',authority:'secondary'};
 if(policy.providerId==='marketaux_news')return{profile:'launch_financial_news',lookbackHours:3};
 if(policy.providerId==='gdelt_news')return{profile:policy.capability==='geopolitical_risk_event'?'geopolitical_risk':'market_news_fallback',lookbackHours:3};
 if(policy.providerId==='cftc_cot')return{profile:'6dca-aqww:legacy_futures_only'};
 if(policy.providerId==='fred'&&policy.capability==='real_yield_series')return{seriesId:'DFII10'};
 if(policy.providerId==='fred'&&policy.capability==='financial_conditions_index')return{seriesId:'NFCI'};
 if(policy.providerId==='ecb_public'&&policy.capability==='policy_rate_series')return{series:'deposit_facility'};
 if(policy.providerId==='us_treasury'&&policy.capability==='nominal_yield_series')return{dataset:'daily_treasury_yield_curve'};
 if(policy.providerId==='us_treasury'&&policy.capability==='real_yield_series')return{dataset:'daily_treasury_real_yield_curve'};
 if(policy.providerId==='bls_official'&&policy.capability==='inflation_indicator')return{profile:'CUSR0000SA0'};
 if(policy.providerId==='bls_official'&&policy.capability==='labor_market_indicator')return{profile:'LNS14000000'};
 if(policy.providerId==='bea_official')return{profile:'NIPA:T10101:Q'};
 if(policy.providerId==='census_official')return{profile:'EITS:MRTS'};
 if(policy.providerId==='boe_official')return{profile:'IUDBEDR'};
 if(policy.providerId==='rba_official')return{profile:'cash_rate_target'};
 if(policy.providerId==='rbnz_official')return{profile:'OCR_DECISION_HISTORY'};
 if(policy.providerId==='bank_of_canada_official')return{profile:'V39079'};
 if(policy.providerId==='statistics_canada_official')return{profile:'vector:41690973'};
 if(policy.providerId==='eia_official')return{profile:'RWTC'};
 if(policy.providerId==='world_bank_official')return{profile:'NY.GDP.MKTP.KD.ZG'};
 if(policy.providerId==='federal_reserve')return{profile:'H41:H41/RESPPA_N.WW'};
 if(policy.providerId==='eurostat_official')return{profile:'prc_hicp_minr:M:RCH_A:TOTAL:EA21'};
 if(policy.providerId==='ons_official')return{profile:'L55O:CPIH_ALL_ITEMS_ANNUAL_RATE'};
 if(policy.providerId==='boj_public')return{profile:'FM01:STRDCLUCON'};
 if(policy.providerId==='snb_official')return{profile:'snboffzisa:D0(LZ)'};
 if(policy.providerId==='abs_official')return{profile:'ABS,CPI,2.0.0/1.10001.10.50.M'};
 if(policy.providerId==='oecd_official')return{profile:'OECD.SDD.STES,DSD_STES@DF_CLI,4.1:G20.M.LI...AA...H'};
 if(policy.providerId==='cboe_official')return{profile:'VIX:EOD_DIRECT_INDEX'};
 return{profile:'server_owned_fixture',scheduled:true};
}

export class ScheduledIngestionService {
  private readonly gatePolicyResolver:ScheduledIngestionGatePolicyResolver|undefined;private readonly liveExecutionResolver:TrustedProviderExecutionResolver|undefined;private readonly retryJitter:()=>number;private readonly now:()=>string;private readonly gateExecutor:typeof executeProviderApiGateRequest;
  constructor(private readonly ingestion: IngestionPersistenceService, private readonly runs: ScheduledIngestionRunRepository, options?:ScheduledIngestionGatePolicyResolver|ScheduledIngestionExecutionOptions) {this.gatePolicyResolver=typeof options==='function'?options:options?.gatePolicyResolver;this.liveExecutionResolver=typeof options==='function'?undefined:options?.liveExecutionResolver;this.retryJitter=typeof options==='function'||!options?.retryJitter?()=>0.5:options.retryJitter;this.now=typeof options==='function'||!options?.now?()=>new Date().toISOString():options.now;this.gateExecutor=typeof options==='function'||!options?.gateExecutor?executeProviderApiGateRequest:options.gateExecutor;}

  async runScheduledIngestionJob(jobId: string, modeOverride?: ScheduledIngestionRunMode, startedAt?: string): Promise<ScheduledIngestionRunReport> {
    const policy = getScheduledIngestionPolicy(jobId);
    const runMode = modeOverride ?? policy?.runMode ?? 'dry_run_fixture';
    const at = startedAt ?? this.now();
    if (!policy) return this.persistSimple(jobId, runMode, at, 'skipped', 'unsupported_job_id');
    if (!policy.enabled) return this.persistSimple(jobId,runMode,at,'skipped','scheduled_policy_disabled',policy);
    if (runMode === 'production_live') {
      const gate = this.resolveGate(policy, runMode, at);
      return this.persistSimple(jobId, runMode, at, 'blocked', gate.reason, policy, gate);
    }
    if (runMode === 'staging_live') return this.executeStagingLive(policy,at,`run-${jobId}-${at}`,0);
    return this.runScheduledIngestionDryRun(jobId, at);
  }

  private async executeStagingLive(policy:ScheduledIngestionJobPolicy,requestedAt:string,runId:string,retryCount:number):Promise<ScheduledIngestionRunReport>{
    const preflight=this.resolveGate(policy,'staging_live',requestedAt);
    if(!preflight.allowed)return this.persistSimple(policy.jobId,'staging_live',requestedAt,'blocked',preflight.reason,policy,preflight);
    const resolved=await this.liveExecutionResolver?.(policy,requestedAt);
    if(!resolved)return this.persistSimple(policy.jobId,'staging_live',requestedAt,'blocked','trusted_provider_execution_missing',policy);
    if(resolved.sourceId!==policy.providerId||resolved.capabilityId!==policy.capability||resolved.activationMode!=='staging_live_allowed')return this.persistSimple(policy.jobId,'staging_live',requestedAt,'blocked','trusted_provider_execution_mismatch',policy);
    const gateRequest=this.buildGateRequest(policy,requestedAt,'staging_live_allowed',runId);
    const result=await this.gateExecutor(gateRequest,resolved.adapter,resolved.context);
    if(!result.decision.allowed||!result.response)return this.persistSimple(policy.jobId,'staging_live',requestedAt,'blocked',result.decision.reason,policy,result.decision);
    const request=this.buildRequest(policy,requestedAt,policy.capability);request.requestId=gateRequest.requestId;request.paramsJson=JSON.stringify(gateRequest.providerRequestParams??{});
    const report=await this.ingestion.persistProviderApiGateResult(resolved.adapter,request,result);
    const errorCode=result.response.error?.category??null,retryable=isRetryableProviderFailure(errorCode),failed=result.response.payloadSchemaStatus!=='valid'||report.errors.length>0;
    const canRetry=failed&&retryable&&retryCount<policy.maxRetries;
    const run:ScheduledIngestionRunRecord={runId,jobId:policy.jobId,providerId:policy.providerId,capability:policy.capability,asset:policy.asset,region:policy.region,runMode:'staging_live',status:failed?'failed':'succeeded',startedAt:requestedAt,completedAt:requestedAt,requestId:request.requestId,responseStatus:report.responseStatus,payloadCount:report.payloadCount,persistedPayloadIds:report.persistedPayloadIds,errorCode:failed?(errorCode??'ingestion_error'):null,errorMessage:failed?(result.response.error?.message??report.errors[0]??'ingestion_error'):null,retryStatus:canRetry?'retry_scheduled':failed?'exhausted':'not_needed',retryCount,nextRetryAt:canRetry?computeBoundedProviderRetryAt(requestedAt,retryCount,policy.retryBackoffSeconds,result.response.rateLimit?.retryAfterMs,this.retryJitter()):null,stalenessStatus:failed?'unknown':'fresh',warnings:[`provider_api_gate:${result.decision.providerCallMode}`],originalSourceRef:result.response.responseId};
    await this.runs.saveRun(run);return this.buildScheduledIngestionRunReport(run);
  }

  async runScheduledIngestionDryRun(jobId: string, startedAt?: string): Promise<ScheduledIngestionRunReport> {
    const policy = getScheduledIngestionPolicy(jobId);
    const at = startedAt ?? new Date().toISOString();
    if (!policy) return this.persistSimple(jobId, 'dry_run_fixture', at, 'skipped', 'unsupported_job_id');
    if(!policy.enabled)return this.persistSimple(jobId,'dry_run_fixture',at,'skipped','scheduled_policy_disabled',policy);
    const run = await this.executeFixtureDryRun(policy, at, `run-${jobId}-${at}`);
    await this.runs.saveRun(run);
    return this.buildScheduledIngestionRunReport(run);
  }

  async retryScheduledIngestionRun(runId:string,startedAt?:string):Promise<ScheduledIngestionRunReport>{
    const prior=await this.runs.getRunById(runId),at=startedAt??this.now();
    if(!prior||prior.runMode!=='staging_live'||prior.retryStatus!=='retry_scheduled')return this.persistSimple(prior?.jobId??'unknown_job','staging_live',at,'blocked','provider_retry_not_authorized',prior?getScheduledIngestionPolicy(prior.jobId)??undefined:undefined);
    if(prior.nextRetryAt&&Date.parse(at)<Date.parse(prior.nextRetryAt))return this.persistSimple(prior.jobId,'staging_live',at,'blocked','provider_retry_too_early',getScheduledIngestionPolicy(prior.jobId)??undefined);
    const policy=getScheduledIngestionPolicy(prior.jobId);if(!policy||prior.retryCount>=policy.maxRetries)return this.persistSimple(prior.jobId,'staging_live',at,'blocked','provider_retry_exhausted',policy??undefined);
    return this.executeStagingLive(policy,at,`run-${prior.jobId}-${at}-retry-${prior.retryCount+1}`,prior.retryCount+1);
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
    const gate = this.resolveGate(policy, replayMode, at, 'replay', original, replayRunId);
    if (!gate.allowed || gate.providerCallMode !== 'replay_captured_payload') return this.persistReplayBlocked(gate.reason, runId, replayMode, at, original);
    const replayRun = this.buildReplayRunFromOriginal(original, policy, at, replayRunId, gate);
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
    const gate = this.resolveGate(policy, 'dry_run_fixture', requestedAt, 'fixture_only');
    if (!gate.allowed || gate.providerCallMode !== 'fixture_response') return this.buildSimpleRun(runId, policy.jobId, 'dry_run_fixture', requestedAt, 'blocked', gate.reason, policy, gate);
    let report: IngestionPersistenceReport | null = null;
    const request = this.buildRequest(policy, requestedAt, policy.capability);
    if (policy.providerId === 'tiingo_market_data') report = await this.ingestion.persistAdapterFetchAndNormalize(new TiingoMarketDataAdapter({ mode: 'fixture' }), request);
    else if (policy.providerId === 'cftc_cot') report = await this.ingestion.persistAdapterFetchAndNormalize(new CftcCotAdapter({mode:'fixture'}), request);
    else if(policy.providerId==='finnhub_market_data')report=await this.ingestion.persistAdapterFetchAndNormalize(new FinnhubMarketDataFallbackAdapter({mode:'fixture'}),request);
    else if(policy.providerId==='finnhub_macro')report=await this.ingestion.persistAdapterFetchAndNormalize(new FinnhubMacroCalendarEvidenceAdapter({mode:'fixture'}),request);
    else if(policy.providerId==='marketaux_news')report=await this.ingestion.persistAdapterFetchAndNormalize(new MarketauxMarketNewsAdapter({mode:'fixture'}),request);
    else if(policy.providerId==='gdelt_news')report=await this.ingestion.persistAdapterFetchAndNormalize(new GdeltNewsAdapter({mode:'fixture'}),request);
    else {
      const officialAdapter=createOfficialAdapter(policy.providerId,policy.capability,{mode:'fixture'});
      if(officialAdapter)report=await this.ingestion.persistAdapterFetchAndNormalize(officialAdapter,request);
    }
    if (!report) return this.buildSimpleRun(runId, policy.jobId, 'dry_run_fixture', requestedAt, 'skipped', 'fixture_adapter_not_wired', policy, gate);
    const status: ScheduledIngestionRunRecord['status'] = report.errors.length > 0 ? 'failed' : 'succeeded';
    return {runId,jobId:policy.jobId,providerId:policy.providerId,capability:policy.capability,asset:policy.asset,region:policy.region,runMode:'dry_run_fixture',status,startedAt:requestedAt,completedAt:new Date().toISOString(),requestId:report.requestId,responseStatus:report.responseStatus,payloadCount:report.payloadCount,persistedPayloadIds:report.persistedPayloadIds,errorCode:report.errors.length>0?'ingestion_error':null,errorMessage:report.errors[0]??null,retryStatus:deriveRetryStatus(status,0,policy.maxRetries),retryCount:0,nextRetryAt:null,stalenessStatus:deriveStalenessStatus(requestedAt,requestedAt,policy.staleAfterMinutes,policy.expiresAfterMinutes),warnings:[...report.errors,`provider_api_gate:${gate.providerCallMode}`],originalSourceRef:report.requestId};
  }

  private buildRequest(policy: ScheduledIngestionJobPolicy, requestedAt: string, evidenceTypeId: string): ProviderSourceRequest {return { requestId: `${policy.jobId}-${requestedAt}`, providerId: policy.providerId, capability: policy.capability, asset: policy.asset, region: policy.region, evidenceTypeId, requestedAt, paramsJson: JSON.stringify(trustedScheduledProviderParams(policy)) };}

  private buildSimpleRun(runId: string, jobId: string, runMode: ScheduledIngestionRunMode, startedAt: string, status: ScheduledIngestionRunRecord['status'], reason: string, policy?: ScheduledIngestionJobPolicy, gate?: ProviderRuntimeResolverDecision): ScheduledIngestionRunRecord {
    return {runId,jobId,providerId:policy?.providerId??'unknown_provider',capability:policy?.capability??'market_price_history',asset:policy?.asset??null,region:policy?.region??null,runMode,status,startedAt,completedAt:startedAt,requestId:null,responseStatus:null,payloadCount:0,persistedPayloadIds:[],errorCode:reason,errorMessage:reason,retryStatus:'not_needed',retryCount:0,nextRetryAt:null,stalenessStatus:'unknown',warnings:gate?[reason,`provider_api_gate:${gate.providerCallMode}`,`provider_api_gate_reason:${gate.reason}`]:[reason]};
  }

  private async persistSimple(jobId: string, runMode: ScheduledIngestionRunMode, startedAt: string, status: ScheduledIngestionRunRecord['status'], reason: string, policy?: ScheduledIngestionJobPolicy, gate?: ProviderRuntimeResolverDecision): Promise<ScheduledIngestionRunReport> {const run=this.buildSimpleRun(`run-${jobId}-${startedAt}`,jobId,runMode,startedAt,status,reason,policy,gate);await this.runs.saveRun(run);return this.buildScheduledIngestionRunReport(run);}

  private buildGateRequest(policy: ScheduledIngestionJobPolicy, requestedAt: string, activationMode: ProviderActivationMode, runId?: string, original?: ScheduledIngestionRunRecord): ProviderRuntimeRequest {
    const effectiveRunMode:ScheduledIngestionRunMode=activationMode==='staging_live_allowed'?'staging_live':activationMode==='production_live_allowed'?'production_live':'dry_run_fixture';
    const gatePolicy = this.gatePolicyResolver?.(policy, effectiveRunMode, requestedAt);
    const replayPayload: ProviderRuntimeResponse | undefined = original ? { requestId: runId ?? `${policy.jobId}-${requestedAt}`, responseId: original.originalSourceRef ?? original.requestId ?? original.runId, sourceId: original.providerId, capabilityId: original.capability, adapterId: `${original.providerId}_${original.capability}_adapter`, receivedAt: original.completedAt ?? requestedAt, payload: { replayOfRunId: original.runId, persistedPayloadIds: original.persistedPayloadIds }, payloadSchemaStatus: 'valid', payloadSizeBytes: JSON.stringify(original.persistedPayloadIds).length, recordCount: original.payloadCount, provenance: { requestId: original.requestId ?? original.runId, sourceId: original.providerId }, error: null, rateLimit: null } : undefined;
    const request: ProviderRuntimeRequest = { requestId: runId ?? `${policy.jobId}-${requestedAt}`, sourceId: policy.providerId, capabilityId: gatePolicy?.requestCapabilityOverride ?? policy.capability, asset: policy.asset, region: policy.region, activationMode, providerRequestParams:trustedScheduledProviderParams(policy), provenance: { actor: 'scheduled_ingestion_service', purpose: 'scheduled_provider_orchestration' } };
    if (activationMode === 'replay') request.idempotencyKey = `replay:${original?.runId ?? runId}`;
    if (gatePolicy) request.policy = gatePolicy;
    if (gatePolicy?.requestMetadata) request.metadata = gatePolicy.requestMetadata;
    if (replayPayload) request.replayPayload = replayPayload;
    return request;
  }

  private resolveGate(policy: ScheduledIngestionJobPolicy, runMode: ScheduledIngestionRunMode, requestedAt: string, activationOverride?: ProviderActivationMode, original?: ScheduledIngestionRunRecord, runId?: string): ProviderRuntimeResolverDecision {const activationMode:ProviderActivationMode=activationOverride??(runMode==='production_live'?'production_live_allowed':runMode==='staging_live'?'staging_live_allowed':'fixture_only');return resolveProviderRuntimeRequest(this.buildGateRequest(policy,requestedAt,activationMode,runId,original));}

  private buildReplayRunFromOriginal(original: ScheduledIngestionRunRecord, policy: ScheduledIngestionJobPolicy, startedAt: string, runId: string, gate: ProviderRuntimeResolverDecision): ScheduledIngestionRunRecord {return { ...original, runId, jobId: policy.jobId, runMode: 'dry_run_fixture', status: 'succeeded', startedAt, completedAt: startedAt, retryStatus: 'not_needed', retryCount: 0, nextRetryAt: null, warnings: [...original.warnings, 'replay_duplicate_decision:created', `provider_api_gate:${gate.providerCallMode}`], replayOfRunId: original.runId, originalJobId: original.jobId, originalExecutionMode: original.runMode, replayMode: 'dry_run_fixture', replayedAt: startedAt, duplicateDecision: 'created', originalSourceRef: original.originalSourceRef ?? original.requestId ?? null, operatorNote: `replay_of:${original.runId}` };}

  private async persistReplayBlocked(reason: string, replayOfRunId: string, replayMode: ScheduledIngestionRunMode, startedAt: string, original?: ScheduledIngestionRunRecord): Promise<ScheduledIngestionRunReport> {
    const jobId=original?.jobId??'unknown_job',runId=`run-${jobId}-${startedAt}-replay-${replayOfRunId}`;
    const run=this.buildSimpleRun(runId,jobId,'dry_run_fixture',startedAt,'blocked',reason,getScheduledIngestionPolicy(jobId)??undefined);
    run.replayOfRunId=replayOfRunId;run.originalJobId=original?.jobId??null;run.originalExecutionMode=original?.runMode??null;run.replayMode=replayMode;run.replayedAt=startedAt;run.duplicateDecision='blocked';run.operatorNote=`replay_blocked:${reason}`;
    await this.runs.saveRun(run);return this.buildScheduledIngestionRunReport(run);
  }
}
