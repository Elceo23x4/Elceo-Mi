import type { ProviderSourceRequest, ProviderSourceResponse } from '@elceo/types';
import type { MarketEvidenceProviderAdapter } from '../normalization-contracts';
import { getProviderDescriptor } from '../provider-capability-registry';
import { TREASURY_FIXTURE } from './fixtures';
import { buildAuctionPayload, buildDebtSupplyPayload, buildRealYieldPayload } from './treasury-normalizer';
import type { TreasuryFixtureResponse } from './treasury-contracts';
const SUPPORTED=new Set(['real_yield_series','bond_auction_result','debt_supply_calendar']);
export class TreasuryFixtureAdapter implements MarketEvidenceProviderAdapter { descriptor=getProviderDescriptor('us_treasury') ?? (()=>{throw new Error('missing_treasury_descriptor')})();
async fetch(request:ProviderSourceRequest):Promise<ProviderSourceResponse>{ if(!SUPPORTED.has(request.capability)) return {...b(request),status:'unsupported',errorCode:'unsupported_capability',errorMessage:`Unsupported capability: ${request.capability}`}; return {...b(request),status:'success',sourceUrl:`fixture://${request.providerId}/${request.capability}`,rawPayloadJson:JSON.stringify({...TREASURY_FIXTURE,request:{providerId:request.providerId,region:request.region??'united_states',capability:request.capability,requestedAt:request.requestedAt}})}; }
async normalize(response:ProviderSourceResponse){ if(!response.rawPayloadJson||response.rawPayloadJson.trim()==='') return []; const p=JSON.parse(response.rawPayloadJson) as TreasuryFixtureResponse; if(!p?.request||!Array.isArray(p.realYieldRows)||!Array.isArray(p.auctionRows)||!Array.isArray(p.debtSupplyRows)) throw new Error('treasury_malformed_payload'); return [...p.realYieldRows.map((x)=>buildRealYieldPayload(p.request,x,response.providerId)),...p.auctionRows.map((x)=>buildAuctionPayload(p.request,x,response.providerId)),...p.debtSupplyRows.map((x)=>buildDebtSupplyPayload(p.request,x,response.providerId))]; }
}
const b=(r:ProviderSourceRequest):ProviderSourceResponse=>({requestId:r.requestId,providerId:r.providerId,capability:r.capability,status:'failed',fetchedAt:r.requestedAt,sourceUrl:null,rawPayloadJson:null,errorCode:null,errorMessage:null});
