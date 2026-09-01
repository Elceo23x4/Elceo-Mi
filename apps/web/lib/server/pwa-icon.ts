import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const PWA_ICON_SIZES = [192, 256, 512] as const;
export type PwaIconSize = (typeof PWA_ICON_SIZES)[number];

const cache = new Map<PwaIconSize, Promise<{ bytes: Buffer; etag: string }>>();

export function isPwaIconSize(value: number): value is PwaIconSize {
  return PWA_ICON_SIZES.includes(value as PwaIconSize);
}

/** Rasterizes the approved SVG in memory. No raster asset is ever written to disk. */
export function renderPwaIcon(size: PwaIconSize) {
  let pending = cache.get(size);
  if (!pending) {
    pending = (async () => {
      const source = await readFile(path.join(process.cwd(), 'public/elceo/assets/source/retro_computer_logo.svg'));
      const bytes = await sharp(source, { density: 384 })
        .resize(size, size, { fit: 'contain' })
        .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
        .toBuffer();
      return { bytes, etag: `"sha256-${createHash('sha256').update(bytes).digest('base64url')}"` };
    })();
    cache.set(size, pending);
  }
  return pending;
}
