import type { ProviderSourceRequest, ProviderSourceResponse } from '@elceo/types';
import type { MarketEvidenceProviderAdapter } from '../normalization-contracts';
import { getProviderDescriptor } from '../provider-capability-registry';
import { BANK_REPORTS_FIXTURE } from './fixtures';
import { buildBankEarningsPayload, buildBankHealthPayload } from './bank-reports-normalizer';
const SUPPORTED=new Set(['bank_health_metric','bank_earnings_report']);
const base=(r:ProviderSourceRequest):ProviderSourceResponse=>({requestId:r.requestId,providerId:r.providerId,capability:r.capability,status:'failed',fetchedAt:r.requestedAt,sourceUrl:null,rawPayloadJson:null,errorCode:'not_fetched',errorMessage:'not fetched'});
export class BankReportsFixtureAdapter implements MarketEvidenceProviderAdapter { descriptor=getProviderDescriptor('bank_public_reports')??(()=>{throw new Error('missing_bank_reports_descriptor')})();
async fetch(request:ProviderSourceRequest): Promise<ProviderSourceResponse> { if(!SUPPORTED.has(request.capability)) return {...base(request),status:'unsupported',errorCode:'unsupported_capability',errorMessage:`Unsupported capability: ${request.capability}`}; const fixture={...BANK_REPORTS_FIXTURE,request:{providerId:request.providerId,region:request.region,institution:request.asset,capability:request.capability as 'bank_health_metric'|'bank_earnings_report',requestedAt:request.requestedAt}}; return {...base(request),status:'success',sourceUrl:`fixture://bank-reports/${request.capability}`,rawPayloadJson:JSON.stringify(fixture),errorCode:null,errorMessage:null}; }
async normalize(response:ProviderSourceResponse){ if(!response.rawPayloadJson) throw new Error('bank_reports_missing_payload'); let parsed:typeof BANK_REPORTS_FIXTURE; try{parsed=JSON.parse(response.rawPayloadJson) as typeof BANK_REPORTS_FIXTURE;}catch{throw new Error('bank_reports_malformed_payload');} if(response.capability==='bank_health_metric') return parsed.healthRows.map((x)=>buildBankHealthPayload(parsed.request,x)); if(response.capability==='bank_earnings_report') return parsed.earningsRows.map((x)=>buildBankEarningsPayload(parsed.request,x)); return []; }
}
