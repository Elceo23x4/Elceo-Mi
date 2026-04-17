import { NextResponse } from 'next/server';
import { BillingService } from '@elceo/billing';
import { ApplicationStateService } from '@elceo/application-state';
import { captureError } from '../../../../lib/monitoring';
import { getRequestId, logRequest } from '../../../../lib/request-context';

const billing = new BillingService();
const appState = new ApplicationStateService();
function resolveStatus(error: unknown): number {
  if (error instanceof Error && error.message === 'UNAUTHORIZED') return 401;
  return 400;
}


export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature') ?? request.headers.get('x-billing-signature');
    const sync = await billing.handleWebhook(body, signature);
    await appState.applySubscriptionState(sync.userId, sync.subscription);
    logRequest('api.billing.webhook', requestId, 'webhook synced', { userId: sync.userId, status: sync.subscription.status });
    return NextResponse.json({ ok: true }, { headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
  } catch (error) {
    captureError('api.billing.webhook', error, { requestId });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid webhook' }, { status: resolveStatus(error), headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
  }
}
