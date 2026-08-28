import {StripeSandboxPaymentProviderAdapter,recoverCanonicalPaymentIntention,resolvePaymentProviderMode} from '@elceo/application-state';
import {requireAppUserState} from '../../../../lib/auth/session';
import {captureError} from '../../../../lib/monitoring';
import {createBillingIntentionGet} from '../../../../lib/billing-intention-handler';
export const GET=createBillingIntentionGet({requireUser:requireAppUserState,recover:recoverCanonicalPaymentIntention,providerMode:resolvePaymentProviderMode,retrieve:async(reference)=>new StripeSandboxPaymentProviderAdapter().retrievePaymentOrSession(reference),capture:(error)=>captureError('api.billing.intention',error,{})});
