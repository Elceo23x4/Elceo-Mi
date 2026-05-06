# S4 Supply-Chain and CI/CD Hardening

## Scope
This S4 batch hardens repository supply-chain and CI/CD controls beyond S1 baseline checks.

## CI workflow permissions policy
- Top-level workflow permission remains `contents: read` only.
- No write-scoped token permissions are permitted unless explicitly justified and reviewed.
- `pull_request_target` is disallowed for current CI validation workflow.
- CI runs without production secrets and without `smoke:production`.

## Branch protection checklist (main)
- Require pull request review before merge.
- Require CI status checks including `security:gate`.
- Disallow force-push to `main`.
- Restrict or disable admin bypass for required checks.
- Require signed commits if organization policy enables commit signing.

## Dependency and package-manager policy
- Root package manager is pinned to `npm@10.8.2` for deterministic installs.
- `package-lock.json` is mandatory and validated (`lockfileVersion` must be `3`).
- Dependency specs using `file:`, `git+`, `git:`, `github:`, `http:`, or URL tarball specs are blocked in package manifests.

## Lifecycle script policy
- Risky lifecycle hooks (`preinstall`, `install`, `postinstall`, `prepare`) are blocked in root/workspace `package.json` files by default.
- Any future exception requires explicit allowlist entry and documented rationale.

## Lockfile tamper and source policy
- Lockfile `packages[*].resolved` must resolve via `https://` for external dependencies.
- Git/http/file resolved sources are blocked (workspace-local links excluded).
- Dependency-confusion guard blocks root external dependency declarations that duplicate internal workspace package names.

## Artifact/log hygiene
- CI does not upload arbitrary build/test logs from security checks.
- Temporary files under `/tmp` or `tmp/` are not part of secret-scanning scope.
- Repository-tracked files are still scanned for secrets; sensitive values are never printed.

## Secret exposure prevention
- `.env`, `.env.local`, `.npmrc`, `.yarnrc` presence in repo root is treated as a gate failure.
- Secret scan output includes path + line + pattern name only.
- `SECURITY_GATE_ALLOW_AUDIT_UNAVAILABLE=true` remains local emergency-only and forbidden for CI/final sign-off.

## Deferred security phases
- S5 infrastructure/WAF hardening remains required.
- S6 staging attack drill and incident-response rehearsal remains required.
