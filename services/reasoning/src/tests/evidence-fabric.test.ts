import assert from 'node:assert/strict';
import { MARKET_REASONING_DIAGNOSTIC_ASSETS, TRADING_ASSET_COVERAGE, type AssetEvidenceBlueprint } from '@elceo/types';
import { ASSET_EVIDENCE_BLUEPRINTS, EVIDENCE_EXECUTION_REGISTRATIONS, EvidenceSufficiencyEvaluator, PostgresMacroVintageRepository, PROVIDER_IDENTITY_ALIASES, assertEvidenceFabric, canonicalSourceId, evidenceImplementationState, resolveEvidenceGateExecution } from '../evidence-fabric/index';
import { ECB_CSV_FIXTURE, parseEcbCsv } from '../provider-sources/official/ecb-adapter';
import { TREASURY_XML_FIXTURE, parseTreasuryXml } from '../provider-sources/official/us-treasury-adapter';

const FX_TWO_LEG_CONTRACT = [
 { asset:'eur_usd', base:['ecb_policy','euro_german_macro'], quote:['fed_policy','us_macro'] },
 { asset:'gbp_usd', base:['boe_policy','uk_macro'], quote:['fed_policy','us_macro'] },
 { asset:'usd_jpy', base:['fed_policy','treasury_yields'], quote:['boj_policy','japan_macro_intervention'] },
 { asset:'usd_chf', base:['fed_policy'], quote:['snb_policy','swiss_macro'] },
 { asset:'aud_usd', base:['rba_policy','australia_macro'], quote:['fed_policy'] },
 { asset:'nzd_usd', base:['rbnz_policy','new_zealand_macro'], quote:['fed_policy'] },
 { asset:'usd_cad', base:['fed_policy'], quote:['boc_policy','canada_macro'] }
] as const;

export async function runEvidenceFabricTests():Promise<void> {
 assert.doesNotThrow(assertEvidenceFabric);
 assert.deepEqual(new Set(ASSET_EVIDENCE_BLUEPRINTS.map(x=>x.asset)),new Set(TRADING_ASSET_COVERAGE));
 assert.equal(TRADING_ASSET_COVERAGE.length,14); assert.deepEqual(MARKET_REASONING_DIAGNOSTIC_ASSETS,['dxy','vix']);
 assert.equal(new Set(PROVIDER_IDENTITY_ALIASES.map(x=>x.alias)).size,PROVIDER_IDENTITY_ALIASES.length);
 assert.equal(canonicalSourceId('federal_reserve'),'federal_reserve_official'); assert.equal(canonicalSourceId('ecb_public'),'ecb_official'); assert.equal(canonicalSourceId('boj_public'),'boj_official'); assert.equal(canonicalSourceId('us_treasury'),'us_treasury_official'); assert.equal(canonicalSourceId('fred'),'fred_macro');
 const homes:Record<string,string[]>= {usd_chf:['snb_official','swiss_fso_official'],aud_usd:['rba_official','abs_official'],nzd_usd:['rbnz_official','stats_nz_official'],usd_cad:['bank_of_canada_official','statistics_canada_official']};
 for(const [asset,ids] of Object.entries(homes)){const b=ASSET_EVIDENCE_BLUEPRINTS.find(x=>x.asset===asset);for(const id of ids)assert(b?.requirements.some(q=>q.routes.some(r=>r.sourceId===id)),`${asset}:${id}`);}
 for(const contract of FX_TWO_LEG_CONTRACT){
  const blueprint=ASSET_EVIDENCE_BLUEPRINTS.find(x=>x.asset===contract.asset);
  assert.ok(blueprint,`${contract.asset}:missing_blueprint`);
  const capabilities=new Set(blueprint.requirements.map(x=>x.capabilityId));
  for(const capability of contract.base)assert.ok(capabilities.has(capability),`${contract.asset}:base_leg_missing:${capability}`);
  for(const capability of contract.quote)assert.ok(capabilities.has(capability),`${contract.asset}:quote_leg_missing:${capability}`);
  assert.ok(contract.base.some(capability=>blueprint.requirements.find(x=>x.capabilityId===capability)?.criticality==='critical'),`${contract.asset}:base_leg_without_critical_evidence`);
  assert.ok(contract.quote.some(capability=>blueprint.requirements.find(x=>x.capabilityId===capability)?.criticality==='critical'),`${contract.asset}:quote_leg_without_critical_evidence`);
 }
 const evaluator=new EvidenceSufficiencyEvaluator(); const eur=structuredClone(ASSET_EVIDENCE_BLUEPRINTS.find(x=>x.asset==='eur_usd')) as AssetEvidenceBlueprint; eur.requirements.find(x=>x.capabilityId==='ecb_policy')!.routes=[]; assert.equal(evaluator.evaluate(eur).state,'degraded');
 const priceOnly={asset:'eur_usd',requirements:[structuredClone(ASSET_EVIDENCE_BLUEPRINTS[1]!.requirements[0]!)]} as AssetEvidenceBlueprint; assert.match(evaluator.evaluate(priceOnly).reasons.join(','),/price_only/);
 for(const id of ['imf_official','world_bank_official','oecd_official'] as const)assert.equal(evidenceImplementationState(id),'source_contract_ready','legacy zero adapters cannot confer executable state');
 assert.deepEqual(EVIDENCE_EXECUTION_REGISTRATIONS.map(x=>`${x.sourceId}:${x.capabilityId}`),['tiingo_market_data:direct_price','fred_macro:real_yields','fred_macro:financial_conditions','ecb_official:ecb_policy']);
 assert.equal(evidenceImplementationState('fred_macro','real_yields'),'executable_adapter');assert.equal(evidenceImplementationState('ecb_official','ecb_policy'),'executable_adapter');assert.equal(evidenceImplementationState('us_treasury_official'),'source_contract_ready','Treasury parser exists but must not become executable before a semantically correct gate capability is registered');
 const fredPlan=resolveEvidenceGateExecution('fred_macro','real_yields');assert.equal(fredPlan?.gateSourceId,'fred');assert.equal(fredPlan?.providerCapabilityId,'real_yield_series');assert.deepEqual(fredPlan?.requestParams,{seriesId:'DFII10'});
 const ecbPlan=resolveEvidenceGateExecution('ecb_official','ecb_policy');assert.equal(ecbPlan?.gateSourceId,'ecb_public');assert.equal(ecbPlan?.providerCapabilityId,'policy_rate_series');assert.deepEqual(ecbPlan?.requestParams,{series:'deposit_facility'});
 assert.equal(resolveEvidenceGateExecution('us_treasury_official','treasury_yields'),null,'unregistered Treasury route must fail closed');
 assert.equal(parseEcbCsv(ECB_CSV_FIXTURE)[0]?.OBS_VALUE,'2.25');assert.equal(parseTreasuryXml(TREASURY_XML_FIXTURE)[0]?.BC_10YEAR,'4.21');
 const eurReadiness=evaluator.evaluate(ASSET_EVIDENCE_BLUEPRINTS.find(x=>x.asset==='eur_usd')!);assert.equal(eurReadiness.empiricalReady,false);assert.ok(eurReadiness.empiricalReasons.some(x=>x.includes('not_staging_verified')));
 const dxy=ASSET_EVIDENCE_BLUEPRINTS.find(x=>x.asset==='dxy')!;const vix=ASSET_EVIDENCE_BLUEPRINTS.find(x=>x.asset==='vix')!;assert.equal(dxy.requirements.find(x=>x.directPriceRequired)?.routes[0]?.sourceId,'ice_data_indices');assert.equal(vix.requirements.find(x=>x.directPriceRequired)?.routes[0]?.sourceId,'cboe_official');assert.equal(evaluator.evaluate(dxy).state,'degraded');assert.equal(evaluator.evaluate(vix).state,'degraded');
 const calls:{sql:string;params?:unknown[]}[]=[];const repo=new PostgresMacroVintageRepository({query:async(sql,params)=>{calls.push(params===undefined?{sql}:{sql,params});return{rows:sql.startsWith('INSERT')?[{observation_identity:'cpi'}]:[]};}});const inserted=await repo.append({observationIdentity:'cpi',correlationKey:'US:CPI:2026-01',countryOrArea:'US',indicatorId:'CPI',referencePeriod:'2026-01',scheduledReleaseAt:null,sourceReleaseAt:null,firstSeenAt:'2026-02-01T00:00:00Z',retrievedAt:'2026-02-01T00:00:01Z',effectiveAt:'2026-02-01T00:00:00Z',vintageId:'initial',previousPublishedValue:null,value:100,revisionState:'preliminary',sourceUrl:'https://api.bls.gov',sourceId:'bls_official',retrievalRequestId:'request-1'});assert.equal(inserted,'inserted');assert.match(calls[0]?.sql??'',/ON CONFLICT DO NOTHING/);
}
