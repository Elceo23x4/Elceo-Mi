import {applyCanonicalSubscriptionLifecycleEvent,internalPaymentRuntime,parseStripeWebhookEvent} from '@elceo/application-state';
import {captureError} from '../../../../lib/monitoring';
import {logRequest} from '../../../../lib/request-context';
import {createBillingWebhookPost} from '../../../../lib/billing-webhook-handler';
export const POST=createBillingWebhookPost({parse:parseStripeWebhookEvent,applyLifecycle:applyCanonicalSubscriptionLifecycleEvent,runtime:internalPaymentRuntime,capture:(error,requestId)=>captureError('api.billing.webhook',error,{requestId}),log:(data)=>logRequest('api.billing.webhook','runtime','webhook processed',data)});
