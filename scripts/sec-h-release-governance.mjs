#!/usr/bin/env node

import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  assertCleanWorkingTree,
  assertExpectedHead,
  changedFiles,
  criticalFileHashes,
  fetchLiveGovernance,
  fileSha256,
  getGitContext,
  manifestCoreHash,
  migrationInventory,
  readJson,
  trackedTreeFingerprint,
  validateChangedMigrationRisk,
  validateCiWorkflow,
  validatePackageRuntime,
} from './lib/sec-h-release-governance.mjs';

const policyPath = '.github/sec-h-release-governance.json';
const policy = readJson(policyPath);
const packageJson = readJson('package.json');
const gitContext = getGitContext();
const expectedHead = process.env.SEC_H_HEAD_SHA ?? null;

assertExpectedHead(gitContext, expectedHead);
assertCleanWorkingTree();
validatePackageRuntime(packageJson, policy);
validateCiWorkflow(await import('node:fs').then(({ readFileSync }) => readFileSync('.github/workflows/ci.yml', 'utf8')), policy);

const migrations = migrationInventory(policy);
const changed = changedFiles(gitContext.baseSha);
const migrationRiskDecisions = validateChangedMigrationRisk(policy, migrations, changed);

let liveGovernance = {
  mode: 'not-requested',
  repository: null,
  ruleset: null,
};
if (process.env.SEC_H_REQUIRE_LIVE_GOVERNANCE === '1') {
  const observed = await fetchLiveGovernance(policy);
  liveGovernance = {
    mode: 'verified',
    repository: observed.repository,
    ruleset: observed.ruleset,
  };
}

const manifest = {
  schemaVersion: 1,
  scenario: 'sec-h-repository-release-governance',
  environment: process.env.GITHUB_ACTIONS === 'true' ? 'github-actions-test' : 'local-test',
  generatedAt: new Date().toISOString(),
  accepted: true,
  repository: policy.repository,
  targetBranch: policy.targetBranch,
  git: {
    checkoutSha: gitContext.checkoutSha,
    candidateHeadSha: gitContext.candidateHeadSha,
    baseSha: gitContext.baseSha,
    treeSha: gitContext.treeSha,
    ref: gitContext.ref,
    refName: gitContext.refName,
    eventName: gitContext.eventName,
    trackedTreeFingerprint: trackedTreeFingerprint(),
  },
  runtime: {
    expected: policy.runtime,
    observed: {
      node: process.version,
      npm: packageJson.engines?.npm ?? null,
      packageManager: packageJson.packageManager ?? null,
    },
  },
  policy: {
    path: policyPath,
    sha256: fileSha256(policyPath),
  },
  liveGovernance,
  criticalFiles: criticalFileHashes(policy),
  migrations: {
    ordering: policy.migrationPolicy.ordering,
    count: migrations.count,
    setSha256: migrations.setHash,
    inventory: migrations.migrations,
    changedRiskDecisions: migrationRiskDecisions,
  },
  changedFiles: changed,
  mergeGate: {
    requiredStatusChecks: [...policy.ruleset.requiredStatusChecks].sort(),
    repositoryRequiredChecksAreAuthoritativeForMerge: policy.deploymentStatusPolicy.repositoryRequiredChecksAreAuthoritativeForMerge,
    externalDeploymentStatusesAreSeparateFromBackendMergeGate: policy.deploymentStatusPolicy.externalDeploymentStatusesAreSeparateFromBackendMergeGate,
  },
};
manifest.manifestSha256 = manifestCoreHash(manifest);

const artifactDir = process.env.SEC_H_ARTIFACT_DIR || join(tmpdir(), 'elceo-sec-h');
const outputPath = process.env.SEC_H_MANIFEST_PATH || join(artifactDir, 'release-manifest.json');
await mkdir(dirname(outputPath), { recursive: true });
const temporaryPath = `${outputPath}.${process.pid}.tmp`;
await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await rename(temporaryPath, outputPath);

console.log(JSON.stringify({
  accepted: true,
  checkoutSha: manifest.git.checkoutSha,
  candidateHeadSha: manifest.git.candidateHeadSha,
  manifestSha256: manifest.manifestSha256,
  migrationSetSha256: manifest.migrations.setSha256,
  liveGovernance: manifest.liveGovernance.mode,
  artifact: outputPath,
}));
