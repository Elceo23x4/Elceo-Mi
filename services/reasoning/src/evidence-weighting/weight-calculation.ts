import type { EvidenceWeightHorizon, MarketAssetCausalityAsset, ReasoningEvidenceInputItem, ReasoningEvidenceInputSnapshot, TradingAssetCoverage, WeightedEvidenceAssemblyReport, WeightedEvidenceDirection, WeightedEvidenceItem, WeightedEvidenceSnapshot } from '@elceo/types';
import { resolveAssetContextualDirectionForEvidenceItem } from '../asset-direction-resolution/index';
import { getWeightPolicy } from './weight-policies';
import { evaluateProviderReliabilityForEvidenceItem } from '../provider-reliability/index';

function toCausalityAsset(asset: MarketAssetCausalityAsset): MarketAssetCausalityAsset { return asset; }

export function inferWeightedEvidenceDirection(item: ReasoningEvidenceInputItem, asset?: MarketAssetCausalityAsset): WeightedEvidenceDirection {
  if (!asset) return 'unknown';
  return resolveAssetContextualDirectionForEvidenceItem({ asset: toCausalityAsset(asset), evidenceClass: item.evidenceClass, metadataJson: item.metadataJson, observedAt: item.observedAt }).resolvedDirection;
}

export function buildWeightedEvidenceItem(inputItem:ReasoningEvidenceInputItem,asset:MarketAssetCausalityAsset,horizon:EvidenceWeightHorizon):WeightedEvidenceItem{
  const p=getWeightPolicy(asset,inputItem.evidenceClass,horizon);
  const q=inputItem.qualityScore.finalQualityScore;
  const providerReliability=evaluateProviderReliabilityForEvidenceItem(inputItem,{asset,horizon,generatedAt:inputItem.normalizedAt});
  const aw=(p.baseWeight*q)/100*providerReliability.weightMultiplier;
  const resolution=resolveAssetContextualDirectionForEvidenceItem({asset:toCausalityAsset(asset),evidenceClass:inputItem.evidenceClass,metadataJson:inputItem.metadataJson,observedAt:inputItem.observedAt});
  const d=resolution.resolvedDirection;
  const s=d==='bullish'?1:d==='bearish'?-1:0;
  const resolverReasons=[`direction_resolver:${resolution.resolvedDirection}:${resolution.confidence}`, ...resolution.reasonCodes.map((x)=>`direction_reason:${x}`), ...resolution.warnings.map((x)=>`direction_warning:${x}`)];
  const providerReasons=[`provider_reliability_score:${providerReliability.reliabilityScore}`,`provider_weight_multiplier:${providerReliability.weightMultiplier}`,`provider_confidence_cap:${providerReliability.confidenceCap}`, ...providerReliability.warnings.map((x)=>`provider_warning:${x}`), ...providerReliability.reasonCodes.map((x)=>`provider_reason:${x}`)];
  return {payloadId:inputItem.payloadId,asset: asset as TradingAssetCoverage,horizon,evidenceTypeId:inputItem.evidenceTypeId,evidenceClass:inputItem.evidenceClass,providerId:inputItem.providerId,observedAt:inputItem.observedAt,finalQualityScore:q,baseWeight:p.baseWeight,qualityAdjustedWeight:aw,role:p.role,direction:d,contributionScore:aw*s,reasons:[...inputItem.reasons,...resolverReasons,...providerReasons]};
}
export function buildWeightedEvidenceSnapshot(inputSnapshot:ReasoningEvidenceInputSnapshot,asset:MarketAssetCausalityAsset,horizon:EvidenceWeightHorizon,generatedAt?:string):WeightedEvidenceSnapshot{const items=inputSnapshot.items.map((x)=>buildWeightedEvidenceItem(x,asset,horizon)).sort((a,b)=>Math.abs(b.contributionScore)-Math.abs(a.contributionScore)||b.qualityAdjustedWeight-a.qualityAdjustedWeight||Date.parse(b.observedAt)-Date.parse(a.observedAt)||a.payloadId.localeCompare(b.payloadId)); const total=items.reduce((n,x)=>n+x.baseWeight,0); const usable=items.filter((x)=>x.role!=='excluded').reduce((n,x)=>n+x.qualityAdjustedWeight,0); const excluded=items.filter((x)=>x.role==='excluded').reduce((n,x)=>n+x.qualityAdjustedWeight,0); const warnings=[...inputSnapshot.warnings]; if(usable<=0) warnings.push('no_usable_weighted_evidence'); return {snapshotId:`weighted|${asset}|${horizon}|${generatedAt??new Date().toISOString()}`,generatedAt:generatedAt??new Date().toISOString(),asset: asset as TradingAssetCoverage,horizon,totalWeight:Math.min(100,total),usableWeight:Math.min(100,usable),excludedWeight:Math.min(100,excluded),items,warnings};}
export function buildWeightedEvidenceAssemblyReport(snapshot:WeightedEvidenceSnapshot):WeightedEvidenceAssemblyReport{return{generatedAt:snapshot.generatedAt,asset:snapshot.asset,horizon:snapshot.horizon,itemCount:snapshot.items.length,totalWeight:snapshot.totalWeight,usableWeight:snapshot.usableWeight,warnings:[...snapshot.warnings],pass:snapshot.usableWeight>0};}
