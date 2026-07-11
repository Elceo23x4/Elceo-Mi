#!/usr/bin/env node
const env = process.env;
const incomplete = (message) => { console.log(`notification sandbox execution not completed: ${message}`); process.exit(0); };
if (env.ELCEO_NOTIFICATION_SANDBOX_SMOKE !== '1') incomplete('explicit opt-in unavailable');
if (env.NOTIFICATION_PROVIDER_MODE === 'production_provider' || env.NOTIFICATION_PROVIDER_MODE === 'production_provider_blocked') throw new Error('production_notification_provider_blocked');
if (env.NOTIFICATION_PROVIDER_MODE !== 'sandbox_provider') incomplete('explicit sandbox provider mode unavailable');
if (env.APP_STATE_REPOSITORY !== 'sql') incomplete('SQL durability unavailable');
if (!env.DATABASE_URL) incomplete('SQL durability unavailable');
if (!env.NOTIFICATION_PROVIDER_KIND) incomplete('provider sandbox credentials unavailable');
const requiredByProvider = {
  http_email: ['NOTIFICATION_HTTP_EMAIL_ENDPOINT', 'NOTIFICATION_HTTP_EMAIL_API_KEY', 'NOTIFICATION_EMAIL_FROM_ADDRESS'],
  smtp_email: ['NOTIFICATION_SMTP_HOST', 'NOTIFICATION_SMTP_USER', 'NOTIFICATION_SMTP_PASSWORD', 'NOTIFICATION_EMAIL_FROM_ADDRESS'],
  web_push: ['NOTIFICATION_WEB_PUSH_ENDPOINT', 'NOTIFICATION_WEB_PUSH_API_KEY']
};
const required = requiredByProvider[env.NOTIFICATION_PROVIDER_KIND] ?? [];
if (required.length === 0) incomplete('provider sandbox credentials unavailable');
if (required.some((key) => !env[key])) incomplete('provider sandbox credentials unavailable');
// The repository does not yet include a supported real sandbox provider E2E adapter that can be executed
// without adding provider-specific production activation code in RC-I3. Refuse rather than printing a
// success-like readiness state.
incomplete('supported real sandbox provider unavailable');
