import { createHash } from 'node:crypto';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export const buildCanonicalEvidenceIdentity=(v:{sourceId:string;capabilityId:string;asset:string;region:string|null;requestFingerprint:string;policyVersion:string;evidenceContractVersion:string})=>`evidence:${hash(v)}`;
export const buildCanonicalCognitionIdentity=(v:{evidenceIdentity:string;asset:string;horizon:string;weightingPolicyVersion:string;ruleVersions:readonly string[];evaluationEpoch:number})=>`cognition:${hash({...v,ruleVersions:[...v.ruleVersions].sort()})}`;
export const buildMaterializationScopeHash=(v:{asset:string;horizon:string;kind:'evidence'|'cognition'})=>hash(v);
export const buildArtifactIntegrityHash=(v:unknown)=>`sha256:${hash(v)}`;
