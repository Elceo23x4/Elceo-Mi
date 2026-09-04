import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import manifest from '../app/manifest.js';
import { GET } from '../app/pwa-icons/[size]/route.js';

const pngDimensions = (bytes: Uint8Array) => ({
  width: Buffer.from(bytes).readUInt32BE(16),
  height: Buffer.from(bytes).readUInt32BE(20)
});

export async function runPwaIconRouteTests(): Promise<void> {
  const checksums = new Map<number, string>();
  for (const size of [192, 256, 512]) {
    const context = { params: Promise.resolve({ size: String(size) }) };
    const response = await GET(new Request(`http://localhost/pwa-icons/${size}`), context);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/png');
    assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.deepEqual([...bytes.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.deepEqual(pngDimensions(bytes), { width: size, height: size });
    assert.equal(response.headers.get('content-length'), String(bytes.byteLength));
    const checksum = createHash('sha256').update(bytes).digest('base64url');
    assert.equal(response.headers.get('etag'), `"sha256-${checksum}"`);
    checksums.set(size, checksum);
    const repeat = new Uint8Array(await (await GET(new Request(`http://localhost/pwa-icons/${size}`), context)).arrayBuffer());
    assert.equal(createHash('sha256').update(repeat).digest('base64url'), checksum);
  }
  assert.equal(checksums.size, 3);
  const icons = manifest().icons ?? [];
  assert.ok(icons.some((icon) => icon.src === '/pwa-icons/192' && icon.sizes === '192x192' && icon.type === 'image/png'));
  assert.ok(icons.some((icon) => icon.src === '/pwa-icons/512' && icon.sizes === '512x512' && icon.type === 'image/png'));
  assert.equal((await GET(new Request('http://localhost/pwa-icons/128'), { params: Promise.resolve({ size: '128' }) })).status, 404);
}
