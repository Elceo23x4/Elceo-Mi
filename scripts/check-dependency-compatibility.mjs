#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import semver from 'semver';
const require = createRequire(import.meta.url);
const root = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const manifest = JSON.parse(readFileSync(new URL('./dependency-compatibility-exceptions.json', import.meta.url)));
function pkg(name, entry = name) { let directory = dirname(require.resolve(entry)); while (directory !== dirname(directory)) { try { const value = JSON.parse(readFileSync(join(directory, 'package.json'))); if (value.name === name) return value; } catch {} directory = dirname(directory); } throw new Error(`missing ${name} metadata`); }
assert.equal(manifest.schemaVersion, 1); assert.equal(manifest.exceptions.length, 0, 'supported graph must have no active exception');
const next = pkg('next', 'next/dist/server/next-server'); const sharp = pkg('sharp');
assert.equal(next.version, '16.3.3'); assert.equal(sharp.version, '0.35.3'); assert.equal(next.optionalDependencies.sharp, '^0.35.3');
assert.ok(semver.satisfies(sharp.version, next.optionalDependencies.sharp));
assert.equal(root.overrides?.sharp, undefined); assert.equal(root.overrides?.next?.sharp, undefined);
for (const flag of ['--force', '--legacy-peer-deps']) for (const path of ['package.json', '.github/workflows/ci.yml', 'scripts/release-gate.mjs']) assert.ok(!readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').includes(flag));
const tree = JSON.parse(execFileSync('npm', ['ls', '--all', '--json'], { encoding: 'utf8' })); assert.ok(!(tree.problems ?? []).some((problem) => /invalid|peer dep missing/i.test(problem)));
const audit = JSON.parse(execFileSync('npm', ['audit', '--json'], { encoding: 'utf8' })); assert.deepEqual(audit.metadata.vulnerabilities, { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 });
console.log(`Supported graph verified with no active exception: next@${next.version} declares ${next.optionalDependencies.sharp}; sharp@${sharp.version} satisfies it; tree and audit passed.`);
