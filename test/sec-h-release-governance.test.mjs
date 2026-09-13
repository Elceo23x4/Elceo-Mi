import test from 'node:test';
import assert from 'node:assert/strict';
import { manifestCoreHash, validateMigrationDecisionText, validateRulesetSnapshot } from '../scripts/lib/sec-h-release-governance.mjs';

const policy = {
  rulesetName: 'ELCEO main release protection',
  ruleset: {
    enforcement: 'active',
    target: 'branch',
    includeRefs: ['~DEFAULT_BRANCH'],
    requireDeletionProtection: true,
    requireNonFastForwardProtection: true,
    allowedMergeMethods: ['merge'],
    requiredApprovingReviewCount: 0,
    requireReviewThreadResolution: true,
    strictRequiredStatusChecks: true,
    requiredStatusChecks: ['validate', 'PostgreSQL R2 backup image', 'PostgreSQL R2 restore rehearsal image'],
    allowBypassActors: false,
  },
};

function ruleset() {
  return {
    id: 22305952,
    name: 'ELCEO main release protection',
    enforcement: 'active',
    target: 'branch',
    bypass_actors: [],
    conditions: { ref_name: { include: ['~DEFAULT_BRANCH'], exclude: [] } },
    rules: [
      { type: 'deletion' },
      { type: 'non_fast_forward' },
      {
        type: 'pull_request',
        parameters: {
          required_approving_review_count: 0,
          required_review_thread_resolution: true,
          allowed_merge_methods: ['merge'],
        },
      },
      {
        type: 'required_status_checks',
        parameters: {
          strict_required_status_checks_policy: true,
          required_status_checks: [
            { context: 'validate' },
            { context: 'PostgreSQL R2 backup image' },
            { context: 'PostgreSQL R2 restore rehearsal image' },
          ],
        },
      },
    ],
  };
}

test('locked live ruleset snapshot is accepted', () => {
  const observed = validateRulesetSnapshot(ruleset(), policy);
  assert.equal(observed.bypassActorCount, 0);
  assert.equal(observed.deletionProtected, true);
  assert.equal(observed.nonFastForwardProtected, true);
});

test('required-check drift fails closed', () => {
  const observed = ruleset();
  observed.rules.find((rule) => rule.type === 'required_status_checks').parameters.required_status_checks.pop();
  assert.throws(() => validateRulesetSnapshot(observed, policy), /required_status_checks/);
});

test('merge-method or history-protection drift fails closed', () => {
  const observed = ruleset();
  observed.rules.find((rule) => rule.type === 'pull_request').parameters.allowed_merge_methods = ['squash'];
  observed.rules = observed.rules.filter((rule) => rule.type !== 'non_fast_forward');
  assert.throws(() => validateRulesetSnapshot(observed, policy), /merge_methods|non_fast_forward_protection/);
});

test('migration-risk decision contract rejects placeholders and accepts complete evidence', () => {
  assert.throws(
    () => validateMigrationDecisionText('Risk: destructive\nRollback/compensation: TBD\nBackup/restore: verified\nApproval: operator', '0063.sql'),
    /placeholder/,
  );
  assert.equal(
    validateMigrationDecisionText('Risk: destructive schema change\nRollback/compensation: restore-first with tested compensating migration\nBackup/restore: verified backup and restore rehearsal required before promotion\nApproval: release operator sign-off required', '0063.sql'),
    true,
  );
});

test('manifest hash is deterministic and excludes only its self-hash field', () => {
  const manifest = { scenario: 'sec-h', nested: { value: 1 }, manifestSha256: 'old' };
  const first = manifestCoreHash(manifest);
  const second = manifestCoreHash({ ...manifest, manifestSha256: 'different' });
  assert.equal(first, second);
  assert.notEqual(first, manifestCoreHash({ ...manifest, nested: { value: 2 } }));
});
