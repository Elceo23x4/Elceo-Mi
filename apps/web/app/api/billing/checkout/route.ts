import { NextResponse } from 'next/server';
import { BillingService } from '@elceo/billing';
import { requireAppUserState } from '../../../../lib/auth/session';
import { captureError } from '../../../../lib/monitoring';
import { getRequestId, logRequest } from '../../../../lib/request-context';

const billing = new BillingService();
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

    const origin = runtimeEnv().NEXT_PUBLIC_APP_BASE_URL ?? 'http://localhost:3000';
    const checkout = await billing.createUpgradeCheckout({
      userId: session.user.id,
      email: session.user.email ?? 'unknown@elceo.dev',
      targetPlan: body.targetPlan,
      successUrl: `${origin}/settings?billing=success`,
      cancelUrl: `${origin}/settings?billing=cancelled`
    });

    logRequest('api.billing.checkout', requestId, 'checkout session created', { userId: session.user.id });
    return NextResponse.json(checkout, { headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
  } catch (error) {
    captureError('api.billing.checkout', error, { requestId });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to initiate checkout' }, { status: resolveStatus(error), headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
  }
}
function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

