import type { ProviderSourceRequest, ProviderSourceResponse } from '@elceo/types';
import type { MarketEvidenceProviderAdapter } from '../normalization-contracts';
import { getProviderDescriptor } from '../provider-capability-registry';
import { COT_FIXTURES } from './fixtures';
import type { CotFixtureResponse } from './cot-contracts';
import { COT_PROVIDER_ID, mapAssetToCotMarket, normalizeCotRows } from './cot-normalizer';

const SUPPORTED = new Set(['cot_report']);
export class CftcCotAdapter implements MarketEvidenceProviderAdapter {
 descriptor = getProviderDescriptor(COT_PROVIDER_ID) ?? (()=>{throw new Error('missing_cot_descriptor')})();
 async fetch(request: ProviderSourceRequest): Promise<ProviderSourceResponse> { if(!SUPPORTED.has(request.capability)) return {...base(request),status:'unsupported',errorCode:'unsupported_capability',errorMessage:`Unsupported capability: ${request.capability}`}; const fixture=request.asset?COT_FIXTURES[request.asset]:undefined; const payload = fixture ?? {request:{asset:request.asset,reportKind:'legacy_futures_only',requestedAt:request.requestedAt,region:request.region},rows:[]}; return {...base(request),status:'success',rawPayloadJson:JSON.stringify(payload),sourceUrl:`fixture://cftc/${mapAssetToCotMarket(request.asset)}`}; }
 async normalize(response: ProviderSourceResponse){ if(!response.rawPayloadJson||response.rawPayloadJson.trim()==='') return []; const parsed = JSON.parse(response.rawPayloadJson) as CotFixtureResponse; if(!parsed||!parsed.request||!Array.isArray(parsed.rows)) throw new Error('cot_malformed_payload'); return normalizeCotRows(parsed.request, parsed.rows, response.providerId); }
}
const base=(r:ProviderSourceRequest):ProviderSourceResponse=>({requestId:r.requestId,providerId:r.providerId,capability:r.capability,status:'failed',fetchedAt:r.requestedAt,sourceUrl:null,rawPayloadJson:null,errorCode:null,errorMessage:null});
