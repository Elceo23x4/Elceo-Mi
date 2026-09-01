#!/usr/bin/env node
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import nextConfig from '../apps/web/next.config.mjs';

const root = path.resolve('apps/web/.next/static');
const forbidden = ['RESEND_API_KEY','RESEND_WEBHOOK_SECRET','POSTMARK_SERVER_TOKEN','POSTMARK_WEBHOOK_USERNAME','POSTMARK_WEBHOOK_PASSWORD','ONESIGNAL_APP_API_KEY','ONESIGNAL_REST_API_KEY','ONESIGNAL_WEBHOOK_CORRELATION_SECRET','DATABASE_URL','AUTH_SECRET'];
const sentinels = forbidden.map((name) => name === 'DATABASE_URL'
  ? 'postgresql://rc_i3_client_secret_sentinel_database_url@localhost/rc_i3'
  : `rc_i3_client_secret_sentinel_${name.toLowerCase()}`);
async function files(directory) { const output=[]; for (const name of await readdir(directory)) { const full=path.join(directory,name); (await stat(full)).isDirectory() ? output.push(...await files(full)) : output.push(full); } return output; }
for (const file of await files(root)) {
  if (!/\.(?:js|css|json|map)$/.test(file)) continue;
  const content = await readFile(file, 'utf8');
  const leaked = [...forbidden, ...sentinels].find((token) => content.includes(token));
  if (leaked) throw new Error(`notification_client_secret_boundary_failed:${path.relative(root,file)}:${leaked}`);
}
const configuredHeaders = await nextConfig.headers();
const csp = configuredHeaders.flatMap((entry) => entry.headers).find((header) => header.key === 'Content-Security-Policy')?.value ?? '';
if (!csp.includes('script-src') || !csp.includes('https://cdn.onesignal.com') || !csp.includes('connect-src') || !csp.includes('https://api.onesignal.com')) throw new Error('onesignal_csp_origins_missing');
if (csp.includes('script-src *') || csp.includes('connect-src *') || csp.includes('https://unrelated.example')) throw new Error('onesignal_csp_overbroad');
console.log(JSON.stringify({ acceptance:'notification-client-secret-boundary', browserArtifactsOnly:true, forbiddenIdentifiers:forbidden.length, sentinelValues:sentinels.length, status:'passed' }));
