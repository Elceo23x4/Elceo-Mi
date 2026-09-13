import assert from 'node:assert/strict';
import { MARKET_REASONING_DIAGNOSTIC_ASSETS, TRADING_ASSET_COVERAGE, type AssetEvidenceBlueprint } from '@elceo/types';
import { ASSET_EVIDENCE_BLUEPRINTS, EVIDENCE_EXECUTION_REGISTRATIONS, EvidenceSufficiencyEvaluator, PostgresMacroVintageRepository, PROVIDER_IDENTITY_ALIASES, assertEvidenceFabric, canonicalSourceId, evidenceImplementationState } from '../evidence-fabric/index';

export async function runEvidenceFabricTests():Promise<void> {
 assert.doesNotThrow(assertEvidenceFabric);
 assert.deepEqual(new Set(ASSET_EVIDENCE_BLUEPRINTS.map(x=>x.asset)),new Set(TRADING_ASSET_COVERAGE));
 assert.equal(TRADING_ASSET_COVERAGE.length,14); assert.deepEqual(MARKET_REASONING_DIAGNOSTIC_ASSETS,['dxy','vix']);
 assert.equal(new Set(PROVIDER_IDENTITY_ALIASES.map(x=>x.alias)).size,PROVIDER_IDENTITY_ALIASES.length);
 assert.equal(canonicalSourceId('federal_reserve'),'federal_reserve_official'); assert.equal(canonicalSourceId('ecb_public'),'ecb_official'); assert.equal(canonicalSourceId('boj_public'),'boj_official'); assert.equal(canonicalSourceId('us_treasury'),'us_treasury_official'); assert.equal(canonicalSourceId('fred'),'fred_macro');
 const homes:Record<string,string[]>= {usd_chf:['snb_official','swiss_fso_official'],aud_usd:['rba_official','abs_official'],nzd_usd:['rbnz_official','stats_nz_official'],usd_cad:['bank_of_canada_official','statistics_canada_official']};
 for(const [asset,ids] of Object.entries(homes)){const b=ASSET_EVIDENCE_BLUEPRINTS.find(x=>x.asset===asset);for(const id of ids)assert(b?.requirements.some(q=>q.routes.some(r=>r.sourceId===id)),`${asset}:${id}`);}
 const evaluator=new EvidenceSufficiencyEvaluator(); const eur=structuredClone(ASSET_EVIDENCE_BLUEPRINTS.find(x=>x.asset==='eur_usd')) as AssetEvidenceBlueprint; eur.requirements.find(x=>x.capabilityId==='ecb_policy')!.routes=[]; assert.equal(evaluator.evaluate(eur).state,'degraded');
 const priceOnly={asset:'eur_usd',requirements:[structuredClone(ASSET_EVIDENCE_BLUEPRINTS[1]!.requirements[0]!)]} as AssetEvidenceBlueprint; assert.match(evaluator.evaluate(priceOnly).reasons.join(','),/price_only/);
 for(const id of ['imf_official','world_bank_official','oecd_official'] as const)assert.equal(evidenceImplementationState(id),'source_contract_ready','legacy zero adapters cannot confer executable state');
 assert.deepEqual(EVIDENCE_EXECUTION_REGISTRATIONS.map(x=>x.sourceId),['tiingo_market_data']);
 const dxy=ASSET_EVIDENCE_BLUEPRINTS.find(x=>x.asset==='dxy')!;const vix=ASSET_EVIDENCE_BLUEPRINTS.find(x=>x.asset==='vix')!;assert.equal(dxy.requirements.find(x=>x.directPriceRequired)?.routes[0]?.sourceId,'ice_data_indices');assert.equal(vix.requirements.find(x=>x.directPriceRequired)?.routes[0]?.sourceId,'cboe_official');assert.equal(evaluator.evaluate(dxy).state,'degraded');assert.equal(evaluator.evaluate(vix).state,'degraded');
 const calls:{sql:string;params?:unknown[]}[]=[];const repo=new PostgresMacroVintageRepository({query:async(sql,params)=>{calls.push(params===undefined?{sql}:{sql,params});return{rows:sql.startsWith('INSERT')?[{observation_identity:'cpi'}]:[]};}});const inserted=await repo.append({observationIdentity:'cpi',correlationKey:'US:CPI:2026-01',countryOrArea:'US',indicatorId:'CPI',referencePeriod:'2026-01',scheduledReleaseAt:null,sourceReleaseAt:null,firstSeenAt:'2026-02-01T00:00:00Z',retrievedAt:'2026-02-01T00:00:01Z',effectiveAt:'2026-02-01T00:00:00Z',vintageId:'initial',previousPublishedValue:null,value:100,revisionState:'preliminary',sourceUrl:'https://api.bls.gov',sourceId:'bls_official',retrievalRequestId:'request-1'});assert.equal(inserted,'inserted');assert.match(calls[0]?.sql??'',/ON CONFLICT DO NOTHING/);
}
