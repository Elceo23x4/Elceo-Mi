import { createHash } from 'node:crypto';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export const buildCanonicalEvidenceIdentity=(v:{sourceId:string;capabilityId:string;asset:string;region:string|null;requestFingerprint:string;policyVersion:string;evidenceContractVersion:string})=>`evidence:${hash(v)}`;
export const buildCanonicalCognitionIdentity=(v:{evidenceIdentity:string;asset:string;horizon:string;weightingPolicyVersion:string;ruleVersions:readonly string[];evaluationEpoch:number})=>`cognition:${hash({...v,ruleVersions:[...v.ruleVersions].sort()})}`;
export const buildMaterializationScopeHash=(v:{asset:string;horizon:string;kind:'evidence'|'cognition';sourceId?:string;capabilityId?:string;region?:string|null})=>hash(v);
export const buildAdaptiveJobIdentity=(v:{policyId:string;policyVersion:string;canonicalPolicyHash:string;sourceId:string;capabilityId:string;credentialPoolId:string;asset:string;region:string|null;horizon:string})=>hash(v);
export const buildArtifactIntegrityHash=(v:unknown)=>`sha256:${hash(v)}`;
