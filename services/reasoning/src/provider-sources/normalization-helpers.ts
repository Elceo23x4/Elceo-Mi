import type { ProviderSourceRequest, ProviderSourceResponse } from '@elceo/types';
export const buildNormalizedPayloadId=(providerId:string,evidenceTypeId:string,observedAt:string,asset?:string|null):string=>`${providerId}|${evidenceTypeId}|${observedAt}|${asset??'global'}`;
export const clampConfidenceScore=(value:number):number=>Math.max(0,Math.min(100,Number.isFinite(value)?value:0));
export const buildValuesJson=(value:unknown):string=>JSON.stringify(value);
export const buildMetadataJson=(value:unknown):string=>JSON.stringify(value);
export const normalizeProviderFailure=(request:ProviderSourceRequest,errorCode:string,message:string):ProviderSourceResponse=>({requestId:request.requestId,providerId:request.providerId,capability:request.capability,status:'failed',fetchedAt:new Date(0).toISOString(),sourceUrl:null,rawPayloadJson:null,errorCode,errorMessage:message});
