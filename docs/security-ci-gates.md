# Security CI Gates (S1)

## Local command
Run:

```bash
npm run security:gate
```

## What it checks
1. `npm audit --audit-level=high` (fails on high/critical vulnerabilities).
2. `package-lock.json` integrity and root metadata/dependency consistency against `package.json`.
3. Suspicious `package.json` script patterns (`curl|sh`, `wget|sh`, `rm -rf /`, `chmod 777`, `eval(`, `base64 -d | sh`, `nc -e`).
4. Static secret scanning across tracked source-like files, including docs, with allowlist marker `security-scan-ignore` on the same line.
5. `.github/workflows/ci.yml` hardening (`permissions: contents: read`, no `write-all`/`contents: write`, no obvious secret echoing).

## CI enforcement
CI runs `npm run security:gate` after typecheck/test/build/lint/migration/c5-readiness checks, without `SECURITY_GATE_ALLOW_AUDIT_UNAVAILABLE`.

## Policy notes
- Audit policy is high/critical only for this batch.
- `npm audit` unavailability (registry/auth/network) is **blocking by default**.
- Local emergency-only override: `SECURITY_GATE_ALLOW_AUDIT_UNAVAILABLE=true` downgrades audit-unavailable to warning; do not use in CI or release sign-off.
- Secret scan prints only file path, line number, and pattern name (never the secret value).
- Placeholder values like `<SECRET>` and `your_api_key_here` are ignored in docs/config examples.

## Known limitations
- Static regex scanning is not a replacement for professional secret scanning.
- `npm audit` may include false positives/negatives.
- Additional hardening batches S2/S3/S4/S5/S6 remain required before launch.

## S4 supply-chain extensions
- `security:gate` now enforces npm package-manager pinning (`npm@10.x`), lockfile version policy, dependency source restrictions, lifecycle install-script restrictions, lockfile resolved-source restrictions, and dependency-confusion checks.
- CI workflow hardening checks now also assert: no `pull_request_target`, Node 20 pinning, no `smoke:production` in CI, and no secret echo patterns.
- Root sensitive config files (`.env`, `.env.local`, `.npmrc`, `.yarnrc`) are treated as failures if present in repository root.
- See `docs/supply-chain-cicd-hardening.md` for policy details and branch-protection checklist.


## S5 infrastructure/WAF/deployment policy update
- Added and adopted `docs/infrastructure-security-policy.md` as required pre-launch policy source.
- Confirms app-level headers baseline and deployment-level enforcement for HTTPS/HSTS/CSP/CORS/WAF.
- Confirms backup/restore, DB/network isolation, IAM least-privilege, and secret rotation are launch blockers.
- Staging verification is required before launch; S6 attack drill remains mandatory.
- This update is policy hardening only and is not security certification.


## S6 staging attack drill and final sign-off update
- S6 status: framework defined in `docs/staging-attack-drill-and-security-signoff.md`; staging execution evidence remains required before production promotion.
- Final sign-off report: `docs/final-security-signoff-report.md`.
- Security and release gates must pass **without** audit-unavailable override for CI/final sign-off.
- Required sequence before production deploy: staging smoke + staging attack drill.
- Required sequence after production deploy: production smoke.
- Public/frontend launch remains blocked until security sign-off is complete.
