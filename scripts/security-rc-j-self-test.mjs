#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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
run('staging/prod URL equality rejected','scripts/verify-staging-isolation.mjs',{STAGING_BASE_URL:'https://prod.example.com',PRODUCTION_BASE_URL:'https://prod.example.com',STAGING_DATABASE_URL:'postgres://staging',DATABASE_URL:'postgres://prod',DEPLOYMENT_TARGET_ENV:'staging'},1,'staging URL cannot point to production URL');
run('staging/prod DB equality rejected','scripts/verify-staging-isolation.mjs',{STAGING_BASE_URL:'https://staging.example.com',PRODUCTION_BASE_URL:'https://prod.example.com',STAGING_DATABASE_URL:'postgres://same',DATABASE_URL:'postgres://same',DEPLOYMENT_TARGET_ENV:'staging'},1,'staging database URL cannot equal production database URL');
run('production provider live flags rejected','scripts/verify-staging-isolation.mjs',{STAGING_BASE_URL:'https://staging.example.com',PRODUCTION_BASE_URL:'https://prod.example.com',STAGING_DATABASE_URL:'postgres://staging',DATABASE_URL:'postgres://prod',DEPLOYMENT_TARGET_ENV:'staging',STAGING_PAYMENT_PROVIDER_MODE:'live'},1,'staging payment/provider modes cannot be production-live');
run('attack drill refuses without staging URL','scripts/attack-drill-staging.mjs',{},1,'attack drill execution not completed: staging URL unavailable');
run('attack drill simulation labeled','scripts/attack-drill-staging.mjs',{ATTACK_DRILL_SIMULATION:'true'},0,'attack_drill_simulation_passed');
run('monitoring refuses without staging URL','scripts/monitoring-alert-smoke.mjs',{},1,'monitoring alert execution not completed: staging URL unavailable');
run('backup refuses missing DB','scripts/rehearse-backup-restore.mjs',{},1,'backup restore execution not completed: database URL unavailable');
run('backup refuses missing target','scripts/rehearse-backup-restore.mjs',{STAGING_DATABASE_URL:'postgres://staging'},1,'backup restore execution not completed: backup target unavailable');
run('backup refuses production DB','scripts/rehearse-backup-restore.mjs',{STAGING_DATABASE_URL:'postgres://production-db',BACKUP_TARGET_PATH:'/tmp/backup'},1,'production database requires');
run('rollback refuses missing target','scripts/rehearse-rollback.mjs',{},1,'rollback execution not completed: deployment target unavailable');
run('deployment gate requires release/security/staging/RC-I2 evidence','scripts/verify-deployment-promotion-gates.mjs',{},1,'mandatory gate evidence missing');
run('deployment gate blocks provider live activation','scripts/verify-deployment-promotion-gates.mjs',{RELEASE_GATE_PASSED:'1',SECURITY_GATE_PASSED:'1',MIGRATION_CHECK_PASSED:'1',STAGING_SMOKE_EVIDENCE:'1',RC_I2_CERT_EVIDENCE:'1',PROVIDER_LIVE_ACTIVATION_ENABLED:'live'},1,'provider-live activation still blocked');
if (redact('postgres://user:password@production-db/db token=abc sk_live_123') !== 'postgres://[REDACTED] token=[REDACTED] sk_live_[REDACTED]') { console.error('FAIL scripts redact secrets in summaries'); process.exit(1); }
console.log('PASS scripts redact secrets in summaries');
const docs = ['docs/deployment-runbook.md','docs/observability-security-final-review-checklist.md','docs/backend-open-loop-register.md','docs/final-production-status-report.md','docs/production-readiness-checklist.md','docs/provider-live-activation-readiness.md','docs/notification-reliability-runbook.md'].map((f)=>readFileSync(f,'utf8')).join('\n');
if (/\b(deferred|postponed)\b/i.test(docs)) { console.error('FAIL docs contain prohibited launch language'); process.exit(1); }
console.log('PASS docs contain no deferred/postponed launch language');
