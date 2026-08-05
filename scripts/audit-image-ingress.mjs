#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const findings = [];
const patterns = [/from\s+['"]next\/image/, /<Image\b/, /<img\b/, /\/_next\/image/, /remotePatterns\s*:/, /\bdomains\s*:/, /loader\s*:/, /data:image\//, /blob:/];
function walk(path) { for (const name of readdirSync(path)) { if (['.next', 'dist-test', 'node_modules'].includes(name)) continue; const file = join(path, name); if (statSync(file).isDirectory()) walk(file); else if (/\.(?:[cm]?[jt]sx?)$/.test(name)) { const text = readFileSync(file, 'utf8'); patterns.forEach((pattern) => { if (pattern.test(text)) findings.push(`${file}:${pattern}`); }); } } }
walk('apps/web');
const config = readFileSync('apps/web/next.config.mjs', 'utf8');
assert.ok(!/remotePatterns\s*:|\bdomains\s*:|loader\s*:/.test(config), 'remote images or custom loader unexpectedly enabled');
assert.deepEqual(findings.filter((finding) => !finding.startsWith('apps/web/next.config.mjs:') && !finding.startsWith('apps/web/next-env.d.ts:')), [], `undocumented product image ingress: ${findings.join(', ')}`);
console.log(`Image ingress audit passed: product ingress=0, remotePatterns=0, domains=0, custom loaders=0; local certification fixture only. Findings=${JSON.stringify(findings)}`);
