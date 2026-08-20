import type { ProviderCapabilityKind, ProviderSourceRequest, ProviderSourceResponse } from '@elceo/types';
import { getProviderDescriptor } from './provider-capability-registry';
import type { MarketEvidenceProviderAdapter } from './normalization-contracts';
import { randomUUID } from 'node:crypto';
import { assertLivePolicyAuthority, buildProviderAdmissionId, buildProviderRequestFingerprint, type ProviderControlPolicy, type ProviderControlPolicyResolver, type ProviderControlSnapshot, type ProviderControlStore, type ProviderReservation, type ProviderSettlementState, validateProviderExecutionLease } from './provider-control/index';

export type ProviderSourceId = string;
export type ProviderCapabilityId = ProviderCapabilityKind;
export type ProviderAdapterId = `${string}_adapter`;
export type ProviderActivationMode = 'disabled'|'fixture_only'|'dry_run'|'replay'|'staging_live_allowed'|'production_live_allowed';
export type ProviderCallMode = 'blocked_live'|'fixture_response'|'dry_run_no_external_call'|'replay_captured_payload'|'live_staging_call'|'live_production_call';
export type ProviderFallbackMode = 'none'|'explicit_fixture_fallback'|'explicit_replay_fallback'|'stale_if_error';
export type CircuitState = 'closed'|'open'|'half_open';

export type ProviderApiGatePolicy = {
  activationMode?: ProviderActivationMode;
  explicitProductionLiveAllow?: boolean;
  explicitStagingLiveAllow?: boolean;
  fallbackMode?: ProviderFallbackMode;
  maxWindowDays?: number;
  quotaLimit?: number;
  quotaUsed?: number;
  rateLimitRemaining?: number;
  costBudgetRemaining?: number;
  cacheHitPayload?: ProviderRuntimeResponse;
  stalePayload?: ProviderRuntimeResponse;
  circuitState?: CircuitState;
  allowUnknownFields?: boolean;
  requiredFields?: string[];
  expectedAdapterId?: ProviderAdapterId;
  allowedNullableFields?: string[];
  observedResponseIds?: string[];
  dedupeRecordKey?: string;
  requestMetadata?: Record<string, unknown>;
  requestCapabilityOverride?: ProviderCapabilityId;
};
export type ProviderRuntimeRequest = { requestId:string; sourceId:ProviderSourceId; capabilityId:ProviderCapabilityId; asset?:string|null; region?:string|null; startAt?:string|null; endAt?:string|null; paginationCursor?:string|null; providerRequestParams?:Record<string,unknown>; idempotencyKey?:string|null; provenance?:{ actor:string; purpose:string }; activationMode?:ProviderActivationMode; metadata?:Record<string,unknown>; policy?:ProviderApiGatePolicy; providerControlPolicy?:ProviderControlPolicy; replayPayload?:ProviderRuntimeResponse; };
export type ProviderCapabilityTranslation = { sourceId:ProviderSourceId; capabilityId:ProviderCapabilityId; adapterId:ProviderAdapterId; descriptorOnly:boolean; secretRequired:boolean; };
export type ProviderRuntimeResolverDecision = { allowed:boolean; reason:string; sourceId:ProviderSourceId; capabilityId:ProviderCapabilityId; adapterId:ProviderAdapterId|null; activationMode:ProviderActivationMode; providerCallMode:ProviderCallMode; fallbackMode:ProviderFallbackMode; quotaStatus:'ok'|'exceeded'; rateLimitStatus:'ok'|'exceeded'; costStatus:'ok'|'exceeded'; cacheStatus:'hit'|'miss'; circuitStatus:CircuitState; observabilityLabels:Record<string,string>; validationSchema:'provider_runtime_response_v1'; provenanceRequired:true; secretRequired:boolean; normalizedRequestKey:string; circuitUpdateRecommendation:'none'|'record_failure'|'close_after_successful_probe'; };
export type ProviderRuntimeResponse = { requestId:string; responseId:string; sourceId:ProviderSourceId; capabilityId:ProviderCapabilityId; adapterId:ProviderAdapterId; receivedAt:string; payload:unknown; payloadSchemaStatus:'valid'|'provider_error'|'rate_limited'; payloadSizeBytes:number; recordCount:number; duplicateProviderIds?:string[]; revision?:string|null; provenance:{ requestId:string; sourceId:ProviderSourceId }; error?:{ category:string; message:string }|null; rateLimit?:{ remaining:number; resetAt:string|null }|null; unknownFields?:string[]; nullableFields?:string[]; duplicateRecordKeys?:string[]; };
export type ProviderApiGateSnapshot = { sourceId:ProviderSourceId; capabilityId:ProviderCapabilityId; adapterId:ProviderAdapterId|null; activationMode:ProviderActivationMode; providerCallMode:ProviderCallMode; decisionReason:string; quotaStatus:string; rateLimitStatus:string; costStatus:string; cacheStatus:string; fallbackStatus:ProviderFallbackMode; circuitStatus:CircuitState; requestId:string; responseOrProvenanceId:string|null; redactedErrorCategory:string|null; };

const ACTIVATION = new Set<ProviderActivationMode>(['disabled','fixture_only','dry_run','replay','staging_live_allowed','production_live_allowed']);
const SECRET_KEYS = /api[-_]?key|authorization|bearer|client[-_]?secret|webhook[-_]?secret|provider[-_]?credential|database[-_]?url|databaseUrl|internal[-_]?token|secret/i;
const SECRET_VAL = /(sk_live_|sk_test_|Bearer\s+|api[_-]?key=|postgres:\/\/|-----BEGIN|tok_[a-z0-9])/i;
const DESCRIPTOR_ONLY = new Set(['tradingview_chart_metadata']);
const FIXTURE_ONLY = new Set(['cftc_cot','public_statistics_agencies','calculated_internal_macro_calendar']);
const ASSET_REQUIRED = new Set(['market_price_history','end_of_day_prices','intraday_quotes','cot_report']);

export function redactProviderSecrets<T>(value:T):T { return JSON.parse(JSON.stringify(value, (k, v) => SECRET_KEYS.test(k) ? '[REDACTED]' : (typeof v === 'string' && SECRET_VAL.test(v) ? '[REDACTED]' : v))) as T; }
export function translateProviderCapability(sourceId:string, capabilityId:string): ProviderCapabilityTranslation {
  const d=getProviderDescriptor(sourceId); if(!d) throw new Error('unknown_provider_source_id');
  if(!d.supportedCapabilities.includes(capabilityId as ProviderCapabilityKind)) throw new Error('source_capability_mismatch');
  return { sourceId, capabilityId: capabilityId as ProviderCapabilityKind, adapterId: `${sourceId}_${capabilityId}_adapter` as ProviderAdapterId, descriptorOnly: DESCRIPTOR_ONLY.has(sourceId), secretRequired: d.accessRequirement.includes('api_key') || d.accessRequirement.includes('paid') };
}
export function buildProviderNormalizedRequestKey(req: ProviderRuntimeRequest): string { return buildProviderRequestFingerprint(req); }
function reject(req:ProviderRuntimeRequest, reason:string, mode:ProviderActivationMode, t?:Partial<ProviderCapabilityTranslation>):ProviderRuntimeResolverDecision { return { allowed:false, reason, sourceId:req.sourceId, capabilityId:req.capabilityId, adapterId:t?.adapterId??null, activationMode:mode, providerCallMode:'blocked_live', fallbackMode:req.policy?.fallbackMode??'none', quotaStatus:'ok', rateLimitStatus:'ok', costStatus:'ok', cacheStatus:'miss', circuitStatus:req.policy?.circuitState??'closed', observabilityLabels:{ reason }, validationSchema:'provider_runtime_response_v1', provenanceRequired:true, secretRequired:t?.secretRequired??false, normalizedRequestKey:buildProviderNormalizedRequestKey(req), circuitUpdateRecommendation:'none' }; }
export function resolveProviderRuntimeRequest(req:ProviderRuntimeRequest):ProviderRuntimeResolverDecision {
  const mode=req.activationMode ?? req.policy?.activationMode ?? 'dry_run';
  if(!ACTIVATION.has(mode)) return reject(req,'unknown_activation_mode', 'disabled');
  let t:ProviderCapabilityTranslation; try{ t=translateProviderCapability(req.sourceId, req.capabilityId); }catch(e){ return reject(req, e instanceof Error?e.message:'translation_failed', mode); }
  if(req.policy?.expectedAdapterId && req.policy.expectedAdapterId !== t.adapterId) return reject(req,'adapter_capability_mismatch',mode,t);
  if(!req.provenance?.actor || !req.provenance.purpose) return reject(req,'missing_provenance',mode,t);
  if(SECRET_KEYS.test(JSON.stringify(req.metadata??{})) || SECRET_VAL.test(JSON.stringify(req.metadata??{}))) return reject(req,'secret_like_request_metadata',mode,t);
  for (const field of req.policy?.requiredFields ?? []) { if ((req as unknown as Record<string, unknown>)[field] === undefined || (req as unknown as Record<string, unknown>)[field] === null || (req as unknown as Record<string, unknown>)[field] === '') return reject(req,`missing_required_field:${field}`,mode,t); }
  if(ASSET_REQUIRED.has(req.capabilityId) && !req.asset) return reject(req,'missing_asset',mode,t);
  if(req.asset==='unsupported_asset') return reject(req,'unsupported_asset',mode,t);
  if(req.startAt&&req.endAt){ const days=(Date.parse(req.endAt)-Date.parse(req.startAt))/86400000; if(!Number.isFinite(days)||days<0) return reject(req,'invalid_time_range',mode,t); if(days>(req.policy?.maxWindowDays??370)) return reject(req,'oversized_window',mode,t); }
  if(req.paginationCursor && !/^[A-Za-z0-9._:-]{1,128}$/.test(req.paginationCursor)) return reject(req,'invalid_pagination_cursor',mode,t);
  if((mode==='replay'||req.replayPayload) && !req.idempotencyKey) return reject(req,'missing_idempotency_key',mode,t);
  if((req.policy?.quotaUsed??0) >= (req.policy?.quotaLimit??Number.POSITIVE_INFINITY)) return {...reject(req,'quota_exceeded',mode,t), quotaStatus:'exceeded'};
  if((req.policy?.rateLimitRemaining??1) <= 0) return {...reject(req,'rate_limit_exceeded',mode,t), rateLimitStatus:'exceeded'};
  if((req.policy?.costBudgetRemaining??1) <= 0) return {...reject(req,'cost_budget_exceeded',mode,t), costStatus:'exceeded'};
  if(req.policy?.circuitState==='open') return reject(req,'circuit_open',mode,t);
  if(t.descriptorOnly && (mode==='staging_live_allowed'||mode==='production_live_allowed')) return reject(req,'descriptor_only_provider_cannot_execute',mode,t);
  if(FIXTURE_ONLY.has(req.sourceId) && (mode==='staging_live_allowed'||mode==='production_live_allowed')) return reject(req,'fixture_only_provider_cannot_execute_live',mode,t);
  if(mode==='production_live_allowed') return reject(req,'production_live_not_approved',mode,t);
  if(mode==='staging_live_allowed' && !req.policy?.explicitStagingLiveAllow) return reject(req,'staging_live_requires_explicit_allow',mode,t);
  if(mode==='staging_live_allowed' && t.secretRequired && !(req.policy?.requestMetadata?.credentialPresent === true)) return reject(req,'staging_live_missing_required_secret',mode,t);
  const providerCallMode:ProviderCallMode = mode==='fixture_only'?'fixture_response':mode==='dry_run'?'dry_run_no_external_call':mode==='replay'?'replay_captured_payload':mode==='staging_live_allowed'?'live_staging_call':'blocked_live';
  return { allowed: mode!=='disabled', reason: mode==='disabled'?'disabled':'allowed', sourceId:req.sourceId, capabilityId:req.capabilityId, adapterId:t.adapterId, activationMode:mode, providerCallMode, fallbackMode:req.policy?.fallbackMode??'none', quotaStatus:'ok', rateLimitStatus:'ok', costStatus:'ok', cacheStatus:req.policy?.cacheHitPayload?'hit':'miss', circuitStatus:req.policy?.circuitState??'closed', observabilityLabels:{sourceId:req.sourceId,capabilityId:req.capabilityId,providerCallMode}, validationSchema:'provider_runtime_response_v1', provenanceRequired:true, secretRequired:t.secretRequired, normalizedRequestKey:buildProviderNormalizedRequestKey(req), circuitUpdateRecommendation:req.policy?.circuitState==='half_open'?'close_after_successful_probe':'none' };
}
export function assertProviderApiGateRequestAllowed(req:ProviderRuntimeRequest):ProviderRuntimeResolverDecision { const d=resolveProviderRuntimeRequest(req); if(!d.allowed) throw new Error(d.reason); return d; }
function collectDuplicateRecordKeys(payload: unknown, key: string): string[] { if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { records?: unknown[]; rows?: unknown[]; bars?: unknown[] }).records ?? (payload as { rows?: unknown[] }).rows ?? (payload as { bars?: unknown[] }).bars)) return []; const rows = ((payload as { records?: unknown[]; rows?: unknown[]; bars?: unknown[] }).records ?? (payload as { rows?: unknown[] }).rows ?? (payload as { bars?: unknown[] }).bars) as unknown[]; const seen = new Set<string>(); const dupes = new Set<string>(); for (const row of rows) { const value = String((row as Record<string, unknown>)?.[key] ?? ''); if (!value) continue; if (seen.has(value)) dupes.add(value); seen.add(value); } return [...dupes].sort(); }
export function validateProviderRuntimeResponse(r:ProviderRuntimeResponse, decision:ProviderRuntimeResolverDecision, policy:ProviderApiGatePolicy = {}):ProviderRuntimeResponse {
  if(r.sourceId!==decision.sourceId||r.capabilityId!==decision.capabilityId||r.adapterId!==decision.adapterId) throw new Error('response_provenance_mismatch');
  if(!r.requestId||!r.responseId||!r.receivedAt) throw new Error('response_identity_missing');
  if(policy.observedResponseIds?.includes(r.responseId)) throw new Error('duplicate_response_id');
  if(r.payloadSizeBytes>1024*1024) throw new Error('oversized_response');
  if(r.payloadSchemaStatus==='valid' && r.error) throw new Error('valid_response_with_error');
  if(!policy.allowUnknownFields && r.unknownFields && r.unknownFields.length > 0) throw new Error('unknown_response_fields');
  const illegalNulls = (r.nullableFields ?? []).filter((field) => !(policy.allowedNullableFields ?? []).includes(field));
  if(illegalNulls.length > 0) throw new Error(`nullable_field_not_allowed:${illegalNulls[0]}`);
  const duplicateRecordKeys = policy.dedupeRecordKey ? collectDuplicateRecordKeys(r.payload, policy.dedupeRecordKey) : (r.duplicateRecordKeys ?? []);
  return redactProviderSecrets({ ...r, duplicateRecordKeys });
}
function errorResponse(req:ProviderRuntimeRequest, decision:ProviderRuntimeResolverDecision, category:string, message = category):ProviderRuntimeResponse { return {requestId:req.requestId,responseId:`blocked-${req.requestId}`,sourceId:req.sourceId,capabilityId:req.capabilityId,adapterId:decision.adapterId ?? `${req.sourceId}_${req.capabilityId}_adapter`,receivedAt:new Date().toISOString(),payload:null,payloadSchemaStatus:'provider_error',payloadSizeBytes:0,recordCount:0,provenance:{requestId:req.requestId,sourceId:req.sourceId},error:{category,message},rateLimit:null}; }
export type ProviderApiGateExecutionContext = { providerControlStore?:ProviderControlStore; policyResolver?:ProviderControlPolicyResolver; credentialPoolId?:string; evaluatedAt?:number };
export type ProviderApiGateExecutionResult = { decision:ProviderRuntimeResolverDecision; response:ProviderRuntimeResponse|null; snapshot:ProviderApiGateSnapshot; providerControlSnapshot?:ProviderControlSnapshot; settlementState:ProviderSettlementState };
const POLICY_REASONS=new Set(['provider_control_policy_not_approved','provider_control_policy_scope_mismatch','provider_control_lease_timeout_invariant']);
function distributedDenial(decision:ProviderRuntimeResolverDecision,reason:string):ProviderRuntimeResolverDecision { return {...decision,allowed:false,reason,providerCallMode:'blocked_live',rateLimitStatus:reason==='provider_rate_exhausted'?'exceeded':decision.rateLimitStatus,quotaStatus:reason==='provider_quota_exhausted'?'exceeded':decision.quotaStatus,costStatus:reason==='provider_cost_exhausted'?'exceeded':decision.costStatus,observabilityLabels:{reason}}; }
export async function executeProviderApiGateRequest(req:ProviderRuntimeRequest,adapter?:MarketEvidenceProviderAdapter,context:ProviderApiGateExecutionContext={}):Promise<ProviderApiGateExecutionResult> {
  let decision=resolveProviderRuntimeRequest(req),response:ProviderRuntimeResponse|null=null,reservation:ProviderReservation|undefined,controlSnapshot:ProviderControlSnapshot|undefined,executionPolicy:ProviderControlPolicy|undefined,providerInvoked=false,settlementState:ProviderSettlementState='not_required';
  if(decision.allowed&&decision.providerCallMode==='live_staging_call') {
    const pool=context.credentialPoolId,evaluatedAt=context.evaluatedAt??Date.now();let trustedPolicy:ProviderControlPolicy|null=null;
    if(!context.policyResolver||!pool) decision=distributedDenial(decision,'provider_control_policy_missing');
    else { try {trustedPolicy=await context.policyResolver.resolve({sourceId:req.sourceId,capabilityId:req.capabilityId,credentialPoolId:pool,evaluatedAt});if(!trustedPolicy)decision=distributedDenial(decision,'provider_control_policy_missing');else {assertLivePolicyAuthority(trustedPolicy,req,pool,evaluatedAt);validateProviderExecutionLease(trustedPolicy);executionPolicy=trustedPolicy;}}catch(error){const reason=error instanceof Error&&POLICY_REASONS.has(error.message)?error.message:'provider_control_policy_missing';decision=distributedDenial(decision,reason);} }
    if(decision.allowed&&trustedPolicy){if(!context.providerControlStore||context.providerControlStore.kind!=='redis')decision=distributedDenial(decision,'provider_control_unavailable');else {const fingerprint=buildProviderRequestFingerprint(req),admission=await context.providerControlStore.admit({admissionId:buildProviderAdmissionId(req.requestId),reservationId:randomUUID(),ownerToken:randomUUID(),requestId:req.requestId,fingerprint,policy:trustedPolicy});if(!admission.allowed){decision=distributedDenial(decision,admission.reason);if('snapshot' in admission)controlSnapshot=admission.snapshot;}else{const executionToken=randomUUID(),claim=await context.providerControlStore.claimExecution(admission.reservation,executionToken);if(!claim.claimed){decision=distributedDenial(decision,'reason' in claim?claim.reason:'provider_control_unavailable');}else{reservation=claim.reservation;controlSnapshot=reservation.snapshot;settlementState='reserved';}}}}
  }
  const settle=async(status:Exclude<ProviderReservation['status'],'RESERVED'|'EXECUTING'>)=>{if(!reservation)return;const ok=await context.providerControlStore!.settle(reservation,status);settlementState=!ok?'settlement_unconfirmed':status==='COMMITTED'?'settled_committed':status==='RELEASED'?'settled_released':'settled_unknown_outcome';};
  try {
    if(!decision.allowed)response=req.policy?.fallbackMode==='stale_if_error'&&req.policy.stalePayload?req.policy.stalePayload:null;
    else if(req.policy?.cacheHitPayload)response=req.policy.cacheHitPayload;
    else if(decision.providerCallMode==='replay_captured_payload')response=req.replayPayload??null;
    else if(decision.providerCallMode==='dry_run_no_external_call')response={requestId:req.requestId,responseId:`dry-${req.requestId}`,sourceId:req.sourceId,capabilityId:req.capabilityId,adapterId:decision.adapterId!,receivedAt:new Date().toISOString(),payload:{dryRun:true,normalizedRequestKey:decision.normalizedRequestKey},payloadSchemaStatus:'valid',payloadSizeBytes:15,recordCount:0,provenance:{requestId:req.requestId,sourceId:req.sourceId},error:null,rateLimit:null};
    else if(decision.providerCallMode==='live_production_call')response=errorResponse(req,decision,'production_live_not_approved');
    else if(decision.providerCallMode==='live_staging_call'&&adapter&&!adapter.fetchManaged){decision=distributedDenial(decision,'provider_control_managed_adapter_required');response=null;}
    else if(decision.providerCallMode==='live_staging_call'&&adapter&&executionPolicy){const sourceReq:ProviderSourceRequest={requestId:req.requestId,providerId:req.sourceId,capability:req.capabilityId,asset:req.asset??null,region:req.region??null,evidenceTypeId:req.capabilityId,requestedAt:new Date().toISOString(),paramsJson:JSON.stringify(req.providerRequestParams??{})};const controller=new AbortController(),timer=setTimeout(()=>controller.abort(new Error('provider_control_execution_timeout')),executionPolicy.concurrency.providerTimeoutMs);providerInvoked=true;let res:ProviderSourceResponse;try{res=await adapter.fetchManaged!(sourceReq,{signal:controller.signal,timeoutMs:executionPolicy.concurrency.providerTimeoutMs});}finally{clearTimeout(timer);}response={requestId:req.requestId,responseId:`staging-${req.requestId}`,sourceId:req.sourceId,capabilityId:req.capabilityId,adapterId:decision.adapterId!,receivedAt:res.fetchedAt,payload:res.rawPayloadJson?JSON.parse(res.rawPayloadJson):null,payloadSchemaStatus:res.status==='success'?'valid':res.errorCode==='rate_limited'?'rate_limited':'provider_error',payloadSizeBytes:(res.rawPayloadJson??'').length,recordCount:0,provenance:{requestId:req.requestId,sourceId:req.sourceId},error:res.errorCode?{category:res.errorCode,message:redactProviderSecrets(res.errorMessage??'')}:null,rateLimit:res.errorCode==='rate_limited'?{remaining:0,resetAt:null}:null};}
    else if(decision.providerCallMode==='live_staging_call')response=errorResponse(req,decision,'managed_adapter_required');
    else if(decision.providerCallMode==='fixture_response'&&adapter){const sourceReq:ProviderSourceRequest={requestId:req.requestId,providerId:req.sourceId,capability:req.capabilityId,asset:req.asset??null,region:req.region??null,evidenceTypeId:req.capabilityId,requestedAt:new Date().toISOString(),paramsJson:'{}'};const res:ProviderSourceResponse=await adapter.fetch(sourceReq);response={requestId:req.requestId,responseId:`fixture-${req.requestId}`,sourceId:req.sourceId,capabilityId:req.capabilityId,adapterId:decision.adapterId!,receivedAt:res.fetchedAt,payload:res.rawPayloadJson?JSON.parse(res.rawPayloadJson):null,payloadSchemaStatus:res.status==='success'?'valid':res.errorCode==='rate_limited'?'rate_limited':'provider_error',payloadSizeBytes:(res.rawPayloadJson??'').length,recordCount:0,provenance:{requestId:req.requestId,sourceId:req.sourceId},error:res.errorCode?{category:res.errorCode,message:redactProviderSecrets(res.errorMessage??'')}:null,rateLimit:res.errorCode==='rate_limited'?{remaining:0,resetAt:null}:null};}
    if(response)response=validateProviderRuntimeResponse(response,decision,req.policy);if(reservation)await settle(response?.payloadSchemaStatus==='valid'?'COMMITTED':providerInvoked?'COMMIT_REQUIRED_UNKNOWN_OUTCOME':'RELEASED');
  } catch(error){if(reservation)await settle(providerInvoked?'COMMIT_REQUIRED_UNKNOWN_OUTCOME':'RELEASED');throw error;}
  const snapshot=buildProviderApiGateSnapshot(decision,req.requestId,response,response?.error?.category);return {decision,response,snapshot,...(controlSnapshot?{providerControlSnapshot:controlSnapshot}:{}),settlementState};
}
export function buildProviderApiGateSnapshot(d:ProviderRuntimeResolverDecision, requestId:string, response:ProviderRuntimeResponse|null, error?:unknown):ProviderApiGateSnapshot { return redactProviderSecrets({ sourceId:d.sourceId, capabilityId:d.capabilityId, adapterId:d.adapterId, activationMode:d.activationMode, providerCallMode:d.providerCallMode, decisionReason:d.reason, quotaStatus:d.quotaStatus, rateLimitStatus:d.rateLimitStatus, costStatus:d.costStatus, cacheStatus:d.cacheStatus, fallbackStatus:d.fallbackMode, circuitStatus:d.circuitStatus, requestId, responseOrProvenanceId:response?.responseId??response?.provenance.requestId??null, redactedErrorCategory:error instanceof Error?error.message:typeof error === 'string'?error:null }); }
