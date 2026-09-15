import assert from 'node:assert/strict';
import { MemoryNormalizedMarketEvidencePayloadRepository, MemoryProviderSourceRequestRepository, MemoryProviderSourceResponseRepository } from '../persistence/market-evidence-ingestion-repository.js';
import { MemoryScheduledIngestionRunRepository } from '../persistence/scheduled-ingestion-repository.js';
import { IngestionPersistenceService } from '../provider-sources/ingestion-persistence-service.js';
import { GdeltNewsAdapter, MarketauxMarketNewsAdapter } from '../provider-sources/news/news-adapters.js';
import { getDefaultScheduledIngestionPolicies, scheduledIngestionCadenceMinutes, scheduledIngestionSlotStartIso, ScheduledIngestionService, ScheduledIngestionSourceTickService } from '../scheduled-ingestion/index.js';

export async function runNewsCadenceTests(){
 assert.equal(scheduledIngestionCadenceMinutes('every_15_minutes'),15);
 assert.equal(scheduledIngestionCadenceMinutes('every_30_minutes'),30);
 assert.equal(scheduledIngestionSlotStartIso('every_15_minutes','2026-09-15T02:39:22.000Z'),'2026-09-15T02:30:00.000Z');
 assert.equal(scheduledIngestionSlotStartIso('every_30_minutes','2026-09-15T02:39:22.000Z'),'2026-09-15T02:30:00.000Z');
 assert.equal(scheduledIngestionSlotStartIso('manual','2026-09-15T02:39:22.000Z'),null);

 const policies=getDefaultScheduledIngestionPolicies();
 const marketaux=policies.find(x=>x.providerId==='marketaux_news'&&x.capability==='market_news_feed');
 const gdelt=policies.find(x=>x.providerId==='gdelt_news'&&x.capability==='geopolitical_risk_event');
 const gdeltFallback=policies.find(x=>x.providerId==='gdelt_news'&&x.capability==='market_news_feed');
 assert.equal(marketaux?.cadence,'every_30_minutes');
 assert.equal(gdelt?.cadence,'every_15_minutes');
 assert.equal(gdeltFallback?.cadence,'manual');
 assert.equal(marketaux?.asset,null);assert.equal(gdelt?.asset,null);

 const reqRepo=new MemoryProviderSourceRequestRepository(),resRepo=new MemoryProviderSourceResponseRepository(),payRepo=new MemoryNormalizedMarketEvidencePayloadRepository(),runRepo=new MemoryScheduledIngestionRunRepository();
 const svc=new ScheduledIngestionService(new IngestionPersistenceService(reqRepo,resRepo,payRepo),runRepo);
 const sourceTick=new ScheduledIngestionSourceTickService(svc,runRepo,[marketaux!,gdelt!,gdeltFallback!]);
 const first=await sourceTick.runTick('2026-09-15T02:39:22.000Z');assert.equal(first.dueCount,2);assert.equal(first.dispatchedCount,2);assert.ok(first.dispatches.filter(x=>x.due).every(x=>x.slotStartAt==='2026-09-15T02:30:00.000Z'));
 const sameSlots=await sourceTick.runTick('2026-09-15T02:44:59.000Z');assert.equal(sameSlots.dueCount,0);
 const nextQuarter=await sourceTick.runTick('2026-09-15T02:45:00.000Z');assert.equal(nextQuarter.dueCount,1);assert.equal(nextQuarter.dispatches.find(x=>x.due)?.providerId,'gdelt_news');
 const nextHalfHour=await sourceTick.runTick('2026-09-15T03:00:00.000Z');assert.equal(nextHalfHour.dueCount,2);

 let marketauxUrl='';
 const marketauxAdapter=new MarketauxMarketNewsAdapter({mode:'live_enabled',apiKey:'test-key',fetchImpl:async input=>{marketauxUrl=String(input);return new Response(JSON.stringify({data:[]}),{status:200,headers:{'content-type':'application/json'}});}});
 await marketauxAdapter.fetch({requestId:'ma',providerId:'marketaux_news',capability:'market_news_feed',asset:null,region:'global',evidenceTypeId:'market_news_feed',requestedAt:'2026-09-15T03:00:00.000Z',paramsJson:JSON.stringify({lookbackMinutes:60})});
 const marketauxParsed=new URL(marketauxUrl);assert.equal(marketauxParsed.searchParams.has('limit'),false);assert.equal(marketauxParsed.searchParams.get('published_after'),'2026-09-15T02:00:00.000Z');assert.equal(marketauxParsed.searchParams.has('api_token'),true);

 let gdeltUrl='';
 const gdeltAdapter=new GdeltNewsAdapter({mode:'live_enabled',fetchImpl:async input=>{gdeltUrl=String(input);return new Response(JSON.stringify({articles:[]}),{status:200,headers:{'content-type':'application/json'}});}});
 await gdeltAdapter.fetch({requestId:'gd',providerId:'gdelt_news',capability:'geopolitical_risk_event',asset:null,region:'global',evidenceTypeId:'geopolitical_risk_event',requestedAt:'2026-09-15T03:00:00.000Z',paramsJson:JSON.stringify({lookbackMinutes:30})});
 assert.equal(new URL(gdeltUrl).searchParams.get('timespan'),'30min');

 const articles=[{url:'https://example.com/a',title:'Gold sanctions headline',seendate:'20260915T025500Z',domain:'example.com',language:'English',sourcecountry:'United States'},{url:'https://example.com/b',title:'Election raises geopolitical risk',seendate:'20260915T025600Z',domain:'example.com',language:'English',sourcecountry:'United Kingdom'}];
 const responseBase={requestId:'stable',providerId:'gdelt_news',capability:'geopolitical_risk_event' as const,status:'success' as const,fetchedAt:'2026-09-15T03:00:00.000Z',sourceUrl:'https://api.gdeltproject.org/api/v2/doc/doc',errorCode:null,errorMessage:null};
 const firstIds=(await gdeltAdapter.normalize({...responseBase,rawPayloadJson:JSON.stringify({articles})})).map(x=>x.payloadId).sort();
 const secondIds=(await gdeltAdapter.normalize({...responseBase,rawPayloadJson:JSON.stringify({articles:[...articles].reverse()})})).map(x=>x.payloadId).sort();
 assert.deepEqual(firstIds,secondIds,'GDELT article identity must be stable across overlapping/reordered polls');
}
