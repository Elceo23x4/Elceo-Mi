#!/usr/bin/env node
import { mkdtempSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { redact } from './security-rc-j-utils.mjs';

const node = process.execPath;
function run(name, script, env, wantCode, mustInclude) {
  const res = spawnSync(node, [script], { env: { PATH: process.env.PATH, ...env }, encoding: 'utf8' });
  const out = `${res.stdout}\n${res.stderr}`;
  if (res.status !== wantCode || !out.includes(mustInclude)) {
    console.error(`FAIL ${name}: code=${res.status} expected=${wantCode}; missing=${mustInclude}\n${out}`); process.exit(1);
  }
  console.log(`PASS ${name}`);
}

const backupDir = mkdtempSync(join(tmpdir(), 'rc-j-backup-'));
const schemaPath = join(backupDir, 'schema.json');
writeFileSync(schemaPath, JSON.stringify({ tables: ['elceo_migration_rehearsal_ledger'] }));
const emptySchemaPath = join(backupDir, 'empty-schema.json');
writeFileSync(emptySchemaPath, JSON.stringify({ tables: [] }));

run('staging/prod URL equality rejected','scripts/verify-staging-isolation.mjs',{STAGING_BASE_URL:'https://prod.example.com',PRODUCTION_BASE_URL:'https://prod.example.com',STAGING_DATABASE_URL:'postgres://staging',DATABASE_URL:'postgres://prod',DEPLOYMENT_TARGET_ENV:'staging'},1,'staging URL cannot point to production URL');
run('staging/prod DB equality rejected','scripts/verify-staging-isolation.mjs',{STAGING_BASE_URL:'https://staging.example.com',PRODUCTION_BASE_URL:'https://prod.example.com',STAGING_DATABASE_URL:'postgres://same',DATABASE_URL:'postgres://same',DEPLOYMENT_TARGET_ENV:'staging'},1,'staging database URL cannot equal production database URL');
run('production provider live flags rejected','scripts/verify-staging-isolation.mjs',{STAGING_BASE_URL:'https://staging.example.com',PRODUCTION_BASE_URL:'https://prod.example.com',STAGING_DATABASE_URL:'postgres://staging',DATABASE_URL:'postgres://prod',DEPLOYMENT_TARGET_ENV:'staging',STAGING_PAYMENT_PROVIDER_MODE:'live'},1,'staging payment/provider modes cannot be production-live');
run('attack drill refuses without staging URL','scripts/attack-drill-staging.mjs',{},1,'attack drill execution not completed: staging URL unavailable');
run('attack drill simulation labeled','scripts/attack-drill-staging.mjs',{ATTACK_DRILL_SIMULATION:'true'},0,'attack_drill_simulation_passed');
run('monitoring refuses without proof path','scripts/monitoring-alert-smoke.mjs',{},1,'monitoring alert execution not completed: alert sink unavailable');
run('monitoring does not pass from sink presence alone','scripts/monitoring-alert-smoke.mjs',{MONITORING_ALERT_SINK_URL:'http://127.0.0.1:9/alert'},1,'monitoring alert execution not completed: alert sink unavailable');
run('monitoring simulation labeled','scripts/monitoring-alert-smoke.mjs',{MONITORING_ALERT_SIMULATION:'true'},0,'monitoring_alert_simulation_passed');
run('backup refuses missing DB','scripts/rehearse-backup-restore.mjs',{},1,'backup restore execution not completed: database URL unavailable');
run('backup refuses missing target','scripts/rehearse-backup-restore.mjs',{RESTORE_REHEARSAL_DATABASE_URL:`file://${schemaPath}`},1,'backup restore execution not completed: backup target unavailable');
run('backup does not pass from env presence alone','scripts/rehearse-backup-restore.mjs',{RESTORE_REHEARSAL_DATABASE_URL:`file://${emptySchemaPath}`,BACKUP_TARGET_PATH:backupDir},1,'restore rehearsal database unavailable');
run('backup refuses production DB','scripts/rehearse-backup-restore.mjs',{RESTORE_REHEARSAL_DATABASE_URL:'postgres://production-db/rcj',BACKUP_TARGET_PATH:backupDir},1,'production database requires');
run('backup passes with local disposable manifest/schema proof','scripts/rehearse-backup-restore.mjs',{RESTORE_REHEARSAL_DATABASE_URL:`file://${schemaPath}`,BACKUP_TARGET_PATH:backupDir},0,'backup_restore_rehearsal_passed');
run('rollback refuses missing target','scripts/rehearse-rollback.mjs',{},1,'rollback execution not completed: deployment target unavailable');
run('rollback does not pass from env presence alone','scripts/rehearse-rollback.mjs',{ROLLBACK_DEPLOYMENT_TARGET:'staging'},1,'post-rollback smoke unavailable');
run('rollback executes command before passing','scripts/rehearse-rollback.mjs',{ROLLBACK_DEPLOYMENT_TARGET:'staging',ROLLBACK_SMOKE_COMMAND:JSON.stringify([node,'-e','process.exit(0)'])},0,'rollback_rehearsal_passed');
run('deployment gate requires release/security/staging/RC-I2 evidence','scripts/verify-deployment-promotion-gates.mjs',{},1,'mandatory gate evidence missing');
run('deployment gate blocks provider live activation','scripts/verify-deployment-promotion-gates.mjs',{RELEASE_GATE_PASSED:'1',SECURITY_GATE_PASSED:'1',MIGRATION_CHECK_PASSED:'1',STAGING_SMOKE_EVIDENCE:'1',RC_I2_CERT_EVIDENCE:'1',PROVIDER_LIVE_ACTIVATION_ENABLED:'live'},1,'provider-live activation still blocked');
const redactionSample = `postgres://rcj-host/db token=abc sk_${'live'}_SAMPLE`;
if (redact(redactionSample) !== 'postgres://[REDACTED] token=[REDACTED] sk_live_[REDACTED]') { console.error('FAIL scripts redact secrets in summaries'); process.exit(1); }
console.log('PASS scripts redact secrets in summaries');
const docs = ['docs/deployment-runbook.md','docs/observability-security-final-review-checklist.md','docs/backend-open-loop-register.md','docs/final-production-status-report.md','docs/production-readiness-checklist.md','docs/provider-live-activation-readiness.md','docs/notification-reliability-runbook.md'].map((f)=>readFileSync(f,'utf8')).join('\n');
if (/\b(deferred|postponed)\b/i.test(docs)) { console.error('FAIL docs contain prohibited launch language'); process.exit(1); }
console.log('PASS docs contain no deferred/postponed launch language');
