#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import pg from 'pg';
import http from 'node:http';

const schemaDirectory = new URL('../infra/db/schema/', import.meta.url);
const migration0055 = '0055_notification_provider_ownership.sql';

function databaseUrlFor(baseUrl, database) {
  const url = new URL(baseUrl);
  url.pathname = `/${database}`;
  return url.toString();
}

async function applyCanonicalPre0055(pool) {
  const filenames = (await readdir(schemaDirectory)).filter((name) => /^\d{4}_.+\.sql$/.test(name) && name < migration0055).sort();
  for (const filename of filenames) await pool.query(await readFile(new URL(filename, schemaDirectory), 'utf8'));
  return filenames;
}

async function runChild(databaseUrl, mode) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [new URL(import.meta.url).pathname, '--database-url', databaseUrl, '--mode', mode], {
      env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: 'inherit'
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`notification integration ${mode} failed (${signal ?? code})`)));
  });
}

async function orchestrate() {
  const sourceUrl = process.env.DATABASE_URL;
  if (!sourceUrl) throw new Error('DATABASE_URL is required for real PostgreSQL notification integration');
  const administrativeUrl = databaseUrlFor(sourceUrl, 'postgres');
  const administrator = new pg.Pool({ connectionString: administrativeUrl });
  const suffix = `${process.pid}_${Date.now()}`;
  const databases = { fresh: `elceo_rc_i3_fresh_${suffix}`, premigrated: `elceo_rc_i3_premigrated_${suffix}` };
  try {
    for (const database of Object.values(databases)) await administrator.query(`CREATE DATABASE ${database}`);
    await runChild(databaseUrlFor(sourceUrl, databases.fresh), 'fresh');
    const premigratedPool = new pg.Pool({ connectionString: databaseUrlFor(sourceUrl, databases.premigrated) });
    try { await applyCanonicalPre0055(premigratedPool); } finally { await premigratedPool.end(); }
    await runChild(databaseUrlFor(sourceUrl, databases.premigrated), 'premigrated');
    console.log(JSON.stringify({ acceptance:'rc-i3-notification-provider-integration', freshCanonical:true, premigratedCanonical:true, postgres:true, rollback:true, sameEvent:true, sameTargetDistinctEvents:true, ownershipTransfer:true, ownerScopedUnbind:true, externalNetworkCalls:0 }));
  } finally {
    for (const database of Object.values(databases)) {
      await administrator.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid <> pg_backend_pid()`, [database]);
      await administrator.query(`DROP DATABASE IF EXISTS ${database}`);
    }
    await administrator.end();
  }
}

async function runAcceptance(mode) {
  const databaseUrl = process.env.DATABASE_URL;
  const admin = new pg.Pool({ connectionString: databaseUrl });
  let mock;
  try {
    if (mode === 'fresh') await applyCanonicalPre0055(admin);
    const columns = await admin.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='app_notification_targets' ORDER BY ordinal_position`);
    assert.deepEqual(columns.rows.map((row) => row.column_name), ['target_id','subject_kind','subject_id','channel','target_kind','status','label','address_json','created_at','updated_at','verified_at','target_key']);
    await admin.query(`DROP INDEX IF EXISTS idx_notification_targets_active_push_subscription_owner`);
    await admin.query(`INSERT INTO app_notification_targets (target_id,target_key,subject_kind,subject_id,channel,target_kind,status,label,address_json,created_at,updated_at,verified_at) VALUES
      ('legacy-A','legacy-A-key','user','legacy-A','push','push_endpoint','active',null,'{"value":"123e4567-e89b-42d3-a456-426614174099"}','2026-01-01','2026-01-01',null),
      ('canonical-B','canonical-B-key','user','canonical-B','push','push_endpoint','active',null,'{"subscriptionId":"123e4567-e89b-42d3-a456-426614174099"}','2026-01-02','2026-01-02',null),
      ('historical-C','historical-C-key','user','historical-C','push','push_endpoint','disabled',null,'{"value":"123e4567-e89b-42d3-a456-426614174099"}','2025-01-01','2025-01-01',null)`);
    await admin.query(await readFile(new URL(`../infra/db/schema/${migration0055}`, import.meta.url), 'utf8'));
    assert.deepEqual((await admin.query(`SELECT subject_id,status FROM app_notification_targets ORDER BY subject_id`)).rows, [{subject_id:'canonical-B',status:'active'},{subject_id:'historical-C',status:'disabled'},{subject_id:'legacy-A',status:'disabled'}]);
    await admin.query(`TRUNCATE app_notification_provider_events,app_notification_delivery_receipts,app_notification_target_health,app_notification_outbox_attempts,app_notification_outbox,app_notification_decisions,app_notification_targets`);
    await admin.query(`INSERT INTO app_notification_targets (target_id,target_key,subject_kind,subject_id,channel,target_kind,status,label,address_json,created_at,updated_at,verified_at) VALUES ('target-1','target-key','user','A','email','email_address','active',null,'{"email":"redacted@example.test"}',now(),now(),now());
      INSERT INTO app_notification_decisions (decision_id,decision_key,asset,timeframe,rule_key,trigger_kind,reasoning_run_id,snapshot_id,drift_id,materiality_score,should_notify,suppression_reason,channels_json,cooldown_until,headline,body,created_at,decision_json) VALUES ('decision-1','decision-key','EUR/USD','H1','critical_drift','critical_drift',null,null,null,90,true,null,'[]',null,'h','b',now(),'{}');
      INSERT INTO app_notification_outbox (outbox_id,outbox_key,decision_id,decision_key,asset,timeframe,rule_key,channel,target_id,subject_kind,subject_id,target_key,delivery_address_json,status,available_at,last_attempt_at,delivered_at,dead_at,attempt_count,last_error_code,last_error_message,payload_json,created_at,updated_at) VALUES ('outbox-1','outbox-key','decision-1','decision-key','EUR/USD','H1','critical_drift','email','target-1','user','A','target-key','{}','staged',now(),null,null,null,0,null,null,'{}',now(),now());
      INSERT INTO app_notification_outbox_attempts (attempt_id,outbox_id,channel,attempted_at,status,error_code,error_message,provider_kind,provider_message_id,receipt_status,response_meta_json) VALUES ('attempt|outbox-1|1','outbox-1','email',now(),'success',null,null,'resend','message-1','accepted','{}')`);
    const require = createRequire(import.meta.url);
    const persistence = require('../services/notifications/dist-test-cjs/services/notifications/src/persistence/sql-notification-repository.cjs');
    const { processProviderEvent } = require('../services/notifications/dist-test-cjs/services/notifications/src/feedback/feedback-service.cjs');
    const { ResendEmailDeliveryTransport, PostmarkEmailDeliveryTransport, OneSignalWebPushDeliveryTransport } = require('../services/notifications/dist-test-cjs/services/notifications/src/providers/production-transports.cjs');
    const received = [];
    mock = http.createServer(async (request, response) => {
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
    await admin.query(`INSERT INTO app_notification_targets (target_id,target_key,subject_kind,subject_id,channel,target_kind,status,label,address_json,created_at,updated_at,verified_at) VALUES ('push-A-legacy','legacy-A-X','user','A','push','push_endpoint','disabled',null,$1,'2025-01-01','2025-01-01',null),('push-A-canonical','push-key-A','user','A','push','push_endpoint','disabled',null,$2,'2025-02-01','2025-02-01',null)`, [JSON.stringify({value:X}),JSON.stringify({subscriptionId:X})]);
    await ownership.bind(record('A')); await ownership.bind(record('A')); await ownership.bind(record('B'));
    assert.equal((await admin.query(`SELECT count(*)::int n FROM app_notification_targets WHERE channel='push' AND subject_id='A'`)).rows[0].n,2);
    assert.equal((await admin.query(`SELECT count(*)::int n FROM app_notification_targets WHERE channel='push' AND status='active'`)).rows[0].n,1);
    assert.equal((await admin.query(`SELECT target_id FROM app_notification_targets WHERE channel='push' AND subject_id='A' AND address_json ? 'subscriptionId'`)).rows[0].target_id,'push-A-canonical');
    assert.equal(await ownership.unbind('user','A',X,new Date().toISOString()),false);
    assert.equal((await admin.query(`SELECT status FROM app_notification_targets WHERE target_id='push-B'`)).rows[0].status,'active');
    await admin.query(`UPDATE app_notification_targets SET status='disabled' WHERE channel='push'`);
    await Promise.allSettled([ownership.bind(record('A')),ownership.bind(record('B'))]);
    assert.equal((await admin.query(`SELECT count(*)::int n FROM app_notification_targets WHERE channel='push' AND status='active'`)).rows[0].n,1);

    console.log(JSON.stringify({ acceptance:'rc-i3-notification-provider-mode', mode, canonicalMigrations:true, migration0055:true, rollback:true, sameEvent:true, sameTargetDistinctEvents:true, chronology:true, targetDisable:true, ownershipTransfer:true, simultaneousBind:true, ownerScopedUnbind:true, providerHttp:true, externalNetworkCalls:0 }));
  } finally {
    if (mock?.listening) await new Promise((resolve) => mock.close(resolve));
    const require = createRequire(import.meta.url);
    try {
      const persistence = require('../services/notifications/dist-test-cjs/services/notifications/src/persistence/sql-notification-repository.cjs');
      await persistence.__closeSqlNotificationPoolForTests?.();
    } finally {
      await admin.end();
    }
  }
}

const childDatabaseIndex = process.argv.indexOf('--database-url');
if (childDatabaseIndex === -1) await orchestrate();
else await runAcceptance(process.argv[process.argv.indexOf('--mode') + 1]);
