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
  const configurations = {
    resend: { required: ['RESEND_API_KEY','NOTIFICATION_EMAIL_FROM_ADDRESS','NOTIFICATION_SANDBOX_EMAIL'], url: 'https://api.resend.com/emails', headers: { authorization: `Bearer ${env.RESEND_API_KEY ?? ''}` }, body: { from: env.NOTIFICATION_EMAIL_FROM_ADDRESS, to: [env.NOTIFICATION_SANDBOX_EMAIL], subject: 'ELCEO sandbox certification', text: 'ELCEO operator-requested sandbox smoke.' } },
    postmark: { required: ['POSTMARK_SERVER_TOKEN','NOTIFICATION_EMAIL_FROM_ADDRESS','NOTIFICATION_SANDBOX_EMAIL'], url: 'https://api.postmarkapp.com/email', headers: { 'X-Postmark-Server-Token': env.POSTMARK_SERVER_TOKEN ?? '' }, body: { From: env.NOTIFICATION_EMAIL_FROM_ADDRESS, To: env.NOTIFICATION_SANDBOX_EMAIL, Subject: 'ELCEO sandbox certification', TextBody: 'ELCEO operator-requested sandbox smoke.' } },
    onesignal: { required: ['ONESIGNAL_APP_ID','ONESIGNAL_APP_API_KEY','ONESIGNAL_SANDBOX_SUBSCRIPTION_ID'], url: 'https://api.onesignal.com/notifications', headers: { authorization: `Key ${env.ONESIGNAL_APP_API_KEY ?? ''}` }, body: { app_id: env.ONESIGNAL_APP_ID, include_subscription_ids: [env.ONESIGNAL_SANDBOX_SUBSCRIPTION_ID], target_channel: 'push', contents: { en: 'ELCEO operator-requested sandbox smoke.' } } }
  };
  const selected = configurations[provider];
  if (selected.required.some((key) => !env[key]?.trim())) { emit('blocked', 'provider_sandbox_configuration_required'); process.exitCode = 2; }
  else {
    try {
      const response = await fetch(selected.url, { method: 'POST', headers: { 'content-type': 'application/json', ...selected.headers }, body: JSON.stringify(selected.body), signal: AbortSignal.timeout(15_000) });
      const responseText = await response.text();
      console.log(JSON.stringify({ schema:'elceo.notification-sandbox-smoke.v1', provider, mode:'execute', status:response.ok?'accepted':'provider_rejected', httpStatus:response.status, evidenceId:createHash('sha256').update(`${provider}:${response.status}:${responseText}`).digest('hex') }));
      if (!response.ok) process.exitCode = 2;
    } catch { emit('failed', 'provider_network_failure'); process.exitCode = 2; }
  }
}
