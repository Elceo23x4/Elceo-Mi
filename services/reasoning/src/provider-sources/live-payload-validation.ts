import { createHash } from 'node:crypto';
import type { ProviderCapabilityKind } from '@elceo/types';
import { redactProviderSecrets, type ProviderRuntimeResponse } from './provider-api-gate.js';
import { getProviderDescriptor } from './provider-capability-registry.js';

export type ProviderValidationClass = 'staging_live_supported_now'|'fixture_or_replay_only'|'descriptor_only'|'requires_credentials_not_available'|'requires_manual_provider_review'|'blocked_until_later_batch';
export type CapturedPayloadContract = { sourceId:string; capabilityId:ProviderCapabilityKind; adapterId:string; capturedAt:string; requestId:string; requestParameters:Record<string,unknown>; providerStatus:'success'|'error'|'rate_limited'; httpStatus?:number; rateLimit?:{ remaining:number|null; resetAt:string|null; limit?:number|null }; pagination?:{ cursor:string|null; nextCursor:string|null; hasNextPage:boolean }; rawPayloadChecksum:string; normalizedPayloadChecksum:string; recordCount:number; nullableFieldsObserved:string[]; unknownFieldsObserved:string[]; duplicateProviderIdsObserved:string[]; revisionBackfillMarker:string|null; errorBody:unknown|null; redactionProof:{ checked:boolean; secretLikeValuesFound:number; redacted:boolean } };
export type PaginationValidationInput = { cursors:(string|null)[]; pageSizes:number[]; timestamps:string[]; maxPages:number; maxPageSize:number; nextCursor?:string|null; revisionBackfillMarker?:string|null; duplicateRecordKeys?:string[] };

const SECRET_VALUE = /(sk_live_|sk_test_|Bearer\s+|api[_-]?key=|postgres:\/\/|-----BEGIN|tok_[a-z0-9]|secret_[a-z0-9])/i;
const EXECUTABLE = new Set(['tiingo_market_data','cftc_cot','federal_reserve','ecb_public','boj_public','us_treasury','fred','public_statistics_agencies','calculated_internal_macro_calendar','calculated_internal_conditions']);
const CREDENTIALS = new Set(['tiingo_market_data','fred']);
const DESCRIPTOR = new Set(['tradingview_chart_metadata']);
const MANUAL = new Set(['precious_metals_public_flows','bank_public_reports']);

export const hashPayload = (payload: unknown): string => createHash('sha256').update(JSON.stringify(redactProviderSecrets(payload))).digest('hex');
export const countRecords = (payload: unknown): number => Array.isArray(payload) ? payload.length : Array.isArray((payload as { records?: unknown[] })?.records) ? (payload as { records: unknown[] }).records.length : Array.isArray((payload as { bars?: unknown[] })?.bars) ? (payload as { bars: unknown[] }).bars.length : Array.isArray((payload as { rows?: unknown[] })?.rows) ? (payload as { rows: unknown[] }).rows.length : 0;
function scanSecretLike(value: unknown): number { const text = JSON.stringify(value); return SECRET_VALUE.test(text) ? 1 : 0; }
function validIso(value: string): boolean { const t=Date.parse(value); return Number.isFinite(t) && new Date(t).toISOString()===value; }

export function classifyProviderSource(sourceId:string):ProviderValidationClass{
  const d=getProviderDescriptor(sourceId); if(!d) return 'blocked_until_later_batch';
  if(DESCRIPTOR.has(sourceId)) return 'descriptor_only';
  if(CREDENTIALS.has(sourceId)) return 'requires_credentials_not_available';
  if(MANUAL.has(sourceId)) return 'requires_manual_provider_review';
  if(EXECUTABLE.has(sourceId)) return 'fixture_or_replay_only';
  return d.accessRequirement.includes('paid') ? 'requires_credentials_not_available' : 'blocked_until_later_batch';
}

export function buildCapturedPayloadContract(response:ProviderRuntimeResponse, requestParameters:Record<string,unknown> = {}):CapturedPayloadContract{
  const redacted = redactProviderSecrets(response.payload);
  const contract: CapturedPayloadContract = { sourceId:response.sourceId, capabilityId:response.capabilityId, adapterId:response.adapterId, capturedAt:response.receivedAt, requestId:response.requestId, requestParameters:redactProviderSecrets(requestParameters), providerStatus:response.payloadSchemaStatus==='rate_limited'?'rate_limited':response.payloadSchemaStatus==='provider_error'?'error':'success', httpStatus:response.error?500:200, pagination:{cursor:String(requestParameters.paginationCursor??'')||null,nextCursor:(response.payload as { nextCursor?: string|null })?.nextCursor??null,hasNextPage:Boolean((response.payload as { nextCursor?: string|null })?.nextCursor)}, rawPayloadChecksum:hashPayload(response.payload), normalizedPayloadChecksum:hashPayload(redacted), recordCount:response.recordCount||countRecords(response.payload), nullableFieldsObserved:response.nullableFields??[], unknownFieldsObserved:response.unknownFields??[], duplicateProviderIdsObserved:response.duplicateProviderIds??[], revisionBackfillMarker:response.revision??null, errorBody:response.error?redactProviderSecrets(response.error):null, redactionProof:{checked:true, secretLikeValuesFound:scanSecretLike(redacted), redacted:scanSecretLike(redacted)===0} };
  if(response.rateLimit) contract.rateLimit={remaining:response.rateLimit.remaining,resetAt:response.rateLimit.resetAt};
  return contract;
}

export function validateCapturedPayloadContract(c:CapturedPayloadContract): string[] { const errors:string[]=[]; for(const f of ['sourceId','capabilityId','adapterId','capturedAt','requestId','rawPayloadChecksum','normalizedPayloadChecksum'] as const){ if(!c[f]) errors.push(`missing_${f}`); } if(!validIso(c.capturedAt)) errors.push('invalid_capturedAt'); if(c.recordCount<0||c.recordCount>10000) errors.push('record_count_bound'); if(c.redactionProof.secretLikeValuesFound>0||!c.redactionProof.redacted) errors.push('secret_like_value'); if(c.unknownFieldsObserved.length>0) errors.push('unknown_fields_observed'); return errors; }

export function validateProviderPayloadSchema(response:ProviderRuntimeResponse, opts:{allowUnknownFields?:boolean; allowedNullableFields?:string[]; dedupePolicy?:'deterministic'; maxPayloadBytes?:number; maxRecordCount?:number}={}):ProviderRuntimeResponse{
  if(!response.sourceId||!response.capabilityId||!response.adapterId||!response.requestId||!response.responseId) throw new Error('missing_required_identity');
  if(!validIso(response.receivedAt)) throw new Error('invalid_timestamp');
  if(response.payloadSizeBytes>(opts.maxPayloadBytes??1024*1024)) throw new Error('unbounded_or_oversized_payload');
  if(response.recordCount>(opts.maxRecordCount??10000)) throw new Error('record_count_bound');
  if(!opts.allowUnknownFields && (response.unknownFields?.length??0)>0) throw new Error('silent_unknown_field');
  const badNull=(response.nullableFields??[]).find((f)=>!(opts.allowedNullableFields??[]).includes(f)); if(badNull) throw new Error('nullable_required_field');
  if((response.duplicateProviderIds?.length??0)>0 && opts.dedupePolicy!=='deterministic') throw new Error('duplicate_response_id_without_dedupe_policy');
  if((response.duplicateRecordKeys?.length??0)>0 && opts.dedupePolicy!=='deterministic') throw new Error('duplicate_record_without_dedupe_policy');
  if(response.payloadSchemaStatus==='provider_error' && !response.error) throw new Error('unhandled_provider_error_body');
  if(response.payloadSchemaStatus==='rate_limited' && !response.rateLimit) throw new Error('unhandled_provider_rate_limit_body');
  if(scanSecretLike(response)>0) throw new Error('secret_like_value');
  return redactProviderSecrets(response);
}

export function validatePaginationAndBackfill(input:PaginationValidationInput):string[]{ const errors:string[]=[]; if(input.cursors.length>input.maxPages) errors.push('pagination_loop_risk'); const seen=new Set<string>(); for(const c of input.cursors){ if(c&&seen.has(c)) errors.push('cursor_loop_detected'); if(c) seen.add(c); if(c&&!/^[A-Za-z0-9._:-]{1,128}$/.test(c)) errors.push('invalid_cursor'); } if(input.pageSizes.some((x)=>x>input.maxPageSize)) errors.push('oversized_page'); for(const t of input.timestamps){ if(!Number.isFinite(Date.parse(t))) errors.push('invalid_timestamp'); } if(input.duplicateRecordKeys?.length && !input.revisionBackfillMarker) errors.push('duplicate_across_pages_requires_dedupe_marker'); return [...new Set(errors)]; }
