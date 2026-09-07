import type {InternalPaymentOperation} from './internal-payment';
const unresolved=new Set(['created','pending_provider','processing','unknown','reconciliation_required']);
export function hasAuthoritativeProviderReference(operation:InternalPaymentOperation){return Boolean(operation.providerPaymentReference||operation.providerCheckoutSessionReference||operation.providerSubscriptionReference||operation.providerTransactionReference);}
export function shouldResumeProviderCheckout(operation:InternalPaymentOperation){return unresolved.has(operation.state)&&!hasAuthoritativeProviderReference(operation);}
