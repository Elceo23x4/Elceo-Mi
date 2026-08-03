#!/usr/bin/env node

import assert from 'node:assert/strict';
import { transform } from '@svgr/core';
import jsxPlugin from '@svgr/plugin-jsx';
import svgoPlugin from '@svgr/plugin-svgo';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="20" height="10" fill="#0cf"/></svg>';
const component = await transform(svg, { plugins: [svgoPlugin, jsxPlugin], jsxRuntime: 'automatic' }, { componentName: 'RuntimeProofIcon' });

assert.ok(component.length > 0);
assert.match(component, /function RuntimeProofIcon|const RuntimeProofIcon/);
assert.match(component, /<svg/);

function packageVersion(name) {
  let directory = dirname(require.resolve(name));
  while (!existsSync(join(directory, 'package.json'))) directory = dirname(directory);
  return JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')).version;
}
const versions = Object.fromEntries(['@svgr/core', '@svgr/plugin-jsx', '@svgr/plugin-svgo', '@svgr/webpack', 'svgo'].map((name) => [name, packageVersion(name)]));
assert.equal(versions['@svgr/core'], '8.1.0');
assert.equal(versions['@svgr/plugin-jsx'], '8.1.0');
assert.equal(versions['@svgr/plugin-svgo'], '8.1.0');
assert.equal(versions['@svgr/webpack'], '8.1.0');
assert.equal(versions.svgo, '4.0.2');
console.log(`SVG pipeline passed with ${JSON.stringify(versions)}; generated ${component.length} bytes.`);
