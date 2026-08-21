import { createHash } from 'node:crypto';import type { ProviderResiliencePolicy } from './contracts';
export function providerResilienceTag(p:ProviderResiliencePolicy){const scope=[p.sourceId,p.capabilityId,p.credentialPoolId,p.policyId,p.policyVersion].join('\0');return `{prs:${createHash('sha256').update(scope).digest('hex')}}`;}
export function providerResilienceKeys(p:ProviderResiliencePolicy,namespace='elceo:provider-resilience:v1'){const tag=providerResilienceTag(p);return {state:`${namespace}:${tag}:state`,probes:`${namespace}:${tag}:probes`};}
