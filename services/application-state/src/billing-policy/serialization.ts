import type { BillingPolicyTransition } from '@elceo/types';
import { validateBillingPolicyTransition } from '@elceo/schemas';
export const serializeBillingPolicyTransition = (v:BillingPolicyTransition)=>JSON.stringify(v);
export function deserializeBillingPolicyTransition(v:string):BillingPolicyTransition{ const p=JSON.parse(v) as unknown; const r=validateBillingPolicyTransition(p); if(!r.ok){ const errs='errors' in r ? r.errors.join(',') : 'validation_failed'; throw new Error(`invalid transition: ${errs}`);} return r.value; }
