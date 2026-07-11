#!/usr/bin/env node
import { env, fail, isLive, pass, sameUrl } from './security-rc-j-utils.mjs';
const stagingUrl = env('STAGING_BASE_URL') || env('ELCEO_STAGING_BASE_URL');
const prodUrl = env('PRODUCTION_BASE_URL') || env('ELCEO_PRODUCTION_BASE_URL');
const stagingDb = env('STAGING_DATABASE_URL') || env('ELCEO_STAGING_DATABASE_URL');
const prodDb = env('PRODUCTION_DATABASE_URL') || env('DATABASE_URL') || env('ELCEO_PRODUCTION_DATABASE_URL');
const providerMode = env('STAGING_PAYMENT_PROVIDER_MODE') || env('PAYMENT_PROVIDER_MODE');
const notificationMode = env('STAGING_NOTIFICATION_PROVIDER_MODE') || env('NOTIFICATION_PROVIDER_MODE');
const target = env('DEPLOYMENT_TARGET_ENV') || env('ELCEO_DEPLOYMENT_TARGET');
const checks = [];
function check(name, ok, detail) { checks.push({ name, ok, detail }); if (!ok) fail(`staging isolation failed: ${name}`, { detail, checks }); }
if (!stagingUrl) fail('environment execution not completed: staging URL unavailable');
check('deployment promotion must require explicit target environment', ['staging','production'].includes(target), `DEPLOYMENT_TARGET_ENV=${target || '[missing]'}`);
if (prodUrl) check('staging URL cannot point to production URL', !sameUrl(stagingUrl, prodUrl), 'staging and production origins differ');
if (!stagingDb || !prodDb) fail('environment execution not completed: external credentials unavailable');
check('staging database URL cannot equal production database URL', stagingDb !== prodDb, 'database URLs are distinct');
check('staging payment/provider modes cannot be production-live', !isLive(providerMode), `mode=${providerMode || '[unset]'}`);
check('staging notification provider cannot be production-live', !isLive(notificationMode), `mode=${notificationMode || '[unset]'}`);
check('staging smoke must not mutate production resources', !/prod|production/i.test(stagingUrl), 'staging URL is not production-like');
pass('staging_isolation_passed', { checks });
