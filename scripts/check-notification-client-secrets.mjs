#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const forbiddenNotificationClientTokens = ['RESEND_API_KEY','RESEND_WEBHOOK_SECRET','POSTMARK_SERVER_TOKEN','POSTMARK_WEBHOOK_USERNAME','POSTMARK_WEBHOOK_PASSWORD','ONESIGNAL_APP_API_KEY','ONESIGNAL_REST_API_KEY','ONESIGNAL_WEBHOOK_CORRELATION_SECRET','DATABASE_URL','AUTH_SECRET'];
export const notificationSecretSentinels = forbiddenNotificationClientTokens.map((name) => name === 'DATABASE_URL'
  ? 'postgresql://rc_i3_client_secret_sentinel_database_url@localhost/rc_i3'
  : `rc_i3_client_secret_sentinel_${name.toLowerCase()}`);

async function files(directory) {
  const output = [];
  for (const name of await readdir(directory)) {
    const full = path.join(directory, name);
    (await stat(full)).isDirectory() ? output.push(...await files(full)) : output.push(full);
  }
  return output;
}

/** Only assets served to a browser are scanned; `.next/server` is deliberately outside these roots. */
export async function scanNotificationBrowserArtifacts(webRoot) {
  const roots = [path.join(webRoot, '.next/static'), path.join(webRoot, 'public')];
  for (const root of roots) {
    for (const file of await files(root)) {
      if (!/\.(?:js|css|json|map|webmanifest)$/.test(file)) continue;
      const content = await readFile(file, 'utf8');
      const leaked = [...forbiddenNotificationClientTokens, ...notificationSecretSentinels].find((token) => content.includes(token));
      if (leaked) throw new Error(`notification_client_secret_boundary_failed:${path.relative(webRoot, file)}:${leaked}`);
    }
  }
}

async function regressionFixtures() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'elceo-notification-client-'));
  try {
    await mkdir(path.join(root, '.next/static'), { recursive: true });
    await mkdir(path.join(root, '.next/server'), { recursive: true });
    await mkdir(path.join(root, 'public'), { recursive: true });
    await writeFile(path.join(root, '.next/server/server.js'), 'ONESIGNAL_REST_API_KEY=server_only');
    await writeFile(path.join(root, '.next/static/client.js'), 'const publicAppId="public"');
    await scanNotificationBrowserArtifacts(root);
    await writeFile(path.join(root, '.next/static/client.js'), 'ONESIGNAL_REST_API_KEY');
    await assert.rejects(scanNotificationBrowserArtifacts(root), /\.next\/static\/client\.js:ONESIGNAL_REST_API_KEY/);
    await writeFile(path.join(root, '.next/static/client.js'), notificationSecretSentinels[6]);
    await assert.rejects(scanNotificationBrowserArtifacts(root), /rc_i3_client_secret_sentinel_onesignal_rest_api_key/);
  } finally { await rm(root, { recursive: true, force: true }); }
}

async function main() {
  await regressionFixtures();
  await scanNotificationBrowserArtifacts(path.resolve('apps/web'));
  const middleware = await readFile('apps/web/middleware.ts', 'utf8');
  if (!middleware.includes('https://cdn.onesignal.com') || !middleware.includes('https://api.onesignal.com')) throw new Error('onesignal_csp_origins_missing');
  if (middleware.includes("script-src *") || middleware.includes("connect-src *") || middleware.includes('https://unrelated.example')) throw new Error('onesignal_csp_overbroad');
  console.log(JSON.stringify({ acceptance:'notification-client-secret-boundary', browserRoots:['.next/static','public'], serverFixtureIgnored:true, clientIdentifierRejected:true, clientSentinelRejected:true, status:'passed' }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
