#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

const requiredDocs = [
  'docs/c5-market-evidence-backend-readiness-report.md',
  'docs/final-production-status-report.md',
  'docs/production-readiness-checklist.md',
  'docs/deployment-runbook.md',
  'docs/provider-live-activation-readiness.md',
  'docs/scheduled-market-evidence-ingestion.md'
];

const requiredMigrations = [
  'infra/db/schema/0032_market_evidence_and_seo_snapshots.sql',
  'infra/db/schema/0033_market_evidence_ingestion.sql',
  'infra/db/schema/0034_market_evidence_scheduled_ingestion_runs.sql'
];

const requiredDirectories = [
  'services/reasoning/src/provider-sources/tiingo',
  'services/reasoning/src/provider-sources/cot',
  'services/reasoning/src/provider-sources/central-bank',
  'services/reasoning/src/provider-sources/treasury',
  'services/reasoning/src/provider-sources/stress-conditions',
  'services/reasoning/src/provider-sources/risk-market-structure',
  'services/reasoning/src/provider-sources/macro-calendar',
  'services/reasoning/src/provider-sources/macro-indicators',
  'services/reasoning/src/provider-sources/bank-reports',
  'services/reasoning/src/provider-sources/regulatory-liquidity',
  'services/reasoning/src/provider-sources/commodities-metals',
  'services/reasoning/src/provider-sources/crypto-earnings-geopolitical',
  'services/reasoning/src/evidence-quality',
  'services/reasoning/src/reasoning-input',
  'services/reasoning/src/evidence-weighting',
  'services/reasoning/src/market-cognition',
  'services/reasoning/src/seo-feed',
  'services/reasoning/src/scheduled-ingestion',
  'services/reasoning/src/provider-live-readiness',
  'services/reasoning/src/coverage-audit',
  'apps/web/app/api/admin/market-evidence'
];

const requiredScripts = ['release:gate', 'check:migrations', 'smoke:production'];

function missing(paths) {
  return paths.filter((filePath) => !existsSync(resolve(root, filePath)));
}

const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const missingScripts = requiredScripts.filter((name) => !packageJson.scripts?.[name]);

const missingDocs = missing(requiredDocs);
const missingMigrationFiles = missing(requiredMigrations);
const missingDirs = missing(requiredDirectories);

const issues = [
  ...missingDocs.map((entry) => `Missing required doc: ${entry}`),
  ...missingMigrationFiles.map((entry) => `Missing required migration: ${entry}`),
  ...missingDirs.map((entry) => `Missing required directory: ${entry}`),
  ...missingScripts.map((entry) => `Missing required package script: ${entry}`)
];

if (issues.length > 0) {
  console.error('C5 readiness check failed.');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('C5 readiness check passed.');
console.log(`Verified docs: ${requiredDocs.length}`);
console.log(`Verified migrations: ${requiredMigrations.length}`);
console.log(`Verified directories: ${requiredDirectories.length}`);
console.log(`Verified scripts: ${requiredScripts.length}`);
