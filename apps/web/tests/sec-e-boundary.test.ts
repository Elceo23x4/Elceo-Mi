import assert from 'node:assert/strict';
import { buildSecurityRequestHash, canonicalJson, securityActorFromVerifiedPrincipal } from '../lib/server/security/route-security';
import { parseJsonBody, parsePositiveInt } from '../lib/server/api/http';
import { clearAuthTestOverrides, requireInternalRouteAccess, setAuthTestOverrides } from '../lib/server/auth/subject';
import { toAccountBillingSnapshotDto } from '../lib/server/account/billing-dto';
import type { BillingLifecycleSnapshot } from '@elceo/types';

export async function runSecEBoundaryTests(){
 assert.equal(buildSecurityRequestHash({a:1,b:2}),buildSecurityRequestHash({b:2,a:1}));
 assert.equal(buildSecurityRequestHash({root:{b:2,a:1}}),buildSecurityRequestHash({root:{a:1,b:2}}));
 assert.notEqual(buildSecurityRequestHash({root:{a:1}}),buildSecurityRequestHash({root:{b:1}}));
 assert.notEqual(buildSecurityRequestHash({root:{a:{x:1}}}),buildSecurityRequestHash({root:{a:{y:1}}}));
 assert.notEqual(buildSecurityRequestHash({root:[1,2]}),buildSecurityRequestHash({root:[2,1]}));
 assert.equal(buildSecurityRequestHash({root:[{b:2,a:1}]}),buildSecurityRequestHash({root:[{a:1,b:2}]}));
 assert.throws(()=>canonicalJson({bad:undefined})); const cyclic:any={};cyclic.self=cyclic;assert.throws(()=>canonicalJson(cyclic));
 for(const bad of ['5abc','1.5','-1','0','+5','Infinity','NaN','1e3','999999999999999999999'])assert.throws(()=>parsePositiveInt(bad,20,100));
 assert.equal(parsePositiveInt(null,20,100),20);assert.equal(parsePositiveInt('1',20,100),1);assert.equal(parsePositiveInt('100',20,100),100);assert.throws(()=>parsePositiveInt('101',20,100));
 const maxBytes=7;assert.deepEqual(await parseJsonBody(new Request('http://x',{method:'POST',body:'{"a":1}'}),{maxBytes}),{a:1});
 await assert.rejects(parseJsonBody(new Request('http://x',{method:'POST',body:'{"aa":1}'}),{maxBytes}),/payload_too_large/);
 setAuthTestOverrides({internalToken:'verified'});assert.throws(()=>requireInternalRouteAccess(new Request('http://x')));assert.throws(()=>requireInternalRouteAccess(new Request('http://x',{headers:{'x-elceo-internal-token':'wrong'}})));const p=requireInternalRouteAccess(new Request('http://x',{headers:{'x-elceo-internal-token':'verified'}}));assert.deepEqual(securityActorFromVerifiedPrincipal(p,'admin'),{actorKind:'admin',actorId:'internal-api',subjectId:null});clearAuthTestOverrides();
 const snapshot={generatedAt:'2026-01-01T00:00:00.000Z',subjectKind:'user',subjectId:'u',customer:{customerId:'internal',subjectKind:'user',subjectId:'u',providerKind:'stripe',providerCustomerId:'cus_SEC_E_BROWSER_FORBIDDEN',state:'active',email:'sec-e-provider-private@example.invalid',createdAt:'x',updatedAt:'x'},subscription:{subscriptionId:'internal',subjectKind:'user',subjectId:'u',providerKind:'stripe',providerSubscriptionId:'sub_SEC_E_BROWSER_FORBIDDEN',providerPriceId:'price_SEC_E_BROWSER_FORBIDDEN',providerProductId:'prod_SEC_E_BROWSER_FORBIDDEN',providerPlanCode:'private',canonicalPlanKind:'premium',planSource:'provider_mapping',state:'active',currentPeriodStart:null,currentPeriodEnd:null,trialEndsAt:null,canceledAt:null,willCancelAtPeriodEnd:false,latestProviderEventId:'evt_SEC_E_BROWSER_FORBIDDEN',updatedAt:'x'},entitlementState:{subjectKind:'user',subjectId:'u',planKind:'premium',accountState:'active',planStartedAt:null,planEndsAt:null,trialEndsAt:null,internalOverride:false,updatedAt:'x'},latestReconciliationRunId:'run-private'} as BillingLifecycleSnapshot;
 const serialized=JSON.stringify(toAccountBillingSnapshotDto(snapshot));for(const sentinel of ['cus_SEC_E_BROWSER_FORBIDDEN','sub_SEC_E_BROWSER_FORBIDDEN','price_SEC_E_BROWSER_FORBIDDEN','prod_SEC_E_BROWSER_FORBIDDEN','evt_SEC_E_BROWSER_FORBIDDEN','sec-e-provider-private@example.invalid'])assert.equal(serialized.includes(sentinel),false);for(const key of ['providerCustomerId','providerSubscriptionId','providerPriceId','providerProductId','providerPlanCode','latestProviderEventId','email'])assert.equal(serialized.includes(`"${key}"`),false);
 console.log('SEC-E boundary tests passed');
}
