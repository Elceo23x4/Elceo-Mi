import { NextResponse } from 'next/server';
import { requireAppUserState } from '../../../../lib/auth/session';
import { guardRoutePaymentReadiness } from '../../../../lib/server/access/route-entitlement';
import { captureError } from '../../../../lib/monitoring';
import { getRequestId, logRequest } from '../../../../lib/request-context';
import type { UserCommercialEntitlementSnapshot } from '@elceo/types';
import { getUserSocialIdentifiers } from '../../../../lib/server/profile/social-identifiers-store';

function resolveStatus(error: unknown): number {
  if (error instanceof Error && error.message === 'UNAUTHORIZED') return 401;
  return 400;
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const { session } = await requireAppUserState();
    const body = (await request.json()) as { targetPlan: 'premium' | 'free' | string };
    if (body.targetPlan !== 'premium') {
      throw new Error('Unsupported target plan for checkout');
    }

    const fromHeader = request.headers.get('x-elceo-commercial-snapshot');
    const snapshot: UserCommercialEntitlementSnapshot =
      process.env.ELCEO_ALLOW_TEST_COMMERCIAL_SNAPSHOT === '1' && fromHeader
        ? (JSON.parse(fromHeader) as UserCommercialEntitlementSnapshot)
        : { userId: session.user.id, nowIso: new Date().toISOString(), trialStartedAt: null, activePlanCode: null, subscriptionActive: false, socialIdentifiers: [], userRestrictionStatus: 'none' };
    const persisted = await getUserSocialIdentifiers(session.user.id);
    const socialIdentifiers = persisted.socialIdentifiers.length > 0 ? persisted.socialIdentifiers : snapshot.socialIdentifiers;
    const readiness = guardRoutePaymentReadiness(socialIdentifiers);
    if (readiness.status !== 'eligible') {
      return NextResponse.json({ error: 'payment_readiness_blocked', code: readiness.reason, subscriptionWall: { required: true, reason: 'focus_plan_required', targetPlanCode: 'focus_plan' }, liveActivation: 'blocked' }, { status: 403, headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
    }

    logRequest('api.billing.checkout', requestId, 'checkout activation blocked in Post-C6-P1', { userId: session.user.id });
    return NextResponse.json(
      {
        status: 'blocked_live_activation',
        provider: 'korapay',
        message: 'Live checkout remains disabled in Post-C6-P1.',
        subscriptionWall: { required: true, reason: 'focus_plan_required', targetPlanCode: 'focus_plan' }
      },
      { status: 403, headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } }
    );
  } catch (error) {
    captureError('api.billing.checkout', error, { requestId });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to initiate checkout' }, { status: resolveStatus(error), headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
  }
}
