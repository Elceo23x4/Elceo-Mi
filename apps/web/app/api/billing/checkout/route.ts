import { NextResponse } from 'next/server';
import { StripeSandboxPaymentProviderAdapter, internalPaymentRuntime, normalizeProviderError, type FakeProviderOutcome } from '@elceo/application-state';
import { requireAppUserState } from '../../../../lib/auth/session';
import { guardRoutePaymentReadiness } from '../../../../lib/server/access/route-entitlement';
import { captureError } from '../../../../lib/monitoring';
import { getRequestId, logRequest } from '../../../../lib/request-context';
import { getCommercialPlanCatalog, resolveUserCommercialEntitlementSnapshot } from '@elceo/application-state';
import { getUserSocialIdentifiers } from '../../../../lib/server/profile/social-identifiers-store';

function resolveStatus(error: unknown): number { if (error instanceof Error && error.message === 'UNAUTHORIZED') return 401; return 400; }
const amountFor=(interval:string)=>{ const focus=getCommercialPlanCatalog().plans.find(p=>p.planCode==='focus_plan'); if(interval!=='monthly'||!focus||!('monthlyPrice' in focus)) throw new Error('billing_interval_not_configured'); return focus.monthlyPrice.amount*100; };

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const { session } = await requireAppUserState();
    const body = (await request.json()) as { targetPlan?: string; billingInterval?: string; idempotencyKey?: string; fakeProviderOutcome?: FakeProviderOutcome };
    if (body.targetPlan !== 'focus_plan') throw new Error('Unsupported target plan for checkout');
    const interval = body.billingInterval === 'quarterly' || body.billingInterval === 'yearly' ? body.billingInterval : 'monthly';
    const snapshot = await resolveUserCommercialEntitlementSnapshot(session.user.id);
    const persisted = await getUserSocialIdentifiers(session.user.id);
    const socialIdentifiers = persisted.socialIdentifiers.length > 0 ? persisted.socialIdentifiers : snapshot.socialIdentifiers;
    const readiness = guardRoutePaymentReadiness(socialIdentifiers);
    if (readiness.status !== 'eligible') return NextResponse.json({ error: 'payment_readiness_blocked', code: readiness.reason, subscriptionWall: { required: true, reason: 'focus_plan_required', targetPlanCode: 'focus_plan' }, liveActivation: 'blocked', sandboxOnly: false, productionLive: false }, { status: 403, headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
    const businessIdempotencyKey = body.idempotencyKey || request.headers.get('idempotency-key') || `checkout:${session.user.id}:focus_plan:${interval}`;
    const deployed = process.env.APP_ENV === 'staging' || process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';
    const fakeOutcomesEnabled = !deployed && process.env.ELCEO_PAYMENT_FAKE_OUTCOMES_ENABLED === '1';
    if (body.fakeProviderOutcome && !fakeOutcomesEnabled) return NextResponse.json({ ok: false, error: 'fake_provider_outcome_disabled', liveActivation: 'blocked' }, { status: 400, headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
    const providerMode = process.env.PAYMENT_PROVIDER_MODE ?? process.env.ELCEO_PAYMENT_PROVIDER_MODE;
    if (providerMode === 'sandbox_provider') {
      if (process.env.ELCEO_PAYMENT_SANDBOX_SMOKE !== '1') throw new Error('sandbox_checkout_requires_explicit_smoke_context');
      const repo = internalPaymentRuntime.repository;
      const created = await repo.createOrReuseOperation({ subjectUserId: session.user.id, targetPlan: 'focus_plan', billingInterval: interval, amount: amountFor(interval), currency: 'USD', businessIdempotencyKey, provider: 'stripe' });
      let operation = created.operation;
      let checkoutUrl: string | null = null;
      if (!created.reused && !operation.providerCheckoutSessionReference && !operation.providerPaymentReference) {
        try {
          const adapter = new StripeSandboxPaymentProviderAdapter();
          const origin = new URL(request.url).origin;
          const provider = await adapter.createCheckoutOrPaymentSession({ subjectUserId: session.user.id, targetPlan: 'focus_plan', billingInterval: interval, amount: operation.amount, currency: operation.currency, providerIdempotencyKey: operation.providerIdempotencyKey, operationId: operation.internalPaymentOperationId, successUrl: `${origin}/settings?billing=sandbox_success`, cancelUrl: `${origin}/settings?billing=sandbox_cancel` });
          checkoutUrl = provider.checkoutUrl;
          operation = await repo.recordProviderAccepted(operation.internalPaymentOperationId, provider.providerPaymentReference ?? provider.providerSessionReference ?? operation.providerIdempotencyKey, provider.providerSessionReference ?? provider.providerPaymentReference ?? operation.providerIdempotencyKey);
          operation = await repo.transition(operation.internalPaymentOperationId, operation.version, 'processing', { lastProviderComparisonSnapshot: { providerKind: provider.providerKind, providerRequestId: provider.providerRequestId, providerPaymentReference: provider.providerPaymentReference, providerSessionReference: provider.providerSessionReference, safeRedactedPayloadChecksum: provider.safeRedactedPayloadChecksum } }, 'sandbox provider accepted');
        } catch (providerError) {
          const normalized = normalizeProviderError(providerError);
          operation = await repo.transition(operation.internalPaymentOperationId, operation.version, normalized.acceptedByProvider ? 'reconciliation_required' : normalized.unknownOutcome ? 'unknown' : 'failed', { safeErrorCategory: normalized.safeErrorCategory, reconciliationState: normalized.unknownOutcome || normalized.acceptedByProvider ? 'required' : operation.reconciliationState, lastProviderComparisonSnapshot: { providerKind: normalized.providerKind, providerRequestId: normalized.providerRequestId, retryable: normalized.retryable, unknownOutcome: normalized.unknownOutcome, acceptedByProvider: normalized.acceptedByProvider } }, 'sandbox provider error');
        }
      }
      logRequest('api.billing.checkout', requestId, 'RC-I2 sandbox checkout operation recorded', { userId: session.user.id, state: operation.state, reused: created.reused });
      return NextResponse.json({ ok: true, liveActivation: 'blocked', sandboxOnly: true, productionLive: false, providerMode, reused: created.reused, checkoutUrl, operation }, { status: 202, headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
    }
    const result = await internalPaymentRuntime.checkout({ subjectUserId: session.user.id, targetPlan: 'focus_plan', billingInterval: interval, amount: amountFor(interval), currency: 'USD', businessIdempotencyKey, outcome: fakeOutcomesEnabled ? body.fakeProviderOutcome : undefined });
    logRequest('api.billing.checkout', requestId, 'RC-I1 local checkout operation recorded', { userId: session.user.id, state: result.operation.state, reused: result.reused });
    return NextResponse.json({ ok: true, liveActivation: 'blocked', sandboxOnly: false, productionLive: false, providerMode: result.providerMode, reused: result.reused, operation: result.operation }, { status: 202, headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
  } catch (error) {
    captureError('api.billing.checkout', error, { requestId });
    if (error && typeof error === 'object' && (error as { code?: unknown }).code === 'commercial_persistence_unavailable') return NextResponse.json({ ok: false, error: { code: 'service_unavailable', message: 'Commercial persistence unavailable', details: ['commercial_persistence_unavailable'] } }, { status: 503, headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
    const code=error instanceof Error&&error.message==='billing_interval_not_configured'?'billing_interval_not_configured':error instanceof Error&&error.message==='UNAUTHORIZED'?'unauthorized':'checkout_unavailable'; return NextResponse.json({ error: {code,message:code==='checkout_unavailable'?'Unable to initiate checkout':code} }, { status: code==='checkout_unavailable'?503:resolveStatus(error), headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
  }
}
