import { createHash } from 'node:crypto';
const canonicalize=(v:unknown):unknown=>Array.isArray(v)?v.map(canonicalize):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonicalize(x)])):v;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(canonicalize(v))).digest('hex');
export const buildCanonicalPayloadHash=(payload:unknown)=>`sha256:${hash(payload)}`;
export const buildCanonicalEvidenceIdentity=(v:{sourceId:string;capabilityId:string;asset:string;region:string|null;requestFingerprint:string;policyId:string;policyHash:string;policyVersion:string;evidenceContractVersion:string;payloadHash:string;revision:string|null;receivedAt:string})=>`evidence:${hash(v)}`;
export type CanonicalReasoningInputIdentityManifest={evidenceIdentities:readonly string[];asset:string;horizon:string;weightingPolicyVersion:string;ruleVersions:readonly string[];cognitionContractVersion:string;freshnessPolicyVersion:string;freshnessMs:number;evaluationEpochMs:number;evaluationEpoch:number};
export const buildAggregateReasoningInputIdentity=(v:CanonicalReasoningInputIdentityManifest)=>`reasoning-input:${hash({...v,evidenceIdentities:[...v.evidenceIdentities].sort(),ruleVersions:[...v.ruleVersions].sort()})}`;
export const buildCanonicalCognitionIdentity=(v:{reasoningInputIdentity:string;asset:string;horizon:string;weightingPolicyVersion:string;ruleVersions:readonly string[];freshnessPolicyVersion:string;freshnessMs:number;evaluationEpoch:number})=>`cognition:${hash({...v,ruleVersions:[...v.ruleVersions].sort()})}`;
export const buildMaterializationScopeHash=(v:{asset:string;horizon:string;kind:'evidence'|'cognition'|'dashboard_projection'|'kick_off_dashboard_context';timeframe?:string;sourceId?:string;capabilityId?:string;region?:string|null;projectionVersion?:string;displayVersion?:string;zoneRuleVersion?:string;productPolicyVersion?:string})=>hash(v);
export const buildAdaptiveJobIdentity=(v:{policyId:string;policyVersion:string;canonicalPolicyHash:string;sourceId:string;capabilityId:string;credentialPoolId:string;asset:string;region:string|null;horizon:string})=>hash(v);
export const buildCognitionMarketCoordinationHash=(v:{asset:string;horizon:string;cognitionContractVersion:string})=>hash(v);
export const buildArtifactIntegrityHash=(v:unknown)=>`sha256:${hash(v)}`;
export const buildDashboardProjectionArtifactIdentity=(v:{projectionIdentity:string;schemaVersion:'canonical_materialization_v1';parentCognitionArtifactIdentity:string;parentCognitionIntegrityHash:string;orderedCandleObservationIds:readonly string[];orderedCandleContentHashes:readonly string[];freshnessPolicyVersion:string})=>`dashboard-projection:${hash(v)}`;
export const buildDashboardProjectionCoordinationHash=(v:{asset:string;horizon:string;timeframe:'H4';projectionVersion:string;displayVersion:string;zoneRuleVersion:string;productPolicyVersion:string})=>hash({kind:'dashboard_projection',...v});

export const buildKickOffContextIdentity=(v:unknown)=>`kick-off-dashboard-context:${hash(v)}`;
export const buildKickOffContextCoordinationHash=(v:{asset:string;horizon:string;timeframe:'H4'})=>hash({kind:'kick_off_dashboard_context',contextVersion:'kick-off-dashboard-context-v1',...v});
