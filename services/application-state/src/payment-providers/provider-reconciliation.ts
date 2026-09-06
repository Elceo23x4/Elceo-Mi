import type {InternalPaymentRepository} from '../billing/internal-payment';
import {KoraPayAdapter,validateKoraTruth} from './korapay-adapter';
import {StripeSandboxPaymentProviderAdapter} from './sandbox-adapter';
import {reconcileStripePaymentOperation} from './stripe-reconciliation';
import {assertProductionPaymentActivation} from './production-activation';
const environment=()=>((globalThis as any).process?.env??{}) as Record<string,string|undefined>;
function fixedPeriodEnd(interval:'monthly'|'quarterly'|'yearly',start:Date){const end=new Date(start);end.setUTCMonth(end.getUTCMonth()+(interval==='monthly'?1:interval==='quarterly'?3:12));return end.toISOString()}
export async function reconcileProviderPaymentOperation(repository:InternalPaymentRepository,operationId:string,deps?:{stripe?:StripeSandboxPaymentProviderAdapter;kora?:KoraPayAdapter}){
 const operation=await repository.getOperation(operationId);if(!operation)return {status:'not_found' as const,operation:null};const env=environment();if(env.PAYMENT_PROVIDER_MODE==='production_provider')assertProductionPaymentActivation(env,operation.provider as 'stripe'|'korapay');
 if(operation.provider==='stripe')return reconcileStripePaymentOperation(repository,deps?.stripe??new StripeSandboxPaymentProviderAdapter(),operationId);
 if(operation.provider!=='korapay')return {status:'unresolved' as const,operation,reason:'unsupported_payment_provider'};
 const reference=operation.providerTransactionReference??operation.providerPaymentReference;if(!reference)return {status:'unresolved' as const,operation,reason:'provider_reference_missing'};
 let truth;try{truth=await (deps?.kora??new KoraPayAdapter(env.KORAPAY_SECRET_KEY??'')).retrieve(reference);validateKoraTruth({reference,amountMinor:String(operation.amount),currency:operation.currency,plan:operation.targetPlan,interval:operation.billingInterval??'monthly',operationId},truth)}catch{return {status:'unresolved' as const,operation,reason:'provider_unavailable_or_mismatch'}}
 const start=new Date(),end=fixedPeriodEnd(operation.billingInterval??'monthly',start);return repository.transaction(async tx=>{const locked=await tx.lockOperation(operationId);if(!locked)return {status:'not_found' as const,operation:null};const next=await tx.transition(operationId,locked.version,'succeeded',{reconciliationState:'matched',providerTransactionReference:reference,providerPaymentReference:null,subscriptionState:'active',currentPeriodStart:start.toISOString(),currentPeriodEnd:end,lastProviderComparisonSnapshot:{reference,status:truth.status,amountMinor:truth.amountPaid??truth.amountExpected,currency:truth.currency}},'Kora provider-backed reconciliation matched');await tx.writeLedgerOnce(next,'payment_success');await tx.writeEntitlementOnce(next,'grant');await tx.appendAudit(operationId,'Kora provider truth inspected',{result:'matched'});return {status:'matched' as const,operation:next};});
}
