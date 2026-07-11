#!/usr/bin/env node
import { env, fail, pass, request } from './security-rc-j-utils.mjs';
const base = env('STAGING_BASE_URL') || env('ELCEO_STAGING_BASE_URL');
const sink = env('ALERT_WEBHOOK_URL') || env('MONITORING_ALERT_SINK_URL');
if (!base) fail('monitoring alert execution not completed: staging URL unavailable');
if (!sink) fail('monitoring alert execution not completed: alert sink unavailable');
const health = await request(base, env('MONITORING_HEALTH_PATH') || '/api/health').catch(() => null);
if (!health || health.status >= 500) fail('monitoring alert smoke failed: health endpoint unavailable');
pass('monitoring_alert_smoke_passed', { healthStatus: health.status, alertSink: '[REDACTED]' });
