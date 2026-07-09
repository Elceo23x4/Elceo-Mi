import { NextResponse } from 'next/server';
import { internalPaymentRuntime, parseStripeWebhookEvent, type FakeProviderOutcome } from '@elceo/application-state';
import { captureError } from '../../../../lib/monitoring';
import { getRequestId, logRequest } from '../../../../lib/request-context';

function resolveStatus(error: unknown): number { if (error instanceof Error && error.message === 'UNAUTHORIZED') return 401; return 400; }
const allowed = new Set(['success','accepted','refund','partial_refund','reversal','chargeback','provider_500_before_accepting']);

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const providerMode = process.env.PAYMENT_PROVIDER_MODE ?? process.env.ELCEO_PAYMENT_PROVIDER_MODE;
    let body: { eventId: string; kind: 'success' | FakeProviderOutcome; providerPaymentReference?: string; providerCheckoutSessionReference?: string; operationId?: string; payload?: Record<string, unknown> };
    if (providerMode === 'sandbox_provider') {
      if (process.env.PAYMENT_PROVIDER_KIND !== 'stripe') throw new Error('unsupported_sandbox_payment_provider');
      const rawBody = await request.text();
      const normalized = parseStripeWebhookEvent(rawBody, request.headers.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET ?? process.env.PAYMENT_PROVIDER_WEBHOOK_SECRET ?? '');
      const kind = normalized.refundOrReversalOrChargeback === 'refund' ? 'refund' : normalized.refundOrReversalOrChargeback === 'partial_refund' ? 'partial_refund' : normalized.refundOrReversalOrChargeback === 'reversal' ? 'reversal' : normalized.refundOrReversalOrChargeback === 'chargeback' ? 'chargeback' : normalized.status === 'succeeded' ? 'success' : normalized.status === 'failed' ? 'provider_500_before_accepting' : 'unknown_result';
      body = { eventId: normalized.providerEventId ?? normalized.safeRedactedPayloadChecksum, kind, operationId: normalized.metadataOperationId ?? undefined, providerPaymentReference: normalized.providerPaymentReference, providerCheckoutSessionReference: normalized.providerSessionReference, payload: { normalized, orphaned: !normalized.metadataOperationId && !normalized.providerPaymentReference && !normalized.providerSessionReference && !normalized.metadataProviderIdempotencyKey } };
    } else {
      if (process.env.ELCEO_PAYMENT_LOCAL_WEBHOOK_REPLAY !== '1') throw new Error('local_webhook_replay_disabled_not_live_provider_verification');
      const configuredSignature = process.env.ELCEO_PAYMENT_LOCAL_WEBHOOK_SECRET;
      if (!configuredSignature) throw new Error('local_webhook_signature_config_required_not_live_provider_verification');
      const signature = request.headers.get('x-elceo-local-webhook-signature');
      if (signature !== configuredSignature) throw new Error('local_webhook_signature_invalid_not_live_provider_verification');
      body = (await request.json()) as { eventId: string; kind: 'success' | FakeProviderOutcome; providerPaymentReference?: string; providerCheckoutSessionReference?: string; operationId?: string; payload?: Record<string, unknown> };
    }
    if (!body.eventId || !allowed.has(body.kind)) throw new Error('invalid_payment_event');
    const result = await internalPaymentRuntime.webhook(body);
    logRequest('api.billing.webhook', requestId, 'RC-I1 local webhook processed', { eventId: body.eventId, duplicate: result.duplicate, operationId: result.operation?.internalPaymentOperationId });
    return NextResponse.json({ ok: true, duplicate: result.duplicate, operation: result.operation, localSignatureBoundary: 'rc-i1-not-live-provider-verification' }, { headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
  } catch (error) {
    captureError('api.billing.webhook', error, { requestId });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid webhook' }, { status: resolveStatus(error), headers: { 'x-request-id': requestId, 'cache-control': 'no-store' } });
  }
}
