#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import http from 'node:http';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for real PostgreSQL notification integration');
const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await admin.query(`
CREATE TABLE IF NOT EXISTS app_notification_targets (target_id text primary key,target_key text unique,subject_kind text not null,subject_id text not null,channel text not null,target_kind text not null,status text not null,label text,address_json jsonb not null,created_at timestamptz not null,updated_at timestamptz not null,verified_at timestamptz);
CREATE TABLE IF NOT EXISTS app_notification_decisions (decision_id text primary key,decision_key text unique,asset text,timeframe text,rule_key text,trigger_kind text,reasoning_run_id text,snapshot_id text,drift_id text,materiality_score double precision,should_notify boolean,suppression_reason text,channels_json jsonb,cooldown_until timestamptz,headline text,body text,created_at timestamptz,decision_json jsonb);
CREATE TABLE IF NOT EXISTS app_notification_outbox (outbox_id text primary key,outbox_key text unique,decision_id text,decision_key text,asset text,timeframe text,rule_key text,channel text,target_id text,subject_kind text,subject_id text,target_key text,delivery_address_json jsonb,status text,available_at timestamptz,last_attempt_at timestamptz,delivered_at timestamptz,dead_at timestamptz,attempt_count integer,last_error_code text,last_error_message text,payload_json jsonb,created_at timestamptz,updated_at timestamptz);
CREATE TABLE IF NOT EXISTS app_notification_outbox_attempts (attempt_id text primary key,outbox_id text,channel text,attempted_at timestamptz,status text,error_code text,error_message text,provider_kind text,provider_message_id text,receipt_status text,response_meta_json jsonb);
CREATE TABLE IF NOT EXISTS app_notification_provider_events (provider_event_id text primary key,provider_kind text,channel text,provider_message_id text,event_kind text,occurred_at timestamptz,target_id text,outbox_id text,attempt_id text,decision_id text,decision_key text,reason_code text,reason_message text,raw_event_json jsonb,normalized_meta_json jsonb,created_at timestamptz);
CREATE TABLE IF NOT EXISTS app_notification_delivery_receipts (receipt_id text primary key,provider_event_id text,provider_kind text,channel text,decision_id text,decision_key text,outbox_id text,attempt_id text,target_id text,subject_kind text,subject_id text,provider_message_id text,event_kind text,severity text,occurred_at timestamptz,reason_code text,reason_message text,raw_event_json jsonb,normalized_meta_json jsonb,created_at timestamptz);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_receipts_provider_event ON app_notification_delivery_receipts(provider_event_id) WHERE provider_event_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS app_notification_target_health (target_id text primary key,health_state text,last_receipt_kind text,last_receipt_at timestamptz,soft_failure_count integer default 0,hard_failure_count integer default 0,complaint_count integer default 0,unsubscribe_count integer default 0,invalid_target_count integer default 0,updated_at timestamptz);
TRUNCATE app_notification_provider_events,app_notification_delivery_receipts,app_notification_target_health,app_notification_outbox_attempts,app_notification_outbox,app_notification_decisions,app_notification_targets;
`);
await admin.query(`DROP INDEX IF EXISTS idx_notification_targets_active_push_subscription_owner; INSERT INTO app_notification_targets VALUES ('legacy-A','legacy-A-key','user','legacy-A','push','push_endpoint','active',null,'{"value":"123e4567-e89b-42d3-a456-426614174099"}','2026-01-01','2026-01-01',null),('canonical-B','canonical-B-key','user','canonical-B','push','push_endpoint','active',null,'{"subscriptionId":"123e4567-e89b-42d3-a456-426614174099"}','2026-01-02','2026-01-02',null),('historical-C','historical-C-key','user','historical-C','push','push_endpoint','disabled',null,'{"value":"123e4567-e89b-42d3-a456-426614174099"}','2025-01-01','2025-01-01',null);`);
await admin.query(await readFile(new URL('../infra/db/schema/0055_notification_provider_ownership.sql', import.meta.url), 'utf8'));
assert.deepEqual((await admin.query(`SELECT subject_id,status FROM app_notification_targets ORDER BY subject_id`)).rows, [{subject_id:'canonical-B',status:'active'},{subject_id:'historical-C',status:'disabled'},{subject_id:'legacy-A',status:'disabled'}]);
await admin.query(`TRUNCATE app_notification_provider_events,app_notification_delivery_receipts,app_notification_target_health,app_notification_outbox_attempts,app_notification_outbox,app_notification_decisions,app_notification_targets`);
await admin.query(`INSERT INTO app_notification_targets VALUES ('target-1','target-key','user','A','email','email_address','active',null,'{"email":"redacted@example.test"}',now(),now(),now()); INSERT INTO app_notification_decisions VALUES ('decision-1','decision-key','EUR/USD','H1','critical_drift','critical_drift',null,null,null,90,true,null,'[]',null,'h','b',now(),'{}'); INSERT INTO app_notification_outbox VALUES ('outbox-1','outbox-key','decision-1','decision-key','EUR/USD','H1','critical_drift','email','target-1','user','A','target-key','{}','staged',now(),null,null,null,0,null,null,'{}',now(),now()); INSERT INTO app_notification_outbox_attempts VALUES ('attempt|outbox-1|1','outbox-1','email',now(),'success',null,null,'resend','message-1','accepted','{}');`);

const require = createRequire(import.meta.url);
const persistence = require('../services/notifications/dist-test-cjs/services/notifications/src/persistence/sql-notification-repository.cjs');
const { processProviderEvent } = require('../services/notifications/dist-test-cjs/services/notifications/src/feedback/feedback-service.cjs');
const { ResendEmailDeliveryTransport, PostmarkEmailDeliveryTransport, OneSignalWebPushDeliveryTransport } = require('../services/notifications/dist-test-cjs/services/notifications/src/providers/production-transports.cjs');
const received = [];
const mock = http.createServer(async (request, response) => {
  let body=''; for await (const chunk of request) body += chunk;
  received.push({ url:request.url, method:request.method, headers:request.headers, body });
  if (request.url === '/resend-retry') { response.writeHead(429, {'content-type':'application/json'}).end('{"name":"rate_limit_exceeded"}'); return; }
  if (request.url === '/postmark-ambiguous') { request.socket.destroy(); return; }
  const payload = request.url?.startsWith('/postmark') ? { MessageID:'postmark-message' } : { id:request.url?.startsWith('/onesignal') ? 'onesignal-message' : 'resend-message' };
  response.writeHead(200, {'content-type':'application/json'}).end(JSON.stringify(payload));
});
await new Promise((resolve) => mock.listen(0,'127.0.0.1',resolve));
const localOrigin = `http://127.0.0.1:${mock.address().port}`;
const forwardingFetch = (officialUrl, path) => async (url, init) => {
  assert.equal(String(url), officialUrl);
  return fetch(`${localOrigin}${path}`, init);
};
const transportOutbox = {outboxId:'provider-outbox',outboxKey:'provider-outbox',decisionId:'decision-1',decisionKey:'decision-key',asset:'EUR/USD',timeframe:'H1',ruleKey:'critical_drift',channel:'email',targetId:'target-1',subjectKind:'user',subjectId:'A',targetKey:'target-key',deliveryAddressJson:'{}',status:'staged',availableAt:'2026-08-01T00:00:00.000Z',lastAttemptAt:null,deliveredAt:null,deadAt:null,attemptCount:0,lastErrorCode:null,lastErrorMessage:null,payloadJson:'{}',createdAt:'2026-08-01T00:00:00.000Z',updatedAt:'2026-08-01T00:00:00.000Z'};
const emailEnvelope = {channel:'email',targetId:'target-1',targetKind:'email_address',addressJson:'{"email":"sandbox@example.test"}',payload:{subject:'s',body:'b',decisionId:'decision-1',ruleKey:'critical_drift',asset:'EUR/USD',timeframe:'H1',createdAt:'2026-08-01T00:00:00.000Z'}};
const resendAccepted = await new ResendEmailDeliveryTransport('key','from@example.test',null,null,1000,forwardingFetch('https://api.resend.com/emails','/resend')).send(transportOutbox,emailEnvelope);
assert.equal(resendAccepted.providerMessageId,'resend-message');
const resendRetry = await new ResendEmailDeliveryTransport('key','from@example.test',null,null,1000,forwardingFetch('https://api.resend.com/emails','/resend-retry')).send(transportOutbox,emailEnvelope);
assert.equal(resendRetry.retryable,true);
const postmarkAccepted = await new PostmarkEmailDeliveryTransport('key','from@example.test',null,null,'outbound',1000,forwardingFetch('https://api.postmarkapp.com/email','/postmark')).send(transportOutbox,emailEnvelope);
assert.equal(postmarkAccepted.providerMessageId,'postmark-message');
const postmarkAmbiguous = await new PostmarkEmailDeliveryTransport('key','from@example.test',null,null,'outbound',1000,forwardingFetch('https://api.postmarkapp.com/email','/postmark-ambiguous')).send(transportOutbox,emailEnvelope);
assert.equal(postmarkAmbiguous.outcome,'provider_ambiguous'); assert.equal(postmarkAmbiguous.retryable,false);
const subscriptionId='123e4567-e89b-42d3-a456-426614174000';
const pushEnvelope = {channel:'push',targetId:'push-A',targetKind:'push_endpoint',addressJson:JSON.stringify({subscriptionId}),payload:{title:'t',body:'b',decisionId:'decision-1',ruleKey:'critical_drift',asset:'EUR/USD',timeframe:'H1',createdAt:'2026-08-01T00:00:00.000Z'}};
const oneSignalAccepted = await new OneSignalWebPushDeliveryTransport('app','key',1000,forwardingFetch('https://api.onesignal.com/notifications','/onesignal')).send({...transportOutbox,channel:'push'},pushEnvelope);
assert.equal(oneSignalAccepted.providerMessageId,'onesignal-message');
const oneSignalRequest = received.find((row) => row.url === '/onesignal');
assert.deepEqual(JSON.parse(oneSignalRequest.body).include_subscription_ids,[subscriptionId]);
assert.equal('included_segments' in JSON.parse(oneSignalRequest.body),false);
const repositories = { providerEventRepository:new persistence.SqlNotificationProviderEventRepository(),receiptRepository:new persistence.SqlNotificationDeliveryReceiptRepository(),targetHealthRepository:new persistence.SqlNotificationTargetHealthRepository(),targetRepository:new persistence.SqlNotificationTargetRepository(),outboxRepository:new persistence.SqlNotificationOutboxRepository(),outboxAttemptRepository:new persistence.SqlNotificationOutboxAttemptRepository(),decisionRepository:new persistence.SqlNotificationDecisionRepository() };
const transactions = new persistence.SqlNotificationFeedbackTransactionRepository();
const event = (id, status, occurredAt='2026-08-01T00:00:00.000Z') => ({ providerKind:'resend',channel:'email',rawEvent:{eventId:id,status,messageId:'message-1',occurredAt} });
const processAtomic = (input) => transactions.withTransaction(() => processProviderEvent(input, repositories));

await assert.rejects(processAtomic({ ...event('rollback-event','bounced'), testOnlyFailAfterClaim:true }), /test_only/);
assert.equal((await admin.query(`SELECT count(*)::int n FROM app_notification_provider_events WHERE provider_event_id='rollback-event'`)).rows[0].n, 0);
await processAtomic(event('rollback-event','bounced'));
assert.deepEqual((await admin.query(`SELECT (SELECT count(*)::int FROM app_notification_provider_events WHERE provider_event_id='rollback-event') events,(SELECT count(*)::int FROM app_notification_delivery_receipts WHERE provider_event_id='rollback-event') receipts`)).rows[0], { events:1, receipts:1 });

await Promise.all([processAtomic(event('same-event','bounced')),processAtomic(event('same-event','bounced'))]);
assert.equal((await admin.query(`SELECT count(*)::int n FROM app_notification_delivery_receipts WHERE provider_event_id='same-event'`)).rows[0].n, 1);
await admin.query(`TRUNCATE app_notification_provider_events,app_notification_delivery_receipts,app_notification_target_health; UPDATE app_notification_targets SET status='active' WHERE target_id='target-1'`);
await Promise.all(['bounce-1','bounce-2','bounce-3'].map((id) => processAtomic(event(id,'bounced'))));
assert.deepEqual((await admin.query(`SELECT hard_failure_count,status FROM app_notification_target_health JOIN app_notification_targets USING(target_id) WHERE target_id='target-1'`)).rows[0], { hard_failure_count:3, status:'disabled' });
await admin.query(`TRUNCATE app_notification_provider_events,app_notification_delivery_receipts,app_notification_target_health; UPDATE app_notification_targets SET status='active' WHERE target_id='target-1'`);
await Promise.all([processAtomic(event('delivered-1','delivered')),processAtomic(event('complaint-1','complained'))]);
assert.deepEqual((await admin.query(`SELECT complaint_count,status FROM app_notification_target_health JOIN app_notification_targets USING(target_id) WHERE target_id='target-1'`)).rows[0], { complaint_count:1, status:'disabled' });
await admin.query(`TRUNCATE app_notification_provider_events,app_notification_delivery_receipts,app_notification_target_health; UPDATE app_notification_targets SET status='active' WHERE target_id='target-1'`);
await processAtomic(event('chronology-t1','delivered','2026-08-01T01:00:00.000Z'));
await processAtomic(event('chronology-t2','failed','2026-08-01T02:00:00.000Z'));
let reloadedHealth = await repositories.targetHealthRepository.getTargetHealth('target-1');
assert.equal(reloadedHealth.lastReceiptAt,'2026-08-01T02:00:00.000Z'); assert.equal(reloadedHealth.lastReceiptKind,'provider_failed');
await processAtomic(event('chronology-t0','bounced','2026-08-01T00:00:00.000Z'));
await processAtomic(event('chronology-tie','delivered','2026-08-01T02:00:00.000Z'));
reloadedHealth = await repositories.targetHealthRepository.getTargetHealth('target-1');
assert.equal(reloadedHealth.lastReceiptAt,'2026-08-01T02:00:00.000Z'); assert.equal(reloadedHealth.lastReceiptKind,'provider_failed'); assert.equal(reloadedHealth.hardFailureCount,1);

const ownership = new persistence.SqlPushSubscriptionOwnershipRepository();
const X='123e4567-e89b-42d3-a456-426614174000';
const record=(owner) => ({targetId:`push-${owner}`,targetKey:`push-key-${owner}`,subjectKind:'user',subjectId:owner,channel:'push',targetKind:'push_endpoint',status:'active',label:null,addressJson:JSON.stringify({subscriptionId:X}),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),verifiedAt:new Date().toISOString()});
await admin.query(`INSERT INTO app_notification_targets VALUES ('push-A-legacy','legacy-A-X','user','A','push','push_endpoint','disabled',null,$1,'2025-01-01','2025-01-01',null),('push-A-canonical','push-key-A','user','A','push','push_endpoint','disabled',null,$2,'2025-02-01','2025-02-01',null)`, [JSON.stringify({value:X}),JSON.stringify({subscriptionId:X})]);
await ownership.bind(record('A')); await ownership.bind(record('A')); await ownership.bind(record('B'));
assert.equal((await admin.query(`SELECT count(*)::int n FROM app_notification_targets WHERE channel='push' AND subject_id='A'`)).rows[0].n,2);
assert.equal((await admin.query(`SELECT count(*)::int n FROM app_notification_targets WHERE channel='push' AND status='active'`)).rows[0].n,1);
assert.equal((await admin.query(`SELECT target_id FROM app_notification_targets WHERE channel='push' AND subject_id='A' AND address_json ? 'subscriptionId'`)).rows[0].target_id,'push-A-canonical');
assert.equal(await ownership.unbind('user','A',X,new Date().toISOString()),false);
assert.equal((await admin.query(`SELECT status FROM app_notification_targets WHERE target_id='push-B'`)).rows[0].status,'active');
await admin.query(`UPDATE app_notification_targets SET status='disabled' WHERE channel='push'`);
await Promise.allSettled([ownership.bind(record('A')),ownership.bind(record('B'))]);
assert.equal((await admin.query(`SELECT count(*)::int n FROM app_notification_targets WHERE channel='push' AND status='active'`)).rows[0].n,1);

console.log(JSON.stringify({acceptance:'rc-i3-notification-provider-integration',postgres:true,rollback:true,sameEvent:true,sameTargetDistinctEvents:true,ownershipTransfer:true,ownerScopedUnbind:true,externalNetworkCalls:0}));
await new Promise((resolve) => mock.close(resolve));
await admin.end();
