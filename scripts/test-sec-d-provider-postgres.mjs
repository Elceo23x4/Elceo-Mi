import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import pg from 'pg';

const base=process.env.DATABASE_URL;if(!base)throw new Error('DATABASE_URL_required');
const adminUrl=new URL(base);adminUrl.pathname='/postgres';const name=`elceo_sec_d_${randomUUID().replaceAll('-','')}`;const admin=new pg.Client({connectionString:adminUrl.toString()});await admin.connect();await admin.query(`CREATE DATABASE ${name}`);const url=new URL(base);url.pathname=`/${name}`;process.env.DATABASE_URL=url.toString();const db=new pg.Client({connectionString:url.toString()});
try{
 await db.connect();for(const file of (await readdir('infra/db/schema')).filter(x=>/^\d{4}.*\.sql$/.test(x)).sort())await db.query(await readFile(`infra/db/schema/${file}`,'utf8'));
 const {TiingoMarketDataAdapter}=await import('../services/reasoning/dist-test/services/reasoning/src/provider-sources/tiingo/tiingo-adapter.js');
 const {executeProviderApiGateRequest}=await import('../services/reasoning/dist-test/services/reasoning/src/provider-sources/provider-api-gate.js');
 const {IngestionPersistenceService}=await import('../services/reasoning/dist-test/services/reasoning/src/provider-sources/ingestion-persistence-service.js');
 const repos=await import('../services/reasoning/dist-test/services/reasoning/src/persistence/market-evidence-ingestion-repository.js');
 const synthetic='SEC_D_SYNTHETIC_HIGH_ENTROPY_CREDENTIAL_6f7d2a0b9c4e';let fetches=0;
 const adapter=new TiingoMarketDataAdapter({liveEnabled:true,mode:'live_enabled',apiKey:synthetic,fetchImpl:async(input,init)=>{fetches++;assert.equal(String(input).includes(synthetic),false);assert.equal(new Headers(init?.headers).get('authorization'),`Token ${synthetic}`);return new Response(JSON.stringify([{ticker:'eurusd',date:'2026-08-01T00:00:00.000Z',open:1,high:2,low:.5,close:1.5}]),{status:200});}});
 const runtime={requestId:'sec-d-request',sourceId:'tiingo_market_data',capabilityId:'market_price_history',asset:'eur_usd',activationMode:'fixture_only',provenance:{actor:'sec_d_acceptance',purpose:'synthetic_provider_ingestion'}};
 const result=await executeProviderApiGateRequest(runtime,adapter);assert.equal(result.response?.payloadSchemaStatus,'valid');
 const request={requestId:runtime.requestId,providerId:runtime.sourceId,capability:runtime.capabilityId,asset:'eur_usd',region:'global',evidenceTypeId:'market_price_history',requestedAt:'2026-08-01T00:00:00.000Z',paramsJson:'{}'};
 const persistence=new IngestionPersistenceService(new repos.SqlProviderSourceRequestRepository(),new repos.SqlProviderSourceResponseRepository(),new repos.SqlNormalizedMarketEvidencePayloadRepository());
 const report=await persistence.persistProviderApiGateResult(adapter,request,result);assert.equal(fetches,1);assert.equal(report.payloadCount,1);
 const rows=await db.query(`SELECT (SELECT count(*) FROM app_provider_source_requests WHERE request_id=$1)::int requests,(SELECT count(*) FROM app_provider_source_responses WHERE request_id=$1)::int responses,(SELECT count(*) FROM app_normalized_market_evidence_payloads WHERE provider_id='tiingo_market_data')::int payloads`,[runtime.requestId]);assert.deepEqual(rows.rows[0],{requests:1,responses:1,payloads:1});
 const material=JSON.stringify((await db.query(`SELECT source_url,raw_payload_json,error_message FROM app_provider_source_responses WHERE request_id=$1`,[runtime.requestId])).rows);assert.equal(material.includes(synthetic),false);assert.equal(result.response.sourceUrl?.includes(synthetic),false);assert.equal(JSON.stringify(result.snapshot).includes(synthetic),false);
 const malformedResult={...result,response:{...result.response,payload:{bars:[{bad:true}]},payloadSchemaStatus:'valid'}};await assert.rejects(persistence.persistProviderApiGateResult(adapter,{...request,requestId:'sec-d-malformed'},malformedResult));assert.equal(Number((await db.query(`SELECT count(*) c FROM app_normalized_market_evidence_payloads WHERE provider_id='tiingo_market_data'`)).rows[0].c),1);
 const denied=await executeProviderApiGateRequest({...runtime,requestId:'sec-d-denied',activationMode:'production_live_allowed'},adapter);assert.equal(denied.decision.reason,'production_live_not_approved');assert.equal(fetches,1);
 console.log(JSON.stringify({secD:'pass',realSqlRepositories:true,providerFetches:fetches,canonicalRows:rows.rows[0],sentinelAbsent:true,productionLiveBlocked:true,providerHttp:'injected_only'}));
}finally{await db.end().catch(()=>{});await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`).catch(()=>{});await admin.end();}
