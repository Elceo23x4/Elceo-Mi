#!/usr/bin/env node
import { createHash } from 'node:crypto';

const env = process.env;
const args = process.argv.slice(2);
const providerIndex = args.indexOf('--provider');
const provider = providerIndex >= 0 ? args[providerIndex + 1] : undefined;
const execute = args.includes('--execute');
const supported = new Set(['resend', 'postmark', 'onesignal']);
const emit = (status, reason = null) => console.log(JSON.stringify({
  schema: 'elceo.notification-sandbox-smoke.v1', provider: supported.has(provider ?? '') ? provider : null,
  mode: execute ? 'execute' : 'preflight', status, reason,
  evidenceId: createHash('sha256').update(`${provider ?? 'none'}:${execute}:${status}:${reason ?? ''}`).digest('hex')
}));

if (!provider || !supported.has(provider)) { emit('failed', 'unsupported_provider'); process.exitCode = 2; }
else if (!execute) emit('ready', 'external_send_not_requested');
else if (env.ELCEO_NOTIFICATION_SANDBOX_SMOKE !== '1' || env.NOTIFICATION_PROVIDER_MODE !== 'sandbox_provider') {
  emit('blocked', 'explicit_sandbox_opt_in_required'); process.exitCode = 2;
} else {
  // Execution remains fail-closed until an operator supplies a separately certified sandbox adapter.
  emit('blocked', 'sandbox_adapter_not_certified'); process.exitCode = 2;
}
