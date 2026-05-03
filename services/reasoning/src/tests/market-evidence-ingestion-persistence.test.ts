import assert from 'node:assert/strict';
import { MemoryNormalizedMarketEvidencePayloadRepository, MemoryProviderSourceRequestRepository, MemoryProviderSourceResponseRepository } from '../persistence/market-evidence-ingestion-repository.js';
import { IngestionPersistenceService } from '../provider-sources/ingestion-persistence-service.js';
import { TiingoMarketDataAdapter } from '../provider-sources/tiingo/tiingo-adapter.js';
import { deserializeProviderSourceRequest, serializeProviderSourceRequest } from '../provider-sources/serialization.js';

export async function runMarketEvidenceIngestionPersistenceTests(): Promise<void> {
 const req=new MemoryProviderSourceRequestRepository(); const res=new MemoryProviderSourceResponseRepository(); const pay=new MemoryNormalizedMarketEvidencePayloadRepository();
 const svc=new IngestionPersistenceService(req,res,pay);
 const request={requestId:'r1',providerId:'tiingo_market_data',capability:'market_price_history' as const,asset:'EURUSD',region:'GLOBAL',evidenceTypeId:'fx_spot_price_bar',requestedAt:'2026-01-01T00:00:00.000Z',paramsJson:'{}'};
 const response={requestId:'r1',providerId:'tiingo_market_data',capability:'market_price_history' as const,status:'success' as const,fetchedAt:'2026-01-01T00:00:01.000Z',sourceUrl:null,rawPayloadJson:'{}',errorCode:null,errorMessage:null};
 const report=await svc.persistIngestionResult(request,response,[]); assert.equal(report.requestId,'r1');
 assert.equal(deserializeProviderSourceRequest(serializeProviderSourceRequest(request)).requestId,'r1');
 let threw=false; try{deserializeProviderSourceRequest('{');}catch{threw=true;} assert.equal(threw,true);
 const adapter=new TiingoMarketDataAdapter(); const report2=await svc.persistAdapterFetchAndNormalize(adapter,{...request,requestId:'r2',requestedAt:'2026-01-01T00:00:02.000Z'}); assert.equal(report2.requestId,'r2');
}
