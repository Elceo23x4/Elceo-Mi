#!/usr/bin/env node
const env = process.env;
const incomplete = (message) => { console.log(`notification sandbox execution not completed: ${message}`); process.exit(2); };
if (env.ELCEO_NOTIFICATION_SANDBOX_SMOKE !== '1') incomplete('explicit opt-in unavailable');
if (env.NOTIFICATION_PROVIDER_MODE === 'production_provider' || env.NOTIFICATION_PROVIDER_MODE === 'production_provider_blocked') throw new Error('production_notification_provider_blocked');
if (env.NOTIFICATION_PROVIDER_MODE !== 'sandbox_provider') incomplete('explicit sandbox provider mode unavailable');
if (env.APP_STATE_REPOSITORY !== 'sql') incomplete('SQL durability unavailable');
if (!env.DATABASE_URL) incomplete('SQL durability unavailable');
const provider = process.argv.includes('--provider') ? process.argv[process.argv.indexOf('--provider') + 1] : env.NOTIFICATION_PROVIDER_KIND;
if (!provider) incomplete('provider selection unavailable');
const requiredByProvider = {
  resend: ['RESEND_API_KEY', 'NOTIFICATION_EMAIL_FROM_ADDRESS'],
  postmark: ['POSTMARK_SERVER_TOKEN', 'NOTIFICATION_EMAIL_FROM_ADDRESS'],
  onesignal: ['ONESIGNAL_APP_ID', 'ONESIGNAL_APP_API_KEY', 'ONESIGNAL_SANDBOX_SUBSCRIPTION_ID']
};
const required = requiredByProvider[provider] ?? [];
if (required.length === 0) incomplete('unsupported sandbox scenario');
if (required.some((key) => !env[key])) incomplete('provider configuration or sandbox target unavailable');
// The repository does not yet include a supported real sandbox provider E2E adapter that can be executed
// without adding provider-specific production activation code in RC-I3. Refuse rather than printing a
// success-like readiness state.
incomplete('supported real sandbox provider unavailable');
