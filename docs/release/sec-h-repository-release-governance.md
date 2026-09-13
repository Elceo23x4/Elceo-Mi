# SEC-H — Repository and Release Governance

SEC-H closes repository/release governance after SEC-G empirical resilience acceptance. It does **not** add product behavior, activate providers, or replace existing release/security/rollback machinery.

## Authoritative merge contract

The protected release branch is `main`. The live repository ruleset `ELCEO main release protection` is the authoritative repository-side merge control and must remain active with:

- deletion protection;
- non-fast-forward protection;
- pull-request merges only;
- merge commits as the only allowed merge method;
- review-thread resolution required;
- no bypass actors;
- strict required status checks;
- required contexts `validate`, `PostgreSQL R2 backup image`, and `PostgreSQL R2 restore rehearsal image`.

SEC-H verifies the live ruleset during its exact-head workflow. The existing required `validate` job remains the merge authority and now transitively executes the SEC-H structural/manifest gate through `npm run release:gate`.

External deployment statuses, including Vercel preview/deployment contexts, remain operational deployment signals and are not silently promoted into backend merge authority. If production policy later requires such a context, the ruleset and this policy must be changed together and reviewed explicitly.

## Release identity and manifest

`scripts/sec-h-release-governance.mjs` creates a fail-closed release manifest tied to the checked-out commit. The manifest records:

- checkout SHA, candidate PR-head SHA, base SHA and Git tree SHA;
- tracked-tree fingerprint;
- Node/npm/package-manager contract;
- SHA-256 of the SEC-H policy and critical governance/release files;
- full ordered migration inventory and migration-set SHA-256;
- changed migration risk decisions when required;
- live repository/ruleset snapshot in exact-head mode;
- required merge contexts and external-deployment-status separation;
- a deterministic manifest self-hash.

Generated SEC-H evidence is written outside the repository by default (`$TMPDIR/elceo-sec-h`) so validation cannot dirty the candidate source tree.

`scripts/verify-sec-h-release-manifest.mjs` independently recomputes the source-tree, critical-file, migration-set and manifest hashes and fails on drift.

## Migration risk governance

Canonical migration identity and order remain full-filename lexicographic order under `infra/db/schema`.

When a changed migration is classified by the existing migration classifier as `destructive` or `unknown`, SEC-H requires a decision record at:

`docs/release/migration-risk-decisions/<migration-filename>.md`

The record must contain non-placeholder values for:

- `Risk:`
- `Rollback/compensation:`
- `Backup/restore:`
- `Approval:`

This supplements—not replaces—the existing migration rehearsal, backup/restore and rollback controls.

## Existing release controls retained

SEC-H preserves the established controls already exercised by `release:gate`, CI, and the deployment runbook, including deterministic dependency installation, audit/dependency checks, typecheck/tests/build, migration validation/rehearsal, security gate, clean working tree, staging smoke, backup/restore rehearsal and rollback procedure.

SEC-H adds governance identity and drift detection around these controls rather than duplicating them.

## Exact-head acceptance

`.github/workflows/sec-h-exact-head.yml` checks out the exact published PR head and:

1. proves the exact checkout SHA;
2. installs the locked Node/npm dependency environment;
3. verifies the live repository ruleset against the SEC-H policy;
4. generates the exact-head release manifest;
5. independently verifies the manifest;
6. proves the source tree stayed clean;
7. uploads the evidence artifact tied to the exact PR-head SHA.

SEC-H is accepted only when, on one exact PR-head SHA:

- required `CI Validation` passes;
- `SEC-H Exact-Head Release Governance` passes;
- the manifest independently verifies;
- the live ruleset has no drift or bypass actor;
- migration risk decisions are complete when applicable;
- no critical governance/release file hash drifts during verification.

After SEC-H is merged, the next stage is final integrated `main` acceptance, followed by backend freeze and the complete API/UI handoff package.
