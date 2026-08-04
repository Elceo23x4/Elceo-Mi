#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import sharp from 'sharp';
import { generateImageFixtures } from './image-fixtures.mjs';

const publicDir = resolve('apps/web/public');
const port = process.argv.includes('--concurrency-only') ? 43180 : 43179;
const prefix = 'elceo-image-cert-';
let server; let diagnostics = '';
const run = (command, args) => new Promise((ok, fail) => { const child = spawn(command, args, { stdio: 'inherit' }); child.once('error', fail); child.once('exit', (code) => code === 0 ? ok() : fail(new Error(`${command} exited ${code}`))); });
const url = (name, width = 32) => `http://127.0.0.1:${port}/_next/image?url=%2F${prefix}${name}&w=${width}&q=75`;
async function optimized(name, expected = [32, 24]) {
  const response = await fetch(url(name), { headers: { Accept: 'image/webp' } });
  assert.equal(response.status, 200, `${name}: ${response.status}`);
  assert.equal(response.headers.get('content-type'), 'image/webp');
  const payload = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(payload).metadata();
  assert.deepEqual([metadata.width, metadata.height, metadata.format], [...expected, 'webp']);
  return payload;
}
try {
  const fixtures = await generateImageFixtures();
  await mkdir(publicDir, { recursive: true });
  const files = { 'source.png': fixtures.png, 'source.jpg': fixtures.jpeg, 'source.webp': fixtures.webp, 'alpha.png': fixtures.alpha, 'orientation.jpg': fixtures.orientation, 'malformed.png': fixtures.malformed, 'unsupported.svg': fixtures.unsupported };
  await Promise.all(Object.entries(files).map(([name, data]) => writeFile(resolve(publicDir, prefix + name), data)));
  await run('npm', ['run', '-w', 'apps/web', 'build']);
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', 'apps/web', '-p', String(port)], { detached: process.platform !== 'win32', env: { ...process.env, NODE_ENV: 'production' }, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', (chunk) => { diagnostics += chunk; }); server.stderr.on('data', (chunk) => { diagnostics += chunk; });
  for (let i = 0; i < 120; i += 1) { try { if ((await fetch(`http://127.0.0.1:${port}/`)).status < 500) break; } catch {} await delay(250); }
  if (process.argv.includes('--concurrency-only')) {
    const started = Date.now(); const count = 24;
    const responses = await Promise.all(Array.from({ length: count }, (_, i) => optimized(['source.png', 'source.jpg', 'source.webp', 'alpha.png'][i % 4])));
    assert.equal(responses.length, count); assert.equal(server.exitCode, null);
    assert.ok((await fetch(`http://127.0.0.1:${port}/`)).status < 500);
    console.log(`Next image concurrency passed: requests=${count} success=${count} failure=0 durationMs=${Date.now() - started} processExit=running health=passed peakMemory=not-portably-measurable.`);
  } else {
    for (const name of ['source.png', 'source.jpg', 'source.webp', 'alpha.png', 'orientation.jpg']) {
      const output = await optimized(name);
      assert.notEqual(createHash('sha256').update(output).digest('hex'), createHash('sha256').update(files[name]).digest('hex'));
    }
    assert.deepEqual(await optimized('source.png'), await optimized('source.png'), 'cache-repeat output changed');
    for (const name of ['malformed.png', 'unsupported.svg']) assert.equal((await fetch(url(name), { headers: { Accept: 'image/webp' } })).status, 400);
    assert.equal((await fetch(url('source.png', 31), { headers: { Accept: 'image/webp' } })).status, 400);
    const burst = await Promise.all(Array.from({ length: 8 }, () => optimized('source.png'))); assert.equal(burst.length, 8);
    console.log('Next production optimizer passed: PNG/JPEG/WebP/alpha/orientation, rejection, width-boundary, cache and concurrent matrices passed.');
  }
  assert.doesNotMatch(diagnostics, /sharp.*(?:missing|not installed)|fallback|unhandled|native crash/i);
} finally {
  if (server?.exitCode === null) { if (process.platform === 'win32') server.kill('SIGTERM'); else process.kill(-server.pid, 'SIGTERM'); await Promise.race([new Promise((done) => server.once('exit', done)), delay(5000)]); if (server.exitCode === null) process.platform === 'win32' ? server.kill('SIGKILL') : process.kill(-server.pid, 'SIGKILL'); }
  await Promise.all(['source.png', 'source.jpg', 'source.webp', 'alpha.png', 'orientation.jpg', 'malformed.png', 'unsupported.svg'].map((name) => rm(resolve(publicDir, prefix + name), { force: true })));
}
