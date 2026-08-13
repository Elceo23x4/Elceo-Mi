import type { ProviderControlScope } from './contracts';
const SAFE=/^[a-zA-Z0-9._*-]{1,100}$/;
export function providerControlScopeTag(s:ProviderControlScope):string { for(const v of [s.sourceId,s.capabilityId,s.credentialPoolId,s.policyVersion]) if(!SAFE.test(v)) throw new Error('invalid_provider_control_scope'); return `${s.sourceId}|${s.capabilityId}|${s.credentialPoolId}|${s.policyVersion}`; }
export function providerControlKeys(s:ProviderControlScope,namespace='elceo:provider-control:v1'): {rate:string;quota:string;cost:string;leases:string;reservations:string} { const root=`${namespace}:{${providerControlScopeTag(s)}}`; return {rate:`${root}:rate`,quota:`${root}:quota`,cost:`${root}:cost`,leases:`${root}:leases`,reservations:`${root}:reservations`}; }
