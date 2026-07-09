import { NextResponse } from 'next/server';
import { internalPaymentRuntime, type FakeProviderOutcome } from '@elceo/application-state';
import { captureError } from '../../../../lib/monitoring';
import { getRequestId, logRequest } from '../../../../lib/request-context';

function resolveStatus(error: unknown): number { if (error instanceof Error && error.message === 'UNAUTHORIZED') return 401; return 400; }
const allowed = new Set(['success','accepted','refund','partial_refund','reversal','chargeback','provider_500_before_accepting']);

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const signature = request.headers.get('x-elceo-local-webhook-signature');
    if (signature !== 'rc-i1-local-correctness-boundary') throw new Error('local_webhook_signature_required_not_live_provider_verification');
    const body = (await request.json()) as { eventId: string; kind: 'success' | FakeProviderOutcome; providerPaymentReference?: string; providerCheckoutSessionReference?: string; operationId?: string; payload?: Record<string, unknown> };
    if (!body.eventId || !allowed.has(body.kind)) throw new Error('invalid_local_payment_event');
    const result = await internalPaymentRuntime.webhook(body);
    logRequest('api.billing.webhook', requestId, 'RC-I1 local webhook processed', { eventId: body.eventId, duplicate: result.duplicate, operationId: result.operation?.internalPaymentOperationId });
    return NextResponse.json({ ok: true, duplicate: result.duplicate, operation: result.operation, localSignatureBoundary: 'rc-i1-not-live-provider-verification' }, { headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
  } catch (error) {
    captureError('api.billing.webhook', error, { requestId });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid webhook' }, { status: resolveStatus(error), headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
  }
}
