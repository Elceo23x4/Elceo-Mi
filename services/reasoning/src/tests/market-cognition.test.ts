import { strict as a } from 'node:assert';
import { validateMarketCognitionSignal, validateMarketCognitionSnapshot } from '@elceo/schemas';
import { buildMarketCognitionSnapshot } from '../market-cognition/index.js';
import { CanonicalMarketIntelligenceBoundaryService } from '../runtime/canonical-market-intelligence-boundary.js';
import { MemoryMarketEvidenceRegistrySnapshotRepository, MemorySeoContentArchitectureSnapshotRepository } from '../persistence/registry-snapshot-repository.js';
import { MemoryNormalizedMarketEvidencePayloadRepository, MemoryProviderSourceRequestRepository, MemoryProviderSourceResponseRepository } from '../persistence/market-evidence-ingestion-repository.js';

const mk=(id:string,cls:string,dir:string,reason='')=>({payloadId:id,asset:'xau_usd' as const,horizon:'intraday' as const,evidenceTypeId:cls,evidenceClass:cls as never,providerId:'p',observedAt:'2026-01-01T00:00:00.000Z',finalQualityScore:80,baseWeight:60,qualityAdjustedWeight:48,role:'primary_driver' as const,direction:dir as never,contributionScore:dir==='bullish'?48:dir==='bearish'?-48:0,reasons:reason?[reason]:[]});

export async function runMarketCognitionTests(){
  const weighted={snapshotId:'w',generatedAt:'2026-01-01T00:00:00.000Z',asset:'xau_usd' as const,horizon:'intraday' as const,totalWeight:100,usableWeight:80,excludedWeight:0,items:[mk('1','inflation','bullish'),mk('2','interest_rates','bearish'),mk('3','risk_sentiment','bullish'),mk('4','volatility_surface','bearish','stale')],warnings:[]};
  const snapshot=buildMarketCognitionSnapshot(weighted);
  a.ok(validateMarketCognitionSnapshot(snapshot).ok);
  a.ok(snapshot.signals.some((s)=>s.direction==='bullish'||s.direction==='bearish'||s.direction==='mixed'||s.direction==='unknown'));
  a.ok(snapshot.signals.every((s)=>validateMarketCognitionSignal(s).ok));
  a.ok(snapshot.contradictions.length>=1);
  a.ok(snapshot.warnings.length>=0);
  a.ok(snapshot.confidence.finalConfidence>=0&&snapshot.confidence.finalConfidence<=100);
  a.ok(snapshot.narrative.title.length>0&&snapshot.narrative.summary.length>0&&snapshot.narrative.keyDrivers.length>0);
  const text=JSON.stringify(snapshot).toLowerCase(); a.ok(!text.includes('buy')&&!text.includes('sell')&&!text.includes('hold'));
  const invalid=validateMarketCognitionSignal({...snapshot.signals[0],strength:111}); a.equal(invalid.ok,false);

  const b=new CanonicalMarketIntelligenceBoundaryService(new MemoryMarketEvidenceRegistrySnapshotRepository(),new MemorySeoContentArchitectureSnapshotRepository(),new MemoryProviderSourceRequestRepository(),new MemoryProviderSourceResponseRepository(),new MemoryNormalizedMarketEvidencePayloadRepository());
  await b.persistIngestionResult({requestId:'r1',providerId:'tiingo_market_data',capability:'market_price_history',asset:'xau_usd',region:'global',evidenceTypeId:'inflation',requestedAt:'2026-01-01T00:00:00.000Z',paramsJson:'{}'},{requestId:'r1',providerId:'tiingo_market_data',capability:'market_price_history',status:'success',fetchedAt:'2026-01-01T00:00:00.000Z',sourceUrl:null,rawPayloadJson:'{}',errorCode:null,errorMessage:null},[{payloadId:'p1',providerId:'tiingo_market_data',sourceId:null,evidenceTypeId:'inflation',evidenceClass:'inflation',asset:'xau_usd',region:'global',observedAt:'2026-01-01T00:00:00.000Z',publishedAt:null,normalizedAt:'2026-01-01T00:00:00.000Z',confidenceScore:80,dataQuality:'high',valuesJson:'{}',metadataJson:'{"direction":"bullish"}'}]);
  const byAsset=await b.getMarketCognitionByAsset('xau_usd','intraday',20,'2026-01-01T00:00:00.000Z');
  a.equal(byAsset.asset,'xau_usd');
}
