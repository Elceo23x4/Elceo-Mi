#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { PNG_FIXTURE_BASE64 } from './test-sharp-runtime.mjs';

const fixture = resolve('apps/web/public/elceo-next-image-runtime.png');
const port = 43179;
let server;
let diagnostics = '';

function runBuild() {
  return new Promise((resolveBuild, rejectBuild) => {
    const build = spawn('npm', ['run', '-w', 'apps/web', 'build'], { cwd: process.cwd(), env: process.env, stdio: 'inherit' });
    build.once('error', rejectBuild);
    build.once('exit', (code, signal) => code === 0 ? resolveBuild() : rejectBuild(new Error(`Production fixture build failed (${signal ?? code})`)));
  });
}

try {
  await mkdir(resolve('apps/web/public'), { recursive: true });
  await writeFile(fixture, Buffer.from(PNG_FIXTURE_BASE64, 'base64'));
  await runBuild();
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', 'apps/web', '-p', String(port)], {
    cwd: process.cwd(),
    detached: process.platform !== 'win32',
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => { diagnostics += chunk; });
  server.stderr.on('data', (chunk) => { diagnostics += chunk; });

  const deadline = Date.now() + 30_000;
  let response;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Next server exited early (${server.exitCode})\n${diagnostics}`);
    try {
      response = await fetch(`http://127.0.0.1:${port}/_next/image?url=%2Felceo-next-image-runtime.png&w=32&q=75`);
      if (response.status === 200) break;
    } catch {}
    await delay(250);
  }
  assert.ok(response, `Next server did not become ready\n${diagnostics}`);
  assert.equal(response.status, 200, `optimizer returned ${response.status}\n${diagnostics}`);
  assert.match(response.headers.get('content-type') ?? '', /^image\/(?:webp|avif|png)/);
  const payload = Buffer.from(await response.arrayBuffer());
  assert.ok(payload.length > 0);
  assert.doesNotMatch(diagnostics, /sharp.*(?:missing|not installed)|optimizer.*fallback|transformation.*fail/i);
  console.log(`Next.js production image optimizer passed: ${response.headers.get('content-type')}, ${payload.length} bytes.`);
} finally {
  if (server && server.exitCode === null) {
    if (process.platform === 'win32') server.kill('SIGTERM');
    else process.kill(-server.pid, 'SIGTERM');
    await Promise.race([new Promise((resolveExit) => server.once('exit', resolveExit)), delay(5_000)]);
    if (server.exitCode === null) {
      if (process.platform === 'win32') server.kill('SIGKILL');
      else process.kill(-server.pid, 'SIGKILL');
    }
  }
  await rm(fixture, { force: true });
}
