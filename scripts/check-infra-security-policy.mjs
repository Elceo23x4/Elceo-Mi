#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const requiredFiles = [
  'docs/infrastructure-security-policy.md',
  'docs/deployment-runbook.md',
  'docs/production-readiness-checklist.md',
  'docs/production-secrets-and-config-checklist.md',
  'scripts/security-gate.mjs',
  '.github/workflows/ci.yml',
  'apps/web/next.config.mjs'
];

const mustMention = [
  { file: 'docs/production-readiness-checklist.md', patterns: ['hsts', 'cors', 'waf', 'backup', 'restore', 'secret rotation'] },
  { file: 'docs/deployment-runbook.md', patterns: ['infrastructure-security-policy'] }
];

const findings = [];
for (const path of requiredFiles) {
  if (!existsSync(resolve(path))) findings.push(`Missing required file: ${path}`);
}

if (existsSync(resolve('.github/workflows/ci.yml'))) {
  const ci = readFileSync(resolve('.github/workflows/ci.yml'), 'utf8');
  if (!ci.includes('contents: read')) findings.push('CI workflow must keep permissions: contents: read.');
}

if (existsSync(resolve('apps/web/next.config.mjs'))) {
  const config = readFileSync(resolve('apps/web/next.config.mjs'), 'utf8').toLowerCase();
  const requiredHeaderTokens = [
    'strict-transport-security',
    'x-content-type-options',
    'referrer-policy',
    'x-frame-options',
    'permissions-policy',
    'content-security-policy'
  ];
  for (const token of requiredHeaderTokens) {
    if (!config.includes(token)) findings.push(`Missing required header token in next config: ${token}`);
  }
}

const corsScanTargets = ['apps/web/middleware.ts', 'apps/web/lib/server/api/http.ts'];
for (const target of corsScanTargets) {
  if (!existsSync(resolve(target))) continue;
  const source = readFileSync(resolve(target), 'utf8');
  if (source.includes('Access-Control-Allow-Origin') && source.includes("'*'")) {
    findings.push(`Potential wildcard CORS detected in ${target}`);
  }
}

for (const rule of mustMention) {
  if (!existsSync(resolve(rule.file))) continue;
  const content = readFileSync(resolve(rule.file), 'utf8').toLowerCase();
  for (const pattern of rule.patterns) {
    if (!content.includes(pattern)) findings.push(`${rule.file} must mention: ${pattern}`);
  }
}

if (findings.length) {
  console.error('Infra security policy check failed:\n' + findings.map((f) => `- ${f}`).join('\n'));
  process.exit(1);
}

console.log('Infra security policy check passed.');
