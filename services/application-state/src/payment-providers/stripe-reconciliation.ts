import type {InternalPaymentOperation,InternalPaymentRepository} from '../billing/internal-payment';
import type {NormalizedProviderEvent} from './sandbox-adapter';
export type StripeTruthRetriever={retrievePaymentOrSession(reference:string):Promise<NormalizedProviderEvent>};
export type StripeReconciliationResult={status:'matched'|'mismatch'|'unresolved'|'not_found';operation:InternalPaymentOperation|null;reason?:string};
export function validateStripeProviderTruth(op:InternalPaymentOperation,truth:NormalizedProviderEvent):string|null{
 if(truth.status!=='succeeded')return truth.status==='unknown'||truth.status==='processing'?'provider_state_unresolved':'provider_commercial_mismatch';
 if(truth.amount!==op.amount||truth.currency!==op.currency)return 'provider_commercial_mismatch';
 if(truth.metadataOperationId&&truth.metadataOperationId!==op.internalPaymentOperationId)return 'provider_commercial_mismatch';
 if(truth.metadataProviderIdempotencyKey&&truth.metadataProviderIdempotencyKey!==op.providerIdempotencyKey)return 'provider_commercial_mismatch';
 if(truth.metadataSubjectUserId&&truth.metadataSubjectUserId!==op.subjectUserId)return 'provider_commercial_mismatch';
 if(truth.metadataTargetPlan&&truth.metadataTargetPlan!==op.targetPlan)return 'provider_commercial_mismatch';
 if(truth.metadataBillingInterval&&truth.metadataBillingInterval!==op.billingInterval)return 'provider_commercial_mismatch';
 if(op.providerPaymentReference&&truth.providerPaymentReference!==op.providerPaymentReference)return 'provider_commercial_mismatch';
 if(op.providerCheckoutSessionReference&&truth.providerSessionReference!==op.providerCheckoutSessionReference)return 'provider_commercial_mismatch';
 if(op.providerSubscriptionReference&&truth.providerSubscriptionReference!==op.providerSubscriptionReference)return 'provider_commercial_mismatch';
 if(op.quotedProviderProductReference&&truth.providerProductReference!==op.quotedProviderProductReference)return 'provider_commercial_mismatch';
 if(!truth.providerSubscriptionReference||!['active','trialing'].includes(truth.subscriptionState??''))return 'provider_subscription_not_current';
 if(!truth.currentPeriodStart||!truth.currentPeriodEnd||Date.parse(truth.currentPeriodEnd)<=Date.now())return 'provider_period_invalid';
 return null;
}
export async function reconcileStripePaymentOperation(repository:InternalPaymentRepository,retriever:StripeTruthRetriever,operationId:string):Promise<StripeReconciliationResult>{
 const observed=await repository.getOperation(operationId);if(!observed)return {status:'not_found',operation:null};
 const reference=observed.providerCheckoutSessionReference??observed.providerPaymentReference??observed.providerSubscriptionReference;if(!reference)return {status:'unresolved',operation:observed,reason:'provider_reference_missing'};
 let truth:NormalizedProviderEvent;try{truth=await retriever.retrievePaymentOrSession(reference)}catch{return {status:'unresolved',operation:observed,reason:'provider_unavailable'}}
 return repository.transaction(async tx=>{const locked=await tx.lockOperation(operationId);if(!locked)return {status:'not_found',operation:null};const mismatch=validateStripeProviderTruth(locked,truth);if(mismatch){const next=await tx.transition(locked.internalPaymentOperationId,locked.version,locked.state,{reconciliationState:mismatch==='provider_state_unresolved'?'required':'mismatch',safeErrorCategory:mismatch,lastProviderComparisonSnapshot:{status:truth.status,amount:truth.amount,currency:truth.currency}},'Stripe provider-backed reconciliation');await tx.appendAudit(next.internalPaymentOperationId,'Stripe provider truth inspected',{result:mismatch});return {status:mismatch==='provider_state_unresolved'?'unresolved':'mismatch',operation:next,reason:mismatch};}const next=await tx.transition(locked.internalPaymentOperationId,locked.version,'succeeded',{reconciliationState:'matched',safeErrorCategory:null,providerPaymentReference:truth.providerPaymentReference??locked.providerPaymentReference,providerCheckoutSessionReference:truth.providerSessionReference??locked.providerCheckoutSessionReference,providerCustomerReference:truth.providerCustomerReference??locked.providerCustomerReference,providerSubscriptionReference:truth.providerSubscriptionReference??locked.providerSubscriptionReference,subscriptionState:truth.subscriptionState,currentPeriodStart:truth.currentPeriodStart,currentPeriodEnd:truth.currentPeriodEnd,cancelAtPeriodEnd:truth.cancelAtPeriodEnd,lastProviderComparisonSnapshot:{status:truth.status,amount:truth.amount,currency:truth.currency}},'Stripe provider-backed reconciliation matched');await tx.writeLedgerOnce(next,'payment_success');await tx.writeEntitlementOnce(next,'grant');await tx.appendAudit(next.internalPaymentOperationId,'Stripe provider truth inspected',{result:'matched'});return {status:'matched',operation:next};});
 }
