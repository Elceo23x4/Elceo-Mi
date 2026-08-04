#!/usr/bin/env node
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { generateImageFixtures } from './image-fixtures.mjs';

assert.equal(process.version, 'v24.19.0');
assert.equal(sharp.versions.sharp, '0.35.3');
const fixtures = await generateImageFixtures();
for (const format of ['png', 'jpeg', 'webp']) {
  const output = await sharp(fixtures[format], { limitInputPixels: 4096 }).rotate().resize(32, undefined, { fit: 'inside', withoutEnlargement: true }).webp().toBuffer();
  const metadata = await sharp(output).metadata();
  assert.deepEqual([metadata.width, metadata.height, metadata.format], [32, 24, 'webp']);
  assert.ok(output.length);
}
const cropped = await sharp(fixtures.png).resize(16, 16, { fit: 'cover', position: 'centre' }).png().toBuffer();
assert.deepEqual([(await sharp(cropped).metadata()).width, (await sharp(cropped).metadata()).height], [16, 16]);
const alpha = await sharp(fixtures.alpha).resize(32, 24).png().toBuffer();
assert.equal((await sharp(alpha).metadata()).hasAlpha, true);
const oriented = await sharp(fixtures.orientation).rotate().resize(32).jpeg().toBuffer();
assert.deepEqual([(await sharp(oriented).metadata()).width, (await sharp(oriented).metadata()).height], [32, 24]);
if (fixtures.avif) assert.equal((await sharp(fixtures.avif).metadata()).format, 'heif');
await assert.rejects(sharp(fixtures.malformed).metadata());
await assert.rejects(sharp(fixtures.oversized, { limitInputPixels: 4096 }).toBuffer());
console.log(`Sharp compatibility passed: sharp ${sharp.versions.sharp}, libvips ${sharp.versions.vips}; PNG/JPEG/WebP/AVIF=${Boolean(fixtures.avif)}, resize/crop/alpha/orientation/rejection matrices passed.`);
