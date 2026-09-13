import { readFile,access } from 'node:fs/promises';
const root=new URL('../',import.meta.url);const read=p=>readFile(new URL(p,root),'utf8');
const [sources,assets,typeSource,providerIdsSource,fabricSource,resolverSource,gateSource,releaseGate,migration,vintageRepository]=await Promise.all([
 'artifacts/provider-closure/source-capability-matrix.json','artifacts/provider-closure/asset-evidence-matrix.json'
].map(async p=>JSON.parse(await read(p))).concat([
 'packages/types/src/market-evidence.ts','packages/types/src/provider-source-registry.ts','services/reasoning/src/evidence-fabric/index.ts','services/reasoning/src/provider-sources/provider-adapter-resolver.ts','services/reasoning/src/provider-sources/provider-api-gate.ts','scripts/release-gate.mjs','infra/db/schema/0063_evidence_macro_vintages.sql','services/reasoning/src/evidence-fabric/macro-vintage-repository.ts'
].map(read)));
const expected=['xau_usd','eur_usd','gbp_usd','usd_jpy','usd_chf','aud_usd','nzd_usd','usd_cad','btc_usd','nasdaq_100','sp500','de30','dxy','vix'],fail=[];
for(const id of expected)if(!typeSource.includes(`'${id}'`))fail.push(`launch_contract_missing:${id}`);
if(assets.length!==14||new Set(assets.map(x=>x.asset)).size!==14||expected.some(id=>!assets.some(x=>x.asset===id)))fail.push('launch_matrix_not_exactly_14');
const canonicalIds=[...providerIdsSource.matchAll(/'([^']+)'/g)].map(x=>x[1]).filter(id=>sources.some(source=>source.canonicalId===id));if(new Set(sources.map(x=>x.canonicalId)).size!==sources.length)fail.push('duplicate_canonical_source');if(canonicalIds.length!==sources.length||sources.some(source=>!canonicalIds.includes(source.canonicalId)))fail.push('canonical_source_audit_incomplete');
if(new Set(sources.flatMap(x=>x.aliases)).size!==sources.flatMap(x=>x.aliases).length)fail.push('ambiguous_alias');
const registered=[...fabricSource.matchAll(/sourceId:'([^']+)',capabilityId:'([^']+)',adapterModule:'([^']+)',normalizerModule:'([^']+)',fixtureModule:'([^']+)'/g)];
for(const [,sourceId,capability,adapter,normalizer,fixture] of registered){for(const module of [adapter,normalizer,fixture])await access(new URL(`services/reasoning/src/${module}.ts`,root)).catch(()=>fail.push(`${sourceId}:${capability}:missing_module:${module}`));if(!resolverSource.includes(sourceId))fail.push(`${sourceId}:trusted_resolver_missing`);if(!gateSource.includes('translateProviderCapability'))fail.push(`${sourceId}:gate_translation_missing`);}
for(const s of sources){const execution=registered.some(x=>x[1]===s.canonicalId);if(Boolean(s.adapterState==='executable_adapter')!==execution)fail.push(`${s.canonicalId}:matrix_execution_mismatch`);if(s.stagingLiveEligible||s.stagingLiveEmpiricallyVerified||s.productionLiveEligible||s.productionActive)fail.push(`${s.canonicalId}:unsupported_activation_claim`);}
for(const asset of assets){if(!asset.requirements.some(x=>x.criticality==='critical'&&x.capabilityId!=='direct_price'))fail.push(`${asset.asset}:price_only`);if(asset.structuralReady||asset.empiricallyReady)fail.push(`${asset.asset}:false_readiness_claim`);}
if(!fabricSource.includes("source('ice_data_indices'")||!fabricSource.includes("source('cboe_official'"))fail.push('direct_index_authority_missing');
if(!migration.includes('PRIMARY KEY (observation_identity, known_at)')||!vintageRepository.includes('known_at<=$2')||!vintageRepository.includes('ON CONFLICT DO NOTHING'))fail.push('durable_vintage_semantics_missing');
if(!migration.includes('app_macro_vintages_as_of')||!fabricSource.includes("export * from './macro-vintage-repository'"))fail.push('durable_vintage_path_missing');
if(!releaseGate.includes("'check:data-fabric'"))fail.push('release_gate_not_wired');
if(/fetch\s*\(/.test(fabricSource))fail.push('evidence_fabric_arbitrary_fetch_forbidden');
if(fail.length){console.error(fail.join('\n'));process.exit(1);}console.log(`data fabric integrity valid: 14 launch assets, ${sources.length} canonical sources, ${registered.length} proven executable registration; readiness remains degraded`);
