#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { env, fail, pass } from './security-rc-j-utils.mjs';

const explicitPassFlags = ['RELEASE_GATE_PASSED', 'SECURITY_GATE_PASSED', 'MIGRATION_CHECK_PASSED'];
const evidenceReferences = ['STAGING_SMOKE_EVIDENCE', 'RC_I2_CERT_EVIDENCE', 'RC_J_ENV_EVIDENCE'];
const positiveValues = new Set(['1', 'true', 'passed', 'success', 'complete', 'completed']);
const falseLikeValues = new Set(['false', '0', 'no', 'failed', 'failure', 'missing', 'incomplete', 'unavailable', 'not_completed']);

const normalize = (value) => String(value ?? '').trim().toLowerCase();
const isExplicitPass = (value) => positiveValues.has(normalize(value));
const isValidEvidenceReference = (value) => {
  const normalized = normalize(value);
  return normalized.length > 0 && !falseLikeValues.has(normalized);
};

const missing = [];
const invalid = [];

for (const name of explicitPassFlags) {
  const value = env(name);
  if (!value) missing.push(name);
  else if (!isExplicitPass(value)) invalid.push(name);
}

for (const name of evidenceReferences) {
  const value = env(name);
  if (!value) missing.push(name);
  else if (!isValidEvidenceReference(value)) invalid.push(name);
}

if (missing.length || invalid.length) fail('deployment promotion gate failed: mandatory gate evidence missing or invalid', { missing, invalid });
if (/^(true|enabled|live|production)$/i.test(env('PROVIDER_LIVE_ACTIVATION_ENABLED'))) fail('deployment promotion gate failed: provider-live activation still blocked unless separately approved');
const docs = ['docs/deployment-runbook.md','docs/production-readiness-checklist.md','docs/final-production-status-report.md','docs/provider-live-activation-readiness.md'].map((f)=>readFileSync(f,'utf8')).join('\n');
if (/\b(deferred|postponed)\b/i.test(docs)) fail('deployment promotion gate failed: no deferred/postponed launch language allowed in RC-J docs');
pass('deployment_promotion_gates_passed', { required: [...explicitPassFlags, ...evidenceReferences] });
