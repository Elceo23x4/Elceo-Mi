#!/usr/bin/env node

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  assertCleanWorkingTree,
  criticalFileHashes,
  getGitContext,
  manifestCoreHash,
  migrationInventory,
  readJson,
  trackedTreeFingerprint,
} from './lib/sec-h-release-governance.mjs';

const policyPath = '.github/sec-h-release-governance.json';
const policy = readJson(policyPath);
const artifactDir = process.env.SEC_H_ARTIFACT_DIR || join(tmpdir(), 'elceo-sec-h');
const manifestPath = process.env.SEC_H_MANIFEST_PATH || join(artifactDir, 'release-manifest.json');
if (!existsSync(manifestPath)) throw new Error(`sec_h_manifest_missing:${manifestPath}`);

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const gitContext = getGitContext();

assert.equal(manifest.schemaVersion, 1, 'sec_h_manifest_schema_mismatch');
assert.equal(manifest.scenario, 'sec-h-repository-release-governance', 'sec_h_manifest_scenario_mismatch');
assert.equal(manifest.accepted, true, 'sec_h_manifest_not_accepted');
assert.equal(manifest.repository, policy.repository, 'sec_h_manifest_repository_mismatch');
assert.equal(manifest.targetBranch, policy.targetBranch, 'sec_h_manifest_target_branch_mismatch');
assert.equal(manifest.git?.checkoutSha, gitContext.checkoutSha, 'sec_h_manifest_checkout_sha_mismatch');
assert.equal(manifest.git?.treeSha, gitContext.treeSha, 'sec_h_manifest_tree_sha_mismatch');
assert.equal(manifest.git?.trackedTreeFingerprint, trackedTreeFingerprint(), 'sec_h_manifest_tree_fingerprint_mismatch');

const expectedHead = process.env.SEC_H_HEAD_SHA ?? null;
if (expectedHead) {
  assert.equal(gitContext.checkoutSha, expectedHead, 'sec_h_verifier_checkout_not_exact_head');
  assert.equal(manifest.git?.candidateHeadSha, expectedHead, 'sec_h_manifest_candidate_head_mismatch');
}

const currentPolicyHash = criticalFileHashes({ ...policy, criticalFiles: [policyPath] })[policyPath];
assert.equal(manifest.policy?.sha256, currentPolicyHash, 'sec_h_manifest_policy_hash_mismatch');
assert.equal(manifest.manifestSha256, manifestCoreHash(manifest), 'sec_h_manifest_self_hash_mismatch');
assert.deepEqual(manifest.criticalFiles, criticalFileHashes(policy), 'sec_h_manifest_critical_file_hashes_mismatch');

const migrations = migrationInventory(policy);
assert.equal(manifest.migrations?.ordering, policy.migrationPolicy.ordering, 'sec_h_manifest_migration_ordering_mismatch');
assert.equal(manifest.migrations?.count, migrations.count, 'sec_h_manifest_migration_count_mismatch');
assert.equal(manifest.migrations?.setSha256, migrations.setHash, 'sec_h_manifest_migration_set_hash_mismatch');
assert.deepEqual(manifest.migrations?.inventory, migrations.migrations, 'sec_h_manifest_migration_inventory_mismatch');

assert.deepEqual(
  [...(manifest.mergeGate?.requiredStatusChecks ?? [])].sort(),
  [...policy.ruleset.requiredStatusChecks].sort(),
  'sec_h_manifest_required_checks_mismatch',
);
assert.equal(manifest.mergeGate?.repositoryRequiredChecksAreAuthoritativeForMerge, true, 'sec_h_merge_authority_contract_missing');
assert.equal(manifest.mergeGate?.externalDeploymentStatusesAreSeparateFromBackendMergeGate, true, 'sec_h_external_status_separation_missing');

if (process.env.SEC_H_REQUIRE_LIVE_GOVERNANCE === '1') {
  assert.equal(manifest.liveGovernance?.mode, 'verified', 'sec_h_live_governance_not_verified');
  assert.equal(manifest.liveGovernance?.repository?.fullName, policy.repository, 'sec_h_live_repository_mismatch');
  assert.equal(manifest.liveGovernance?.repository?.defaultBranch, policy.targetBranch, 'sec_h_live_default_branch_mismatch');
  assert.equal(manifest.liveGovernance?.repository?.archived, false, 'sec_h_repository_archived');
  assert.equal(manifest.liveGovernance?.ruleset?.name, policy.rulesetName, 'sec_h_live_ruleset_name_mismatch');
  assert.equal(manifest.liveGovernance?.ruleset?.enforcement, 'active', 'sec_h_live_ruleset_not_active');
  assert.equal(manifest.liveGovernance?.ruleset?.bypassActorCount, 0, 'sec_h_live_ruleset_bypass_present');
}

assertCleanWorkingTree();
console.log(JSON.stringify({
  accepted: true,
  scenario: 'sec-h-release-manifest-integrity',
  checkoutSha: gitContext.checkoutSha,
  manifestSha256: manifest.manifestSha256,
  migrationSetSha256: manifest.migrations.setSha256,
  liveGovernance: manifest.liveGovernance?.mode ?? 'missing',
}));
