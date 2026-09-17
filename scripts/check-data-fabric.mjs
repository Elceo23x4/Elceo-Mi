import { readFile,access } from 'node:fs/promises';
const root=new URL('../',import.meta.url);const read=p=>readFile(new URL(p,root),'utf8');
const [sources,assets,typeSource,providerIdsSource,fabricSource,resolverSource,gateSource,releaseGate,migration,vintageRepository]=await Promise.all([
 'artifacts/provider-closure/source-capability-matrix.json','artifacts/provider-closure/asset-evidence-matrix.json'
].map(async p=>JSON.parse(await read(p))).concat([
 'packages/types/src/market-evidence.ts','packages/types/src/provider-source-registry.ts','services/reasoning/src/evidence-fabric/index.ts','services/reasoning/src/provider-sources/provider-adapter-resolver.ts','services/reasoning/src/provider-sources/provider-api-gate.ts','scripts/release-gate.mjs','infra/db/schema/0063_evidence_macro_vintages.sql','services/reasoning/src/evidence-fabric/macro-vintage-repository.ts'
].map(read)));
const expected=['xau_usd','eur_usd','gbp_usd','usd_jpy','usd_chf','aud_usd','nzd_usd','usd_cad','btc_usd','nasdaq_100','sp500','de30','dxy','vix'],fail=[];
const fxTwoLeg={
 eur_usd:{base:['ecb_policy','euro_german_macro'],quote:['fed_policy','us_macro']},
 gbp_usd:{base:['boe_policy','uk_macro'],quote:['fed_policy','us_macro']},
 usd_jpy:{base:['fed_policy','treasury_yields'],quote:['boj_policy','japan_macro_intervention']},
 usd_chf:{base:['fed_policy'],quote:['snb_policy','swiss_macro']},
 aud_usd:{base:['rba_policy','australia_macro'],quote:['fed_policy']},
 nzd_usd:{base:['rbnz_policy','new_zealand_macro'],quote:['fed_policy']},
 usd_cad:{base:['fed_policy'],quote:['boc_policy','canada_macro']}
};
for(const id of expected)if(!typeSource.includes(`'${id}'`))fail.push(`launch_contract_missing:${id}`);
if(assets.length!==14||new Set(assets.map(x=>x.asset)).size!==14||expected.some(id=>!assets.some(x=>x.asset===id)))fail.push('launch_matrix_not_exactly_14');
const canonicalIds=[...providerIdsSource.matchAll(/'([^']+)'/g)].map(x=>x[1]).filter(id=>sources.some(source=>source.canonicalId===id));if(new Set(sources.map(x=>x.canonicalId)).size!==sources.length)fail.push('duplicate_canonical_source');if(canonicalIds.length!==sources.length||sources.some(source=>!canonicalIds.includes(source.canonicalId)))fail.push('canonical_source_audit_incomplete');
if(new Set(sources.flatMap(x=>x.aliases)).size!==sources.flatMap(x=>x.aliases).length)fail.push('ambiguous_alias');

const moduleConstants=new Map([...fabricSource.matchAll(/const\s+([A-Za-z_$][\w$]*)='([^']+)';/g)].map(([,name,value])=>[name,value]));
const registrationBodies=[...fabricSource.matchAll(/reg\(\{([^}]+)\}\)/g)].map(x=>x[1]);
const registrationField=(body,name)=>{
 const literal=body.match(new RegExp(`${name}:'([^']+)'`));if(literal)return literal[1];
 const identifier=body.match(new RegExp(`${name}:([A-Za-z_$][\\w$]*)`));if(identifier)return moduleConstants.get(identifier[1])??identifier[1];
 return null;
};
const registered=registrationBodies.map(body=>({
 sourceId:registrationField(body,'sourceId'),
 capability:registrationField(body,'capabilityId'),
 adapter:registrationField(body,'adapterModule'),
 normalizer:registrationField(body,'normalizerModule'),
 fixture:registrationField(body,'fixtureModule'),
 trustedResolver:registrationField(body,'trustedResolver')
})).filter(x=>x.sourceId&&x.capability);
const registeredRoute=new Set(registered.map(x=>`${x.sourceId}:${x.capability}`));
for(const registration of registered){
 const {sourceId,capability,adapter,normalizer,fixture,trustedResolver}=registration;
 for(const module of [adapter,normalizer,fixture]){
  if(!module){fail.push(`${sourceId}:${capability}:registration_module_missing`);continue;}
  await access(new URL(`services/reasoning/src/${module}.ts`,root)).catch(()=>fail.push(`${sourceId}:${capability}:missing_module:${module}`));
 }
 if(!trustedResolver)fail.push(`${sourceId}:${capability}:trusted_resolver_declaration_missing`);
 else if(!resolverSource.includes(`function ${trustedResolver}`))fail.push(`${sourceId}:${capability}:trusted_resolver_missing:${trustedResolver}`);
 if(!gateSource.includes('translateProviderCapability'))fail.push(`${sourceId}:gate_translation_missing`);
}
if(registered.some(x=>x.trustedResolver==='createOfficialEvidenceStagingExecutionResolver')&&
 (!resolverSource.includes('getOfficialAdapterCatalogEntry(policy.providerId,policy.capability)')||
  !resolverSource.includes('createOfficialAdapter(policy.providerId,policy.capability,')))
 fail.push('official_catalog_resolver_contract_missing');

for(const s of sources){const execution=registered.some(x=>x.sourceId===s.canonicalId);if(Boolean(s.adapterState==='executable_adapter')!==execution)fail.push(`${s.canonicalId}:matrix_execution_mismatch`);if(s.stagingLiveEligible||s.stagingLiveEmpiricallyVerified||s.productionLiveEligible||s.productionActive)fail.push(`${s.canonicalId}:unsupported_activation_claim`);}
for(const asset of assets){
 if(!asset.requirements.some(x=>x.criticality==='critical'&&x.capabilityId!=='direct_price'))fail.push(`${asset.asset}:price_only`);
 if(asset.structuralReady||asset.empiricallyReady)fail.push(`${asset.asset}:false_readiness_claim`);
 for(const requirement of asset.requirements)for(const route of requirement.routes){
  const proven=registeredRoute.has(`${route.sourceId}:${requirement.capabilityId}`);
  if(Boolean(route.executable)!==proven)fail.push(`${asset.asset}:${requirement.capabilityId}:${route.sourceId}:route_execution_claim_mismatch`);
  for(const field of ['normalization','persistence','freshness','providerApiGate'])if(Boolean(route[field])!==proven)fail.push(`${asset.asset}:${requirement.capabilityId}:${route.sourceId}:${field}_claim_mismatch`);
 }
}
for(const [assetId,legs] of Object.entries(fxTwoLeg)){
 const asset=assets.find(x=>x.asset===assetId);if(!asset){fail.push(`${assetId}:fx_blueprint_missing`);continue;}
 const requirements=new Map(asset.requirements.map(x=>[x.capabilityId,x]));
 for(const capability of legs.base){if(!requirements.has(capability))fail.push(`${assetId}:base_leg_missing:${capability}`);}
 for(const capability of legs.quote){if(!requirements.has(capability))fail.push(`${assetId}:quote_leg_missing:${capability}`);}
 if(!legs.base.some(capability=>requirements.get(capability)?.criticality==='critical'))fail.push(`${assetId}:base_leg_without_critical_evidence`);
 if(!legs.quote.some(capability=>requirements.get(capability)?.criticality==='critical'))fail.push(`${assetId}:quote_leg_without_critical_evidence`);
}
if(!fabricSource.includes("source('ice_data_indices'")||!fabricSource.includes("source('cboe_official'"))fail.push('direct_index_authority_missing');
if(!migration.includes('PRIMARY KEY (observation_identity, known_at)')||!vintageRepository.includes('known_at<=$2')||!vintageRepository.includes('ON CONFLICT DO NOTHING'))fail.push('durable_vintage_semantics_missing');
if(!migration.includes('app_macro_vintages_as_of')||!fabricSource.includes("export * from './macro-vintage-repository'"))fail.push('durable_vintage_path_missing');
if(!releaseGate.includes("'check:data-fabric'"))fail.push('release_gate_not_wired');
if(/fetch\s*\(/.test(fabricSource))fail.push('evidence_fabric_arbitrary_fetch_forbidden');
if(fail.length){console.error(fail.join('\n'));process.exit(1);}console.log(`data fabric integrity valid: 14 launch assets, ${sources.length} canonical sources, ${registered.length} proven executable registrations; FX legs remain independently specified; readiness remains degraded`);
