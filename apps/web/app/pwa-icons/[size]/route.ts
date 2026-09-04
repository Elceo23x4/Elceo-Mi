import { isPwaIconSize, renderPwaIcon } from '../../../lib/server/pwa-icon';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ size: string }> }): Promise<Response> {
  const size = Number((await context.params).size);
  if (!Number.isInteger(size) || !isPwaIconSize(size)) return new Response('not found', { status: 404 });

  const { bytes, etag } = await renderPwaIcon(size);
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(bytes.byteLength),
      'Content-Type': 'image/png',
      ETag: etag
    }
  });
}
