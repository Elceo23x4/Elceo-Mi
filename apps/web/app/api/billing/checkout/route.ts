import { NextResponse } from 'next/server';
import { KoraPayAdapter, StripeSandboxPaymentProviderAdapter, assertProductionPaymentActivation, shouldResumeProviderCheckout, reconcileStripePaymentOperation, internalPaymentRuntime, normalizeProviderError, type FakeProviderOutcome } from '@elceo/application-state';
import { requireAppUserState } from '../../../../lib/auth/session';
import { guardRoutePaymentReadiness } from '../../../../lib/server/access/route-entitlement';
import { captureError } from '../../../../lib/monitoring';
import { getRequestId, logRequest } from '../../../../lib/request-context';
import { resolveActiveCommercialPrice, assertProviderCapability, resolveUserCommercialEntitlementSnapshot } from '@elceo/application-state';
import { getUserSocialIdentifiers } from '../../../../lib/server/profile/social-identifiers-store';

function resolveStatus(error: unknown): number { if (error instanceof Error && error.message === 'UNAUTHORIZED') return 401; return 400; }

const validKey=(v:string|null|undefined):v is string=>Boolean(v&&v.length>=8&&v.length<=255&&/^[A-Za-z0-9._:-]+$/.test(v));

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const { session } = await requireAppUserState();
    const body = (await request.json()) as { targetPlan?: string; billingInterval?: string; idempotencyKey?: string; provider?: 'stripe'|'korapay'; currency?: string; rail?: string; fakeProviderOutcome?: FakeProviderOutcome };
    if (body.targetPlan !== 'focus_plan') throw new Error('Unsupported target plan for checkout');
    const interval = body.billingInterval === 'quarterly' || body.billingInterval === 'yearly' ? body.billingInterval : 'monthly';
    const snapshot = await resolveUserCommercialEntitlementSnapshot(session.user.id);
    const persisted = await getUserSocialIdentifiers(session.user.id);
    const socialIdentifiers = persisted.socialIdentifiers.length > 0 ? persisted.socialIdentifiers : snapshot.socialIdentifiers;
    const readiness = guardRoutePaymentReadiness(socialIdentifiers);
    if (readiness.status !== 'eligible') return NextResponse.json({ error: 'payment_readiness_blocked', code: readiness.reason, subscriptionWall: { required: true, reason: 'focus_plan_required', targetPlanCode: 'focus_plan' }, liveActivation: 'blocked', sandboxOnly: false, productionLive: false }, { status: 403, headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
    const suppliedKey=body.idempotencyKey??request.headers.get('idempotency-key');if(!validKey(suppliedKey))throw new Error('payment_idempotency_key_required');const businessIdempotencyKey=suppliedKey;const provider=body.provider??'stripe';const currency=(body.currency??'').toUpperCase();if(!currency)throw new Error('commercial_price_not_configured');const price=await resolveActiveCommercialPrice({planCode:'focus_plan',billingInterval:interval,currency});
    const deployed = process.env.APP_ENV === 'staging' || process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';
    const fakeOutcomesEnabled = !deployed && process.env.ELCEO_PAYMENT_FAKE_OUTCOMES_ENABLED === '1';
    if (body.fakeProviderOutcome && !fakeOutcomesEnabled) return NextResponse.json({ ok: false, error: 'fake_provider_outcome_disabled', liveActivation: 'blocked' }, { status: 400, headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
    await assertProviderCapability({provider,environment:process.env.APP_ENV==='production'?'production':'sandbox',rail:body.rail??(provider==='stripe'?'card':'checkout'),currency,recurring:provider==='stripe'});
    const providerMode = process.env.PAYMENT_PROVIDER_MODE ?? process.env.ELCEO_PAYMENT_PROVIDER_MODE;
    if (providerMode === 'sandbox_provider' || providerMode === 'production_provider') {
      if(providerMode==='production_provider')assertProductionPaymentActivation(process.env,provider);
      if (providerMode==='sandbox_provider' && process.env.ELCEO_PAYMENT_SANDBOX_SMOKE !== '1') throw new Error('sandbox_checkout_requires_explicit_smoke_context');
      const repo = internalPaymentRuntime.repository;
      const created = await repo.createOrReuseOperation({ subjectUserId: session.user.id, targetPlan: 'focus_plan', billingInterval: interval, amount:Number(price.amountMinor), currency:price.currency, commercialPriceVersionId:price.id, quotedProviderProductReference:provider==='stripe'?process.env.STRIPE_PRODUCT_ID_FOCUS_PLAN:undefined, businessIdempotencyKey, provider });
      let operation = created.operation;
      let checkoutUrl: string | null = null;
      const unresolved=['created','pending_provider','processing','unknown','reconciliation_required'].includes(operation.state);
      if (shouldResumeProviderCheckout(operation)) {
        try {
          const origin = new URL(request.url).origin;
          if(provider==='korapay'){
            const secret=process.env.KORAPAY_SECRET_KEY;if(!secret)throw new Error('korapay_secret_required');
            const result=await new KoraPayAdapter(secret).initialize({amountMinor:String(operation.amount),currency:operation.currency,reference:operation.providerIdempotencyKey,notificationUrl:`${origin}/api/billing/webhook/korapay`,redirectUrl:`${origin}/settings?billing=return`,customer:{name:session.user.name??'ELCEO customer',email:session.user.email??''},plan:'focus_plan',interval,operationId:operation.internalPaymentOperationId,channels:body.rail?[body.rail]:undefined});
            checkoutUrl=result.checkoutUrl;operation=await repo.transaction(async tx=>{let attached=await tx.recordProviderAccepted(operation.internalPaymentOperationId,null,null);return tx.transition(attached.internalPaymentOperationId,attached.version,'processing',{providerTransactionReference:result.reference,lastProviderComparisonSnapshot:{providerKind:'korapay',providerTransactionReference:result.reference}},'korapay checkout initialized')});
          }else{
            const adapter = new StripeSandboxPaymentProviderAdapter();
            const result = await adapter.createCheckoutOrPaymentSession({ subjectUserId: session.user.id, targetPlan: 'focus_plan', billingInterval: interval, amount: operation.amount, currency: operation.currency, providerIdempotencyKey: operation.providerIdempotencyKey, operationId: operation.internalPaymentOperationId, successUrl: `${origin}/settings?billing=sandbox_success`, cancelUrl: `${origin}/settings?billing=sandbox_cancel` });
            checkoutUrl = result.checkoutUrl;
            operation = await repo.transaction(async tx=>{const attached=await tx.recordProviderAccepted(operation.internalPaymentOperationId,result.providerPaymentReference,result.providerSessionReference);return tx.transition(attached.internalPaymentOperationId,attached.version,'processing', { lastProviderComparisonSnapshot: { providerKind: result.providerKind, providerRequestId: result.providerRequestId, providerPaymentReference: result.providerPaymentReference, providerSessionReference: result.providerSessionReference, safeRedactedPayloadChecksum: result.safeRedactedPayloadChecksum } }, 'sandbox provider accepted')});
          }
        } catch (providerError) {
          const normalized = normalizeProviderError(providerError);
          operation = await repo.transition(operation.internalPaymentOperationId, operation.version, normalized.acceptedByProvider ? 'reconciliation_required' : normalized.unknownOutcome ? 'unknown' : 'failed', { safeErrorCategory: normalized.safeErrorCategory, reconciliationState: normalized.unknownOutcome || normalized.acceptedByProvider ? 'required' : operation.reconciliationState, lastProviderComparisonSnapshot: { providerKind: normalized.providerKind, providerRequestId: normalized.providerRequestId, retryable: normalized.retryable, unknownOutcome: normalized.unknownOutcome, acceptedByProvider: normalized.acceptedByProvider } }, 'sandbox provider error');
        }
      }
      if(unresolved&&!shouldResumeProviderCheckout(operation)&&provider==='stripe'){const reconciled=await reconcileStripePaymentOperation(repo,new StripeSandboxPaymentProviderAdapter(),operation.internalPaymentOperationId);operation=reconciled.operation??operation;}
      logRequest('api.billing.checkout', requestId, 'RC-I2 sandbox checkout operation recorded', { userId: session.user.id, state: operation.state, reused: created.reused });
      return NextResponse.json({ ok: true, liveActivation:providerMode==='production_provider'?'enabled':'blocked',sandboxOnly:providerMode==='sandbox_provider',productionLive:providerMode==='production_provider', providerMode, reused: created.reused, checkoutUrl, operation }, { status: 202, headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
    }
    const result = await internalPaymentRuntime.checkout({ subjectUserId: session.user.id, targetPlan: 'focus_plan', billingInterval: interval, amount:Number(price.amountMinor), currency:price.currency, commercialPriceVersionId:price.id, businessIdempotencyKey, outcome: fakeOutcomesEnabled ? body.fakeProviderOutcome : undefined });
    logRequest('api.billing.checkout', requestId, 'RC-I1 local checkout operation recorded', { userId: session.user.id, state: result.operation.state, reused: result.reused });
    return NextResponse.json({ ok: true, liveActivation: 'blocked', sandboxOnly: false, productionLive: false, providerMode: result.providerMode, reused: result.reused, operation: result.operation }, { status: 202, headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
  } catch (error) {
    captureError('api.billing.checkout', error, { requestId });
    if (error && typeof error === 'object' && (error as { code?: unknown }).code === 'commercial_persistence_unavailable') return NextResponse.json({ ok: false, error: { code: 'service_unavailable', message: 'Commercial persistence unavailable', details: ['commercial_persistence_unavailable'] } }, { status: 503, headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
    const code=error instanceof Error&&['commercial_price_not_configured','payment_idempotency_key_required','payment_idempotency_input_mismatch','payment_provider_capability_not_configured'].includes(error.message)?error.message:error instanceof Error&&error.message==='UNAUTHORIZED'?'unauthorized':'checkout_unavailable'; return NextResponse.json({ error: {code,message:code==='checkout_unavailable'?'Unable to initiate checkout':code} }, { status: code==='checkout_unavailable'?503:resolveStatus(error), headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
  }
}
