#!/usr/bin/env node

import assert from 'node:assert/strict';
import sharp from 'sharp';

export const PNG_FIXTURE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEUlEQVR4nGP4z8DwH4QZYAwAR8oH+WdZbrcAAAAASUVORK5CYII=';
const input = Buffer.from(PNG_FIXTURE_BASE64, 'base64');
const output = await sharp(input).resize(4, 3).webp().toBuffer();
const metadata = await sharp(output).metadata();

assert.equal(metadata.width, 4);
assert.equal(metadata.height, 3);
assert.equal(metadata.format, 'webp');
assert.ok(output.length > 0);
assert.ok(sharp.versions.sharp);
assert.ok(sharp.versions.vips);

console.log(`Sharp native transformation passed: ${metadata.width}x${metadata.height} ${metadata.format}, ${output.length} bytes; sharp ${sharp.versions.sharp}, libvips ${sharp.versions.vips}.`);
