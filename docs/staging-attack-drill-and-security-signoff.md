# S6 — Staging Attack Drill and Security Sign-Off

## 1) Purpose and scope
This document defines the final pre-launch **staging attack drill** and the required security sign-off workflow for ELCEO backend/public-surface readiness. It is a verification framework, not a security certification.

## 2) Required environment
- Staging base URL (`ELCEO_STAGING_BASE_URL`) pointing to deployed staging.
- Staging auth token (`ELCEO_STAGING_AUTH_TOKEN`) for authenticated-denial/positive checks.
- Internal API token (`ELCEO_INTERNAL_API_TOKEN`) for internal-gated positive checks.
- Staging must not use production data.
- Do not call live provider paths unless explicitly staged and approved.

## 3) Required pre-drill gates
Run and pass before the drill:
- `npm run release:gate` (without override)
- `npm run security:gate` (without override)
- `npm run check:c5-readiness`
- `npm run check:infra-security`
- Staging smoke test (`ELCEO_SMOKE_BASE_URL=... npm run smoke:production`)

## 4) Drill categories
- Auth denial probes
- Admin/internal denial probes
- Malformed JSON probes
- Query injection probes
- Route method rejection probes
- WAF/header verification checks
- Rate-limit behavior checks
- Secret-leak checks
- Scheduled-ingestion dry-run safety checks
- Provider-live blocked-by-default checks

## 5) Expected pass criteria
- Protected admin/internal routes deny missing/invalid tokens.
- Invalid JSON and invalid query inputs return standardized error envelopes.
- Security headers are present on reachable safe endpoints.
- Admin/internal responses do not expose wildcard CORS.
- Abuse probes do not expose stack traces, secrets, SQL fragments, or internal credentials.
- Provider-live remains blocked by default unless explicitly staged.

## 6) Failure escalation and rollback criteria
Escalate and halt promotion if any required denial/header/secret-leak probe fails.
- Open security incident ticket with failing probe IDs and timestamps.
- Freeze production promotion.
- Roll back staging candidate if regression is deployment-linked.
- Re-run release/security gates and drill after remediation.

## 7) Sign-off checklist
- [ ] Pre-drill gates passed without override.
- [ ] Staging smoke passed on deployed staging URL.
- [ ] Staging attack drill completed with required probes passing.
- [ ] Results documented in `docs/final-security-signoff-report.md`.
- [ ] Remaining risk exceptions formally accepted.
- [ ] Public/frontend launch decision held until security sign-off is complete.

## 8) Deferred external requirements
- External penetration test.
- WAF/CDN staging validation at edge.
- Backup/restore drill completion.
- Final production smoke after deployment.

## Non-claim statement
This S6 framework improves launch readiness posture and sign-off quality; it does not constitute a security certification.
