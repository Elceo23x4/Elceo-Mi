import {StripeSandboxPaymentProviderAdapter,assertProductionPaymentActivation,internalPaymentRuntime,reconcileStripePaymentOperation} from '@elceo/application-state';
import {captureError} from '../../../../lib/monitoring';

export async function POST(request:Request){
 try{
  const mode=process.env.PAYMENT_PROVIDER_MODE;if(mode==='production_provider')assertProductionPaymentActivation(process.env,'stripe');else if(mode!=='sandbox_provider')return Response.json({error:'stripe_webhook_activation_required'},{status:503});
  const raw=await request.text(),adapter=new StripeSandboxPaymentProviderAdapter(),event=adapter.parseWebhookEvent(raw,request.headers.get('stripe-signature'));
  let op=event.metadataOperationId?await internalPaymentRuntime.repository.getOperation(event.metadataOperationId):null;
  if(!op&&event.providerSessionReference)op=await internalPaymentRuntime.repository.findBySessionReference(event.providerSessionReference);
  if(!op&&event.providerPaymentReference)op=await internalPaymentRuntime.repository.findByProviderReference(event.providerPaymentReference);
  if(!op&&event.providerSubscriptionReference)op=await internalPaymentRuntime.repository.findBySubscriptionReference(event.providerSubscriptionReference);
  if(!op||!event.providerEventId)return Response.json({ok:true,matched:false},{status:202});
  const result=await reconcileStripePaymentOperation(internalPaymentRuntime.repository,adapter,op.internalPaymentOperationId,event.providerEventId);
  return Response.json({ok:true,status:result.status,reconciliationRequired:result.status!=='matched'},{status:result.status==='matched'?200:202});
 }catch(error){captureError('api.billing.webhook',error,{});return Response.json({error:'stripe_webhook_unavailable'},{status:503});}
}
