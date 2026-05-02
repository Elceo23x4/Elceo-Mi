import { validateMarketEvidenceAssetInfluence, validateMarketEvidenceRegistrySnapshot, validateMarketEvidenceSource, validateMarketEvidenceTypeDefinition } from '@elceo/schemas';
import { getAssetInfluenceMatrix, getMarketEvidenceRegistrySnapshot, listLaunchEvidenceTypes } from '../evidence-registry/index.js';

export function runMarketEvidenceRegistryTests(): void {
  if (!validateMarketEvidenceSource({ sourceId: 'a', sourceName: 'b', sourceKind: 'news_provider', institutionName: 'c', region: 'global', countryOrBloc: 'Global', accessLevel: 'public', homepageUrl: 'x', notes: 'n' }).ok) throw new Error('source validation failed');
  if (validateMarketEvidenceTypeDefinition({ evidenceTypeId: '', evidenceClass: 'x' }).ok) throw new Error('invalid evidence type should fail');
  if (validateMarketEvidenceAssetInfluence({ asset: 'xau_usd', evidenceTypeId: 'e', influenceDirection: 'bullish', influenceStrength: 'high', influenceHorizon: 'swing', rationale: 'r', primaryCountries: [], primaryInstitutions: [] }).ok !== true) throw new Error('influence validation failed');
  const snap = getMarketEvidenceRegistrySnapshot(new Date().toISOString()); if (!validateMarketEvidenceRegistrySnapshot(snap).ok) throw new Error('registry snapshot invalid');
  const launch = listLaunchEvidenceTypes().map((x) => x.evidenceClass);
  ['cot_positioning','central_bank_liquidity','real_yields','bond_auctions','volatility_surface','credit_stress','macro_surprise_history','bank_health'].forEach((c)=>{ if(!launch.includes(c as never)) throw new Error(`missing launch class ${c}`);});
  if (!listLaunchEvidenceTypes().some((x)=>x.excludedReason===null) || !getMarketEvidenceRegistrySnapshot(new Date().toISOString()).evidenceTypes.some((x)=>x.evidenceTypeId==='interbank_orderflow' && x.excludedReason)) throw new Error('interbank exclusion missing');
  ['xau_usd','eur_usd','usd_jpy','btc_usd','nasdaq_100'].forEach((a)=>{ if(getAssetInfluenceMatrix(a as never).length===0) throw new Error(`missing matrix ${a}`);});
  const ids=snap.evidenceTypes.map((x)=>x.evidenceTypeId); if(new Set(ids).size!==ids.length) throw new Error('duplicate evidenceTypeId');
}
