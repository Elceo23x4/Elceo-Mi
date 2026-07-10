#!/usr/bin/env node
const env = process.env;
if (env.ELCEO_NOTIFICATION_SANDBOX_SMOKE !== '1') {
  console.log('notification sandbox execution not completed: explicit opt-in unavailable');
  process.exit(0);
}
if (env.NOTIFICATION_PROVIDER_MODE === 'production_provider' || env.NOTIFICATION_PROVIDER_MODE === 'production_provider_blocked') {
  throw new Error('production_notification_provider_blocked');
}
if (!env.NOTIFICATION_PROVIDER_KIND) {
  console.log('notification sandbox execution not completed: provider sandbox credentials unavailable');
  process.exit(0);
}
const requiredByProvider = {
  http_email: ['NOTIFICATION_HTTP_EMAIL_ENDPOINT', 'NOTIFICATION_HTTP_EMAIL_API_KEY', 'NOTIFICATION_EMAIL_FROM_ADDRESS'],
  smtp_email: ['NOTIFICATION_SMTP_HOST', 'NOTIFICATION_SMTP_USER', 'NOTIFICATION_SMTP_PASSWORD', 'NOTIFICATION_EMAIL_FROM_ADDRESS'],
  web_push: ['NOTIFICATION_WEB_PUSH_ENDPOINT', 'NOTIFICATION_WEB_PUSH_API_KEY']
};
const required = requiredByProvider[env.NOTIFICATION_PROVIDER_KIND] ?? [];
if (required.length === 0 || required.some((key) => !env[key])) {
  console.log('notification sandbox execution not completed: provider sandbox credentials unavailable');
  process.exit(0);
}
if (env.APP_STATE_REPOSITORY === 'sql' && !env.DATABASE_URL) {
  console.log('notification sandbox execution not completed: provider sandbox credentials unavailable');
  process.exit(0);
}
console.log(JSON.stringify({ status: 'ready', providerKind: env.NOTIFICATION_PROVIDER_KIND, outbox: 'durable-required', secrets: 'redacted' }));
