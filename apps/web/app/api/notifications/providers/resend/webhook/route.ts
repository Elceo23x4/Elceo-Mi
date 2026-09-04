import { getNotificationRuntimes } from '@/lib/server/composition';
import { normalizeResendWebhook, verifyResendWebhook } from '@elceo/notifications';

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const id = request.headers.get('svix-id');
  if (!verifyResendWebhook(rawBody, { id, timestamp: request.headers.get('svix-timestamp'), signature: request.headers.get('svix-signature') }, process.env.RESEND_WEBHOOK_SECRET ?? '')) return new Response('invalid signature', { status: 401 });
  let parsed: unknown; try { parsed = JSON.parse(rawBody); } catch { return new Response('invalid payload', { status: 400 }); }
  const event = normalizeResendWebhook(id!, parsed); if (!event) return new Response('unsupported payload', { status: 400 });
  const result = await getNotificationRuntimes().feedback.processProviderEvent('resend', 'email', event);
  return Response.json({ ok: true, providerEventId: result.providerEventId });
}
