import { getNotificationRuntimes } from '@/lib/server/composition';
import { normalizePostmarkWebhook, verifyPostmarkBasicAuth } from '@elceo/notifications';

export async function POST(request: Request): Promise<Response> {
  if (!verifyPostmarkBasicAuth(request.headers.get('authorization'), process.env.POSTMARK_WEBHOOK_USERNAME ?? '', process.env.POSTMARK_WEBHOOK_PASSWORD ?? '')) return new Response('invalid authentication', { status: 401, headers: { 'www-authenticate': 'Basic realm="ELCEO Postmark webhook"' } });
  let parsed: unknown; try { parsed = JSON.parse(await request.text()); } catch { return new Response('invalid payload', { status: 400 }); }
  const event = normalizePostmarkWebhook(parsed); if (!event) return new Response('unsupported payload', { status: 400 });
  const result = await getNotificationRuntimes().feedback.processProviderEvent('postmark', 'email', event);
  return Response.json({ ok: true, providerEventId: result.providerEventId });
}
