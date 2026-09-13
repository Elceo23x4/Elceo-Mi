import { readFile } from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const [sources,assets]=await Promise.all(['artifacts/provider-closure/source-capability-matrix.json','artifacts/provider-closure/asset-evidence-matrix.json'].map(async p=>JSON.parse(await readFile(new URL(p,root),'utf8'))));
const expected=['xau_usd','eur_usd','gbp_usd','usd_jpy','usd_chf','aud_usd','nzd_usd','usd_cad','btc_usd','nasdaq_100','sp500','de30'];
const fail=[]; if(JSON.stringify(assets.map(x=>x.asset))!==JSON.stringify(expected))fail.push('launch_universe_mismatch');
if(new Set(sources.flatMap(x=>x.aliases)).size!==sources.flatMap(x=>x.aliases).length)fail.push('ambiguous_alias');
for(const a of assets){if(!a.requirements.some(x=>x.criticality==='critical'&&x.capabilityId!=='direct_price'))fail.push(`${a.asset}:price_only`);for(const q of a.requirements.filter(x=>x.criticality==='critical'))if(!q.routes.some(r=>r.executable&&!r.placeholder&&r.normalization&&r.persistence&&r.freshness&&r.providerApiGate))fail.push(`${a.asset}:${q.capabilityId}:not_executable`);}
for(const s of sources.filter(x=>x.stagingLiveEligible))if(!s.normalizationState||!s.freshnessPolicy||!s.providerApiGate||s.adapterState!=='implemented')fail.push(`${s.canonicalId}:false_staging_ready`);
if(fail.length){console.error(fail.join('\n'));process.exit(1);} console.log(`data fabric valid: ${assets.length} assets, ${sources.length} canonical sources; production remains inactive`);
