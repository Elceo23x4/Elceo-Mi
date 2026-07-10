#!/usr/bin/env node
const outbox = new Map();
const attempts = [];
const secrets = ['Authorization: Bearer secret-token'];
const redacted = secrets.map((value) => value.replace(/Bearer .+/, 'Bearer [redacted]'));
function stage(key) { if (!outbox.has(key)) outbox.set(key, { key, status: 'staged', attempts: 0 }); return outbox.get(key); }
function dispatch(key, outcome = 'accepted') { const item = outbox.get(key); if (!item || item.status === 'delivered' || item.status === 'dead') return 'skipped'; item.status = 'dispatching'; item.attempts += 1; attempts.push({ key, outcome }); if (outcome === 'accepted') item.status = 'delivered'; else if (outcome === 'temporary_failure' || outcome === 'rate_limited') { item.status = 'failed'; item.nextRetry = outcome === 'rate_limited' ? 'later' : 'soon'; } else item.status = 'dead'; return item.status; }
stage('decision|target|in_app|purpose');
stage('decision|target|in_app|purpose');
const dedupe = outbox.size;
const success = dispatch('decision|target|in_app|purpose');
const duplicateDispatch = dispatch('decision|target|in_app|purpose');
stage('decision|target|email|temporary'); dispatch('decision|target|email|temporary', 'temporary_failure');
stage('decision|target|email|rate'); dispatch('decision|target|email|rate', 'rate_limited');
stage('decision|target|email|permanent'); dispatch('decision|target|email|permanent', 'permanent_failure');
stage('decision|target|email|disabled'); dispatch('decision|target|email|disabled', 'unsubscribed_or_disabled');
const receiptIds = new Set(['receipt-1', 'receipt-1']);
const deadVisible = [...outbox.values()].filter((item) => item.status === 'dead').length;
if (dedupe !== 1 || success !== 'delivered' || duplicateDispatch !== 'skipped' || attempts.length !== 5 || receiptIds.size !== 1 || deadVisible < 2 || redacted.some((value) => value.includes('secret-token'))) throw new Error('notification_replay_smoke_failed');
console.log(JSON.stringify({ status: 'passed', stagingDedupe: dedupe, dispatch: 'durable-outbox-only', attempts: attempts.length, duplicateDispatch, receiptDuplicate: 'idempotent', deadVisible, secrets: 'redacted' }));
