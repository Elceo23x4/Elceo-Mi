import type { ProviderControlScope } from './contracts';
import { validateProviderControlScope } from './policy';
export function providerControlCoordinationTag(scope:ProviderControlScope):string {validateProviderControlScope(scope);return `${scope.sourceId}|${scope.capabilityId}|${scope.credentialPoolId}`;}
export function providerControlScopeTag(scope:ProviderControlScope):string {return `${providerControlCoordinationTag(scope)}|${scope.policyVersion}`;}
export function providerControlKeys(scope:ProviderControlScope,namespace='elceo:provider-control:v1') {const root=`${namespace}:{${providerControlCoordinationTag(scope)}}`,policyRoot=`${root}:policy:${scope.policyVersion}`;return {root,rate:`${policyRoot}:rate`,quota:`${policyRoot}:quota`,cost:`${policyRoot}:cost`,leases:`${policyRoot}:leases`,admission:(admissionId:string)=>`${root}:admission:${admissionId}`};}
