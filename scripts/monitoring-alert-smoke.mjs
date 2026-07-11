#!/usr/bin/env node
import { env, fail, pass, request } from './security-rc-j-utils.mjs';

const base = env('STAGING_BASE_URL') || env('ELCEO_STAGING_BASE_URL');
const syntheticPath = env('MONITORING_SYNTHETIC_ALERT_PATH');
const webhook = env('ALERT_WEBHOOK_URL') || env('MONITORING_ALERT_SINK_URL');
const simulate = env('MONITORING_ALERT_SIMULATION') === 'true';
const acceptedStatuses = new Set([200, 201, 202, 204]);

if (simulate) {
  pass('monitoring_alert_simulation_passed', { mode: 'simulation', payload: '[REDACTED]' });
  process.exit(0);
}

async function triggerSyntheticAlert() {
  if (!base) fail('monitoring alert execution not completed: staging URL unavailable');
  if (!syntheticPath) fail('monitoring alert execution not completed: synthetic alert path unavailable');
  const response = await request(base, syntheticPath, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ drill: 'rc-j-monitoring-alert-smoke', token: '[REDACTED]' }),
  }).catch(() => null);
  if (!response || !acceptedStatuses.has(response.status)) fail('monitoring alert execution not completed: synthetic alert path unavailable');
  return { kind: 'staging_synthetic_alert', status: response.status };
}

async function triggerWebhook() {
  if (!webhook) fail('monitoring alert execution not completed: alert sink unavailable');
  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ drill: 'rc-j-monitoring-alert-smoke', severity: 'test', secret: '[REDACTED]' }),
  }).catch(() => null);
  if (!response || !acceptedStatuses.has(response.status)) fail('monitoring alert execution not completed: alert sink unavailable');
  return { kind: 'alert_webhook', status: response.status };
}

const proof = syntheticPath ? await triggerSyntheticAlert() : await triggerWebhook();
pass('monitoring_alert_smoke_passed', { proof: proof.kind, status: proof.status, payload: '[REDACTED]' });
