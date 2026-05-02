import type { MarketEvidenceClass, TradingAssetCoverage } from '@elceo/types';
import { ASSET_INFLUENCES, getAssetInfluenceMatrix } from './asset-influence-map';
import { EVIDENCE_TYPES, EVIDENCE_SOURCES, getMarketEvidenceRegistrySnapshot } from './market-evidence-registry';

export function listLaunchEvidenceTypes(){ return EVIDENCE_TYPES.filter((x)=>x.isLaunchScope); }
export function listEvidenceTypesByClass(evidenceClass: MarketEvidenceClass){ return EVIDENCE_TYPES.filter((x)=>x.evidenceClass===evidenceClass); }
export function listEvidenceTypesForAsset(asset: TradingAssetCoverage){ const ids=new Set(ASSET_INFLUENCES.filter((x)=>x.asset===asset).map((x)=>x.evidenceTypeId)); return EVIDENCE_TYPES.filter((x)=>ids.has(x.evidenceTypeId)); }
export function listPrimarySourcesForEvidenceType(evidenceTypeId: string){ const et=EVIDENCE_TYPES.find((x)=>x.evidenceTypeId===evidenceTypeId); if(!et) return []; const sourceSet=new Set(et.primarySources); return EVIDENCE_SOURCES.filter((s)=>sourceSet.has(s.sourceId)); }
export { getAssetInfluenceMatrix, getMarketEvidenceRegistrySnapshot };

export * from './serialization';
export * from './snapshot-service';
export * from './query-service';
export * from './replay';
