import assert from 'node:assert/strict';
import { MARKET_REASONING_DIAGNOSTIC_ASSETS, TRADING_ASSET_COVERAGE, type AssetEvidenceBlueprint, type NormalizedMacroVintage } from '@elceo/types';
import { ASSET_EVIDENCE_BLUEPRINTS, CANONICAL_EVIDENCE_SOURCES, EvidenceSufficiencyEvaluator, MacroVintageStore, PROVIDER_IDENTITY_ALIASES, assertEvidenceFabric, canonicalSourceId } from '../evidence-fabric/index';

export function runEvidenceFabricTests():void {
 assert.doesNotThrow(assertEvidenceFabric);
 assert.deepEqual(new Set(ASSET_EVIDENCE_BLUEPRINTS.map(x=>x.asset)),new Set(TRADING_ASSET_COVERAGE));
 assert.deepEqual(MARKET_REASONING_DIAGNOSTIC_ASSETS,['dxy','vix']);
 assert.equal(new Set(PROVIDER_IDENTITY_ALIASES.map(x=>x.alias)).size,PROVIDER_IDENTITY_ALIASES.length);
 assert.equal(canonicalSourceId('federal_reserve'),'federal_reserve_official'); assert.equal(canonicalSourceId('ecb_public'),'ecb_official'); assert.equal(canonicalSourceId('boj_public'),'boj_official'); assert.equal(canonicalSourceId('us_treasury'),'us_treasury_official'); assert.equal(canonicalSourceId('fred'),'fred_macro');
 const homes:Record<string,string[]>= {usd_chf:['snb_official','swiss_fso_official'],aud_usd:['rba_official','abs_official'],nzd_usd:['rbnz_official','stats_nz_official'],usd_cad:['bank_of_canada_official','statistics_canada_official']};
 for(const [asset,ids] of Object.entries(homes)){const b=ASSET_EVIDENCE_BLUEPRINTS.find(x=>x.asset===asset);for(const id of ids)assert(b?.requirements.some(q=>q.routes.some(r=>r.sourceId===id)),`${asset}:${id}`);}
 const evaluator=new EvidenceSufficiencyEvaluator(); const eur=structuredClone(ASSET_EVIDENCE_BLUEPRINTS.find(x=>x.asset==='eur_usd')) as AssetEvidenceBlueprint; eur.requirements.find(x=>x.capabilityId==='ecb_policy')!.routes=[]; assert.equal(evaluator.evaluate(eur).state,'degraded');
 const priceOnly={asset:'eur_usd',requirements:[structuredClone(ASSET_EVIDENCE_BLUEPRINTS[1]!.requirements[0]!)]} as AssetEvidenceBlueprint; assert.match(evaluator.evaluate(priceOnly).reasons.join(','),/price_only/);
 assert(CANONICAL_EVIDENCE_SOURCES.filter(x=>['imf_official','world_bank_official','oecd_official'].includes(x.sourceId)).every(x=>x.adapterState==='implemented'&&x.normalization));
 const store=new MacroVintageStore(); const base:NormalizedMacroVintage={correlationKey:'US:CPI:2026-01',countryOrArea:'US',indicatorId:'CPI',referencePeriod:'2026-01',scheduledReleaseAt:'2026-02-10T13:30:00Z',sourceReleaseAt:'2026-02-10T13:30:00Z',firstSeenAt:'2026-02-10T13:30:01Z',retrievedAt:'2026-02-10T13:30:01Z',effectiveAt:'2026-02-10T13:30:00Z',vintageId:'initial',previousPublishedValue:null,value:100,revisionState:'preliminary',sourceUrl:'https://api.bls.gov',sourceId:'bls_official',retrievalRequestId:'r1'}; store.append(base); store.append({...base,firstSeenAt:'2026-03-10T13:30:01Z',retrievedAt:'2026-03-10T13:30:01Z',vintageId:'revision-1',previousPublishedValue:100,value:101,revisionState:'revised',retrievalRequestId:'r2'}); assert.equal(store.asOf(base.correlationKey,'2026-02-20T00:00:00Z')?.value,100); assert.equal(store.asOf(base.correlationKey,'2026-03-20T00:00:00Z')?.value,101); assert.equal(store.history(base.correlationKey).length,2);
}
