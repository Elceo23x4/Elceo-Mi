import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { classifySql } from '../migration-utils.mjs';

export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
export const fileSha256 = (path) => sha256(readFileSync(path));

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) {
    const message = (result.stderr || result.stdout || '').trim();
    throw new Error(`${command} ${args.join(' ')} failed${message ? `: ${message}` : ''}`);
  }
  return result.stdout.trim();
}

export function git(args) {
  return run('git', args);
}

export function getGitContext(env = process.env) {
  const checkoutSha = git(['rev-parse', 'HEAD']);
  const treeSha = git(['rev-parse', 'HEAD^{tree}']);
  let event = {};
  if (env.GITHUB_EVENT_PATH && existsSync(env.GITHUB_EVENT_PATH)) event = readJson(env.GITHUB_EVENT_PATH);
  return {
    checkoutSha,
    treeSha,
    candidateHeadSha: event?.pull_request?.head?.sha ?? checkoutSha,
    baseSha: env.SEC_H_BASE_SHA || event?.pull_request?.base?.sha || event?.before || null,
    repository: env.GITHUB_REPOSITORY || null,
    ref: env.GITHUB_REF || null,
    refName: env.GITHUB_REF_NAME || null,
    eventName: env.GITHUB_EVENT_NAME || null,
  };
}

export function assertCleanWorkingTree() {
  const status = git(['status', '--porcelain=v1', '--untracked-files=all']);
  if (status) throw new Error(`sec_h_worktree_not_clean:${status.split('\n').join('|')}`);
  return true;
}

export function validatePackageRuntime(packageJson, policy) {
  const errors = [];
  if (packageJson.packageManager !== policy.runtime.packageManager) errors.push('packageManager');
  if (packageJson.engines?.node !== policy.runtime.node) errors.push('engines.node');
  if (packageJson.engines?.npm !== policy.runtime.npm) errors.push('engines.npm');
  if (errors.length) throw new Error(`sec_h_runtime_contract_mismatch:${errors.join(',')}`);
  return true;
}

export function validateCiWorkflow(text, policy) {
  if (!/^permissions:\s*\n\s{2}contents:\s*read\s*$/m.test(text)) throw new Error('sec_h_ci_permissions_not_contents_read');
  for (const command of policy.workflow.requiredValidationCommands) {
    if (!text.includes(command)) throw new Error(`sec_h_ci_missing_required_command:${command}`);
  }
  if (!text.includes('Verify clean working tree')) throw new Error('sec_h_ci_missing_clean_tree_gate');
  if (!text.includes('Diff integrity validation')) throw new Error('sec_h_ci_missing_diff_integrity_gate');
  return true;
}

const sortedUnique = (values) => [...new Set(values)].sort();

export function validateRulesetSnapshot(detail, policy) {
  const errors = [];
  if (!detail) errors.push('ruleset_missing');
  if (detail?.name !== policy.rulesetName) errors.push('ruleset_name');
  if (detail?.enforcement !== policy.ruleset.enforcement) errors.push('enforcement');
  if (detail?.target !== policy.ruleset.target) errors.push('target');
  const includes = sortedUnique(detail?.conditions?.ref_name?.include ?? []);
  if (JSON.stringify(includes) !== JSON.stringify(sortedUnique(policy.ruleset.includeRefs))) errors.push('include_refs');
  if (!policy.ruleset.allowBypassActors && (detail?.bypass_actors?.length ?? 0) > 0) errors.push('bypass_actors');
  const rules = detail?.rules ?? [];
  if (policy.ruleset.requireDeletionProtection && !rules.some((rule) => rule.type === 'deletion')) errors.push('deletion_protection');
  if (policy.ruleset.requireNonFastForwardProtection && !rules.some((rule) => rule.type === 'non_fast_forward')) errors.push('non_fast_forward_protection');

  const pullRule = rules.find((rule) => rule.type === 'pull_request');
  if (!pullRule) errors.push('pull_request_rule');
  else {
    const methods = sortedUnique(pullRule.parameters?.allowed_merge_methods ?? []);
    if (JSON.stringify(methods) !== JSON.stringify(sortedUnique(policy.ruleset.allowedMergeMethods))) errors.push('merge_methods');
    if (Number(pullRule.parameters?.required_approving_review_count ?? -1) !== policy.ruleset.requiredApprovingReviewCount) errors.push('approval_count');
    if (Boolean(pullRule.parameters?.required_review_thread_resolution) !== policy.ruleset.requireReviewThreadResolution) errors.push('review_thread_resolution');
  }

  const statusRule = rules.find((rule) => rule.type === 'required_status_checks');
  if (!statusRule) errors.push('required_status_checks_rule');
  else {
    if (Boolean(statusRule.parameters?.strict_required_status_checks_policy) !== policy.ruleset.strictRequiredStatusChecks) errors.push('strict_status_checks');
    const contexts = sortedUnique((statusRule.parameters?.required_status_checks ?? []).map((entry) => entry.context));
    if (JSON.stringify(contexts) !== JSON.stringify(sortedUnique(policy.ruleset.requiredStatusChecks))) errors.push('required_status_checks');
  }

  if (errors.length) throw new Error(`sec_h_live_ruleset_mismatch:${errors.join(',')}`);
  return {
    id: detail.id,
    name: detail.name,
    enforcement: detail.enforcement,
    target: detail.target,
    deletionProtected: rules.some((rule) => rule.type === 'deletion'),
    nonFastForwardProtected: rules.some((rule) => rule.type === 'non_fast_forward'),
    requiredStatusChecks: sortedUnique((statusRule?.parameters?.required_status_checks ?? []).map((entry) => entry.context)),
    allowedMergeMethods: sortedUnique(pullRule?.parameters?.allowed_merge_methods ?? []),
    strictRequiredStatusChecks: Boolean(statusRule?.parameters?.strict_required_status_checks_policy),
    requireReviewThreadResolution: Boolean(pullRule?.parameters?.required_review_thread_resolution),
    bypassActorCount: detail?.bypass_actors?.length ?? 0,
  };
}

export async function fetchLiveGovernance(policy, fetchImpl = fetch) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'elceo-sec-h-governance',
  };
  const token = process.env.SEC_H_GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const repoResponse = await fetchImpl(`https://api.github.com/repos/${policy.repository}`, { headers });
  if (!repoResponse.ok) throw new Error(`sec_h_repository_metadata_unavailable:${repoResponse.status}`);
  const repo = await repoResponse.json();
  if (repo.full_name !== policy.repository) throw new Error(`sec_h_repository_identity_mismatch:${repo.full_name}`);
  if (repo.default_branch !== policy.targetBranch) throw new Error(`sec_h_default_branch_mismatch:${repo.default_branch}`);
  if (repo.archived) throw new Error('sec_h_repository_archived');

  const listResponse = await fetchImpl(`https://api.github.com/repos/${policy.repository}/rulesets`, { headers });
  if (!listResponse.ok) throw new Error(`sec_h_ruleset_inventory_unavailable:${listResponse.status}`);
  const rulesets = await listResponse.json();
  const selected = rulesets.find((entry) => entry.name === policy.rulesetName && entry.enforcement === policy.ruleset.enforcement);
  if (!selected) throw new Error(`sec_h_required_ruleset_missing:${policy.rulesetName}`);

  const detailResponse = await fetchImpl(`https://api.github.com/repos/${policy.repository}/rulesets/${selected.id}`, { headers });
  if (!detailResponse.ok) throw new Error(`sec_h_ruleset_detail_unavailable:${detailResponse.status}`);
  const detail = await detailResponse.json();
  return {
    repository: { fullName: repo.full_name, defaultBranch: repo.default_branch, archived: repo.archived },
    ruleset: validateRulesetSnapshot(detail, policy),
  };
}

export function migrationInventory(policy) {
  const directory = resolve(policy.migrationPolicy.directory);
  const files = readdirSync(directory)
    .filter((name) => name.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: false, sensitivity: 'variant' }));
  if (!files.length) throw new Error('sec_h_no_migrations');
  const rows = files.map((filename) => {
    const path = join(directory, filename);
    const sql = readFileSync(path, 'utf8');
    return { filename, sha256: sha256(sql), classifications: classifySql(sql) };
  });
  return { count: rows.length, setHash: sha256(rows.map((row) => `${row.filename}:${row.sha256}`).join('\n')), migrations: rows };
}

export function changedFiles(baseSha) {
  if (!baseSha) return [];
  return git(['diff', '--name-only', `${baseSha}..HEAD`]).split('\n').filter(Boolean).sort();
}

export function validateMigrationDecisionText(text, filename) {
  for (const label of ['Risk:', 'Rollback/compensation:', 'Backup/restore:', 'Approval:']) {
    if (!text.includes(label)) throw new Error(`sec_h_migration_decision_missing_field:${filename}:${label}`);
  }
  if (/\b(TBD|TODO|PENDING|PLACEHOLDER)\b/i.test(text)) throw new Error(`sec_h_migration_decision_placeholder:${filename}`);
  return true;
}

export function validateChangedMigrationRisk(policy, inventory, files) {
  const changed = new Set(files);
  const requiredKinds = new Set(policy.migrationPolicy.decisionRequiredForClassifications);
  const decisions = [];
  for (const migration of inventory.migrations) {
    const migrationPath = `${policy.migrationPolicy.directory}/${migration.filename}`;
    if (!changed.has(migrationPath)) continue;
    if (!migration.classifications.some((kind) => requiredKinds.has(kind))) continue;
    const decisionPath = `${policy.migrationPolicy.decisionDirectory}/${migration.filename}.md`;
    if (!existsSync(decisionPath)) throw new Error(`sec_h_migration_decision_required:${migration.filename}`);
    validateMigrationDecisionText(readFileSync(decisionPath, 'utf8'), migration.filename);
    decisions.push({ filename: migration.filename, decisionPath, decisionSha256: fileSha256(decisionPath) });
  }
  return decisions;
}

export function criticalFileHashes(policy) {
  const result = {};
  for (const path of policy.criticalFiles) {
    if (!existsSync(path) || !statSync(path).isFile()) throw new Error(`sec_h_critical_file_missing:${path}`);
    result[path] = fileSha256(path);
  }
  return result;
}

export function trackedTreeFingerprint() {
  return sha256(git(['ls-files', '-s']));
}

export function assertExpectedHead(context, expectedHead) {
  if (expectedHead && context.checkoutSha !== expectedHead) {
    throw new Error(`sec_h_exact_head_mismatch:expected=${expectedHead}:actual=${context.checkoutSha}`);
  }
  return true;
}

export function manifestCoreHash(manifest) {
  const clone = structuredClone(manifest);
  delete clone.manifestSha256;
  return sha256(JSON.stringify(clone));
}
