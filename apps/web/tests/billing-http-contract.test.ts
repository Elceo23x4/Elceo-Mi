import assert from 'node:assert/strict';
import {createBillingIntentionGet} from '../lib/billing-intention-handler';
import {createBillingWebhookPost} from '../lib/billing-webhook-handler';

const request=()=>new Request('https://elceo.test/api/billing/webhook',{method:'POST',body:'{}',headers:{'stripe-signature':'fixture'}});
const normalized={providerEventId:'evt_1',safeRedactedPayloadChecksum:'checksum',providerEventType:'checkout.session.completed',providerPaymentReference:'pi_1',providerSessionReference:'cs_1',providerCustomerReference:'cus_1',providerSubscriptionReference:'sub_1',metadataOperationId:'ipo_1',metadataSubjectUserId:'user_1',metadataTargetPlan:'focus_plan',metadataBillingInterval:'monthly',subscriptionState:'active',currentPeriodStart:'2026-08-01T00:00:00.000Z',currentPeriodEnd:'2026-09-01T00:00:00.000Z',cancelAtPeriodEnd:false,createdAt:'2026-08-01T00:00:00.000Z',refundOrReversalOrChargeback:'none',status:'succeeded'} as any;
export async function runBillingHttpContractAcceptance(){
 const unauthorized=createBillingIntentionGet({requireUser:async()=>{throw new Error('UNAUTHORIZED')},recover:async()=>null,providerMode:()=> 'disabled',retrieve:async()=>({checkoutUrl:null}) as any});
 assert.equal((await unauthorized(new Request('https://elceo.test/api/billing/intention'))).status,401);
 const unavailable=createBillingIntentionGet({requireUser:async()=>({session:{user:{id:'user_1'}}} as any),recover:async()=>{throw new Error('payment_persistence_unavailable')},providerMode:()=> 'disabled',retrieve:async()=>({checkoutUrl:null}) as any});
 assert.equal((await unavailable(new Request('https://elceo.test/api/billing/intention'))).status,503);
 const saved={APP_ENV:process.env.APP_ENV,PAYMENT_PROVIDER_MODE:process.env.PAYMENT_PROVIDER_MODE,PAYMENT_PROVIDER_KIND:process.env.PAYMENT_PROVIDER_KIND};Object.assign(process.env,{APP_ENV:'test',PAYMENT_PROVIDER_MODE:'sandbox_provider',PAYMENT_PROVIDER_KIND:'stripe'});
 const handler=(overrides:any={})=>createBillingWebhookPost({parse:()=>normalized,applyLifecycle:async()=>({status:'applied',duplicate:false,operationId:'ipo_1'} as any),runtime:{webhook:async()=>({duplicate:false,operation:{internalPaymentOperationId:'ipo_1'}})} as any,...overrides});
 const invalid=handler({parse:()=>{throw new Error('invalid_provider_webhook_signature')}});const invalidResponse=await invalid(request());assert.equal(invalidResponse.status,400);assert.equal((await invalidResponse.json()).error.code,'invalid_webhook_signature');
 const outage=handler({runtime:{webhook:async()=>{throw new Error('payment_persistence_unavailable')}}});const outageResponse=await outage(request());assert.equal(outageResponse.status,503);assert.doesNotMatch(JSON.stringify(await outageResponse.json()),/postgres|select|secret/i);
 const orphan=handler({parse:()=>({...normalized,providerEventType:'customer.subscription.created'}),applyLifecycle:async()=>({status:'orphan',duplicate:false,operationId:null})});assert.equal((await orphan(request())).status,422);
 const internal=handler({runtime:{webhook:async()=>{throw new Error('select secret from payment_operations')}}});const internalResponse=await internal(request());assert.equal(internalResponse.status,500);assert.doesNotMatch(JSON.stringify(await internalResponse.json()),/select|secret|payment_operations/i);
 Object.assign(process.env,saved);
}
