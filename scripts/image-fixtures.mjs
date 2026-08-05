import sharp from 'sharp';

export const FIXTURE_WIDTH = 64;
export const FIXTURE_HEIGHT = 48;
export const MALFORMED_IMAGE = Buffer.from('ELCEO malformed image fixture', 'utf8');
export const UNSUPPORTED_IMAGE = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', 'utf8');

function pixels(width = FIXTURE_WIDTH, height = FIXTURE_HEIGHT, alpha = false) {
  const channels = alpha ? 4 : 3;
  const data = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const offset = (y * width + x) * channels;
    data[offset] = x * 3; data[offset + 1] = y * 5; data[offset + 2] = (x + y) * 2;
    if (alpha) data[offset + 3] = 64 + ((x + y) % 192);
  }
  return { data, raw: { width, height, channels } };
}

export async function generateImageFixtures() {
  const rgb = pixels();
  const alpha = pixels(FIXTURE_WIDTH, FIXTURE_HEIGHT, true);
  const avifSupported = Boolean(sharp.format.avif?.output?.buffer);
  return {
    png: await sharp(rgb.data, { raw: rgb.raw }).png().toBuffer(),
    jpeg: await sharp(rgb.data, { raw: rgb.raw }).jpeg({ quality: 90 }).toBuffer(),
    webp: await sharp(rgb.data, { raw: rgb.raw }).webp({ quality: 90 }).toBuffer(),
    alpha: await sharp(alpha.data, { raw: alpha.raw }).png().toBuffer(),
    orientation: await sharp(pixels(48, 64).data, { raw: pixels(48, 64).raw }).jpeg().withMetadata({ orientation: 6 }).toBuffer(),
    avif: avifSupported ? await sharp(rgb.data, { raw: rgb.raw }).avif().toBuffer() : null,
    malformed: MALFORMED_IMAGE,
    unsupported: UNSUPPORTED_IMAGE,
    oversized: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100000" height="100000"><rect width="100%" height="100%"/></svg>'),
  };
}
