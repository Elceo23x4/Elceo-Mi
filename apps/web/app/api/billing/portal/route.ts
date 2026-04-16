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
    const origin = runtimeEnv().NEXT_PUBLIC_APP_BASE_URL ?? 'http://localhost:3000';

    const portal = await billing.createPortalSession({
      userId: session.user.id,
      email: session.user.email ?? 'unknown@elceo.dev',
      returnUrl: `${origin}/settings`
    });

    logRequest('api.billing.portal', requestId, 'portal session created', { userId: session.user.id });
    return NextResponse.json(portal, { headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
  } catch (error) {
    captureError('api.billing.portal', error, { requestId });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to open billing portal' }, { status: resolveStatus(error), headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
  }
}
function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

