import { createHash } from 'node:crypto';
import { validateNormalizedGeopoliticalRiskEvent, validateNormalizedMarketNewsItem } from '@elceo/schemas';
import type { CanonicalAssetSymbol, DashboardChartWorkspaceViewModel, InternalKickOffMacroHeadline, KickOffDashboardContextArtifact, KickOffDashboardViewModelV1, NormalizedMarketEvidencePayload } from '@elceo/types';
import type { CanonicalDashboardProjection } from '@elceo/chart-intelligence';
import type { ResolvedCanonicalReasoningInput } from './production-aggregate';
import type { DashboardProjectionArtifact, EvidenceOrCognitionArtifact } from './contracts';
import { buildArtifactIntegrityHash, buildCanonicalPayloadHash, buildKickOffContextIdentity, buildMaterializationScopeHash } from './identity';

export const KICK_OFF_CONTEXT_VERSION='kick-off-dashboard-context-v1' as const;
export const KICK_OFF_EVIDENCE_SCORE_POLICY_VERSION='kick-off-evidence-score-v1' as const;
export const KICK_OFF_MACRO_HEADLINE_POLICY_VERSION='kick-off-macro-headlines-v1' as const;
const opaque=(id:string)=>createHash('sha256').update(`kick-off-headline-v1\0${id}`).digest('hex');

function extractHeadlines(aggregate:ResolvedCanonicalReasoningInput):InternalKickOffMacroHeadline[]{
  const weighted=new Map(aggregate.weightedSnapshot.items.filter(x=>x.role!=='excluded'&&x.qualityAdjustedWeight>0).map(x=>[x.payloadId,x]));
  const freshness=new Map(aggregate.reasoningInputSnapshot.items.map(x=>[x.payloadId,x.freshnessStatus]));
  const sourceIdentity=new Map<string,string>(); for(const artifact of aggregate.evidenceArtifacts)for(const payload of artifact.payload.normalizedPayloads)sourceIdentity.set(payload.payloadId,artifact.identity);
  const candidates:InternalKickOffMacroHeadline[]=[];
  for(const payload of aggregate.normalizedPayloads){const item=weighted.get(payload.payloadId),state=freshness.get(payload.payloadId);if(!item||!['market_news','geopolitical_risk'].includes(item.evidenceClass)||!['fresh','aging'].includes(String(state)))continue;let value:unknown;try{value=JSON.parse(payload.valuesJson)}catch{continue}const published=payload.publishedAt;if(!published||Date.parse(published)>Date.parse(aggregate.evaluatedAt))continue;
    if(item.evidenceClass==='market_news'){const checked=validateNormalizedMarketNewsItem(value);if(!checked.ok||checked.value.publishedAt!==published)continue;candidates.push({payload_id:payload.payloadId,evidence_class:'market_news',title:checked.value.title,source_name:checked.value.sourceName,source_url:checked.value.url,published_at:published,freshness:state as 'fresh'|'aging',source_evidence_artifact_identity:sourceIdentity.get(payload.payloadId)!})}
    else {const checked=validateNormalizedGeopoliticalRiskEvent(value);if(!checked.ok||checked.value.publishedAt!==published)continue;candidates.push({payload_id:payload.payloadId,evidence_class:'geopolitical_risk',title:checked.value.title,source_name:null,source_url:checked.value.sourceUrl,published_at:published,freshness:state as 'fresh'|'aging',source_evidence_artifact_identity:sourceIdentity.get(payload.payloadId)!})}
  }
  candidates.sort((a,b)=>b.published_at.localeCompare(a.published_at)||a.payload_id.localeCompare(b.payload_id));const seen=new Set<string>();return candidates.filter(x=>{const k=x.source_url?`url:${x.source_url}`:`exact:${x.source_name}\0${x.title}\0${x.published_at}`;if(seen.has(k))return false;seen.add(k);return true}).slice(0,3);
}

export function buildKickOffDashboardContext(input:{asset:CanonicalAssetSymbol;dashboard:DashboardProjectionArtifact<CanonicalDashboardProjection>;cognition:EvidenceOrCognitionArtifact<unknown>&{kind:'cognition'};aggregate:ResolvedCanonicalReasoningInput;evidenceFreshnessPolicyHash:string}):KickOffDashboardContextArtifact{
  const {dashboard,cognition,aggregate}=input;if(dashboard.asset!==input.asset||dashboard.horizon!==aggregate.horizon||dashboard.timeframe!=='H4'||dashboard.parentCognitionArtifactIdentity!==cognition.identity||dashboard.parentCognitionIntegrityHash!==cognition.integrityHash||dashboard.evaluatedAt!==cognition.evaluatedAt||aggregate.evaluatedAt!==cognition.evaluatedAt||aggregate.weightedSnapshot.snapshotId!==(cognition.payload as {weightedEvidenceSnapshotId?:string}).weightedEvidenceSnapshotId)throw new Error('kick_off_context_lineage_mismatch');
  const payload={evidence_score:{value:aggregate.weightedSnapshot.usableWeight,basis:'weighted_evidence_usable_weight' as const},macro_headlines:{items:extractHeadlines(aggregate)}};
  const lineage={contextVersion:KICK_OFF_CONTEXT_VERSION,asset:input.asset,horizon:aggregate.horizon,timeframe:'H4' as const,evaluatedAt:dashboard.evaluatedAt,parentDashboardProjectionIdentity:dashboard.identity,parentDashboardProjectionIntegrityHash:dashboard.integrityHash,parentCognitionArtifactIdentity:cognition.identity,parentCognitionIntegrityHash:cognition.integrityHash,parentReasoningInputIdentity:cognition.evidenceIdentity,weightedEvidenceSnapshotId:aggregate.weightedSnapshot.snapshotId,weightedEvidenceContentHash:buildCanonicalPayloadHash(aggregate.weightedSnapshot),parentEvidenceArtifactIdentities:[...aggregate.evidenceIdentities].sort(),evidenceScorePolicyVersion:KICK_OFF_EVIDENCE_SCORE_POLICY_VERSION,macroHeadlinePolicyVersion:KICK_OFF_MACRO_HEADLINE_POLICY_VERSION,evidenceFreshnessPolicyHash:input.evidenceFreshnessPolicyHash,payload};
  const identity=buildKickOffContextIdentity(lineage),body={schemaVersion:'canonical_materialization_v1' as const,kind:'kick_off_dashboard_context' as const,identity,scopeHash:buildMaterializationScopeHash({asset:input.asset,horizon:aggregate.horizon,kind:'kick_off_dashboard_context',timeframe:'H4'}),generatedAt:dashboard.evaluatedAt,freshUntil:new Date(Math.min(Date.parse(dashboard.freshUntil),Date.parse(cognition.freshUntil))).toISOString(),...lineage};return{...body,integrityHash:buildArtifactIntegrityHash(body)};
}

export function projectKickOffDashboard(workspace:DashboardChartWorkspaceViewModel,artifact:KickOffDashboardContextArtifact|null,input:{asset:CanonicalAssetSymbol;horizon:KickOffDashboardViewModelV1['horizon'];evaluatedAt:string}):KickOffDashboardViewModelV1{
  const base={contract_version:'kick-off-dashboard-v1' as const,access:'kick_off' as const,asset_code:input.asset,timeframe:'H4' as const,horizon:input.horizon,evaluated_at:input.evaluatedAt,chart:{candles:workspace.chart.candles.map(x=>({...x})),zones:workspace.chart.zones.map(({zone_id,lower,upper,center})=>({zone_id,lower,upper,center}))}};
  if(!artifact)return{...base,evidence_score:{availability:'unavailable',value:null,scale:'0_100'},macro_headlines:{availability:'unavailable',items:[]}};
  const items=artifact.payload.macro_headlines.items.map(x=>({headline_id:opaque(x.payload_id),title:x.title,source_name:x.source_name,source_url:x.source_url,published_at:x.published_at,freshness:x.freshness}));return{...base,evidence_score:{availability:'available',value:artifact.payload.evidence_score.value,scale:'0_100'},macro_headlines:items.length?{availability:'available',items}:{availability:'empty',items:[]}};
}
