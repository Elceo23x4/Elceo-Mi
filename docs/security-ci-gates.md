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
