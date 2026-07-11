#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { env, fail, pass } from './security-rc-j-utils.mjs';
const required = ['RELEASE_GATE_PASSED','SECURITY_GATE_PASSED','MIGRATION_CHECK_PASSED','STAGING_SMOKE_EVIDENCE','RC_I2_CERT_EVIDENCE'];
const missing = required.filter((name) => !env(name));
if (missing.length) fail('deployment promotion gate failed: mandatory gate evidence missing', { missing });
if (/^(true|enabled|live|production)$/i.test(env('PROVIDER_LIVE_ACTIVATION_ENABLED'))) fail('deployment promotion gate failed: provider-live activation still blocked unless separately approved');
const docs = ['docs/deployment-runbook.md','docs/production-readiness-checklist.md','docs/final-production-status-report.md','docs/provider-live-activation-readiness.md'].map((f)=>readFileSync(f,'utf8')).join('\n');
if (/\b(deferred|postponed)\b/i.test(docs)) fail('deployment promotion gate failed: no deferred/postponed launch language allowed in RC-J docs');
pass('deployment_promotion_gates_passed', { required });
