import { NextResponse } from 'next/server';
import { internalPaymentRuntime, type FakeProviderOutcome } from '@elceo/application-state';
import { requireAppUserState } from '../../../../lib/auth/session';
import { guardRoutePaymentReadiness } from '../../../../lib/server/access/route-entitlement';
import { captureError } from '../../../../lib/monitoring';
import { getRequestId, logRequest } from '../../../../lib/request-context';
import type { UserCommercialEntitlementSnapshot } from '@elceo/types';
import { getUserSocialIdentifiers } from '../../../../lib/server/profile/social-identifiers-store';

function resolveStatus(error: unknown): number { if (error instanceof Error && error.message === 'UNAUTHORIZED') return 401; return 400; }
const amountFor=(interval:string)=>interval==='yearly'?19000:interval==='quarterly'?5400:2000;

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const { session } = await requireAppUserState();
    const body = (await request.json()) as { targetPlan?: string; billingInterval?: string; idempotencyKey?: string; fakeProviderOutcome?: FakeProviderOutcome };
    if (body.targetPlan !== 'premium' && body.targetPlan !== 'focus_plan') throw new Error('Unsupported target plan for checkout');
    const interval = body.billingInterval === 'quarterly' || body.billingInterval === 'yearly' ? body.billingInterval : 'monthly';
    const fromHeader = request.headers.get('x-elceo-commercial-snapshot');
    const snapshot: UserCommercialEntitlementSnapshot = process.env.ELCEO_ALLOW_TEST_COMMERCIAL_SNAPSHOT === '1' && fromHeader ? (JSON.parse(fromHeader) as UserCommercialEntitlementSnapshot) : { userId: session.user.id, nowIso: new Date().toISOString(), trialStartedAt: null, activePlanCode: null, subscriptionActive: false, socialIdentifiers: [], userRestrictionStatus: 'none' };
    const persisted = await getUserSocialIdentifiers(session.user.id);
    const socialIdentifiers = persisted.socialIdentifiers.length > 0 ? persisted.socialIdentifiers : snapshot.socialIdentifiers;
    const readiness = guardRoutePaymentReadiness(socialIdentifiers);
    if (readiness.status !== 'eligible') return NextResponse.json({ error: 'payment_readiness_blocked', code: readiness.reason, subscriptionWall: { required: true, reason: 'focus_plan_required', targetPlanCode: 'focus_plan' }, liveActivation: 'blocked' }, { status: 403, headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
    const businessIdempotencyKey = body.idempotencyKey || request.headers.get('idempotency-key') || `checkout:${session.user.id}:focus_plan:${interval}`;
    const fakeOutcomesEnabled = process.env.ELCEO_PAYMENT_FAKE_OUTCOMES_ENABLED === '1';
    if (body.fakeProviderOutcome && !fakeOutcomesEnabled) return NextResponse.json({ ok: false, error: 'fake_provider_outcome_disabled', liveActivation: 'blocked' }, { status: 400, headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
    const result = await internalPaymentRuntime.checkout({ subjectUserId: session.user.id, targetPlan: 'focus_plan', amount: amountFor(interval), currency: 'USD', businessIdempotencyKey, outcome: fakeOutcomesEnabled ? body.fakeProviderOutcome : undefined });
    logRequest('api.billing.checkout', requestId, 'RC-I1 local checkout operation recorded', { userId: session.user.id, state: result.operation.state, reused: result.reused });
    return NextResponse.json({ ok: true, liveActivation: 'blocked', providerMode: result.providerMode, reused: result.reused, operation: result.operation }, { status: 202, headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
  } catch (error) {
    captureError('api.billing.checkout', error, { requestId });
    if (error && typeof error === 'object' && (error as { code?: unknown }).code === 'commercial_persistence_unavailable') return NextResponse.json({ ok: false, error: { code: 'service_unavailable', message: 'Commercial persistence unavailable', details: ['commercial_persistence_unavailable'] } }, { status: 503, headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to initiate checkout' }, { status: resolveStatus(error), headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
  }
}
