# ELCEO Deployment Runbook (C4-M8C)

## Release stages
1. Local release gate
2. CI validation
3. Staging deploy
4. Staging smoke test
5. Migration verification
6. Production env verification
7. Production deploy
8. Production smoke test
9. Monitoring window
10. Rollback criteria

## 1) Local release gate
Run from repo root:

```bash
npm run release:gate
```

This executes the approved validation chain and stops on first failure.

## 2) CI validation
CI must run the same quality checks as local release gate (without production secrets):
- `npm install`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- package lint commands
- `npm run check:migrations`

## 3) Staging deploy
Deploy the candidate artifact to staging first. Keep artifact/version identifier recorded for rollback.

## 4) Staging smoke test
Run smoke tests only against deployed staging URL:

```bash
ELCEO_SMOKE_BASE_URL=https://staging.example.com npm run smoke:production
```

Optional env:
- `ELCEO_INTERNAL_API_TOKEN`
- `ELCEO_SMOKE_AUTH_TOKEN`

Smoke behavior:
- Read-only by default.
- Auth checks are skipped if auth token is absent.
- Mutation checks require `ELCEO_SMOKE_ALLOW_MUTATIONS=true` and should be staging-only.

## 5) Migration verification
Before and during rollout:

```bash
npm run check:migrations
```

Apply DB migrations in lexicographic file order.

## 6) Production env verification
Confirm required production env/config is set before deploy:
- `NEXT_PUBLIC_APP_BASE_URL`
- `ELCEO_INTERNAL_API_TOKEN`
- DB/persistence variables
- Auth secrets (`AUTH_SECRET`, provider secrets if enabled)
- Billing/provider secrets if enabled
- Notification/provider secrets if enabled

## 7) Production deploy
Promote the validated artifact to production only after staging checks are clean.

## 8) Production smoke test
Run post-deploy smoke checks:

```bash
ELCEO_SMOKE_BASE_URL=https://prod.example.com npm run smoke:production
```

Default mode remains non-destructive unless mutation mode is explicitly enabled.

## 9) Monitoring window
Track API errors, security audit events, billing/notification runtime metrics, and deployment logs through a defined post-release monitoring window.

## 10) Rollback criteria and process
- Take DB backup before migrations.
- Keep prior deployment artifact available for immediate rollback.
- Rollback triggers (examples): persistent 5xx increase, failed required smoke checks, migration integrity failures, severe auth/internal-gate regressions.
- On rollback: restore previous artifact, execute DB restore/recovery plan as needed, then run verification smoke checks.

## Known warnings to acknowledge
- Next.js Edge runtime warning (`jose` / `CompressionStream` / `DecompressionStream`).
- `NEXT_PUBLIC_APP_BASE_URL` warning if not configured.
- npm `Unknown env config "http-proxy"` warning when present in CI/shell env.

## Final status and go/no-go reference (C4-M8D)
- Before launch approval, review `docs/final-production-status-report.md` for consolidated blocker vs non-blocker criteria and final readiness posture.

## C5-A21 live adapter activation planning
- Added provider live activation policy/readiness/quota/smoke-plan contracts and validators.
- Added staging-only live fetch gating helpers; production remains blocked by default.
- No scheduler/live ingestion activation in this batch; no secrets exposed in readiness outputs.


## C5-A22 note
- Added scheduled ingestion orchestration foundation with dry-run fixture jobs, persisted run records, query/replay helpers, deterministic retry/staleness helpers, and production-live blocked by default.
- No cron deployment and no live provider calls by default in this batch.


## C5-A23 note
- Added protected internal/admin scheduled-ingestion routes: policies/runs/replay (GET) and dry-run (POST).
- Dry-run POST is internal+admin.ops gated with mutation security decision, idempotency, rate-limit, audit, and response-envelope completion.
- Route input rejects production_live override and provider API key fields; fixture dry-run only.
- No public routes, no cron deployment, and no live provider calls in this batch.
\n\n## C5-A24 backend consolidation linkage\n- See  for consolidated C5 backend readiness truth source.\n- Live ingestion remains blocked-by-default; cron deployment and public SEO route launch remain deferred.\n- Production go/no-go still requires security verification track, staging smoke, and production smoke.\n- DB migrations must be applied in strict lexicographic order (including , , ).\n- Known non-blocking warnings remain tracked; do not treat them as launch-complete signals.

## C5-A24 backend consolidation linkage
- See `docs/c5-market-evidence-backend-readiness-report.md` for consolidated C5 backend readiness truth source.
- Live ingestion remains blocked-by-default; cron deployment and public SEO route launch remain deferred.
- Production go/no-go still requires security verification track, staging smoke, and production smoke.
- DB migrations must be applied in strict lexicographic order (including `0032`, `0033`, `0034`).
- Known non-blocking warnings remain tracked; do not treat them as launch-complete signals.

## S1 security gate requirement
- Include `npm run security:gate` in local pre-deploy validation and CI pass criteria.
- CI workflow permissions must stay restricted to `contents: read` unless a justified exception is added with explicit review.
- `npm audit` registry/auth/network unavailability blocks by default; `SECURITY_GATE_ALLOW_AUDIT_UNAVAILABLE=true` is local emergency-only and not valid for CI or production release sign-off.

## S4 CI/CD hardening operating notes
- Keep CI workflow token scope read-only (`permissions: contents: read`) unless a reviewed exception is documented.
- Do not run `smoke:production` in CI; smoke remains post-deploy only with `ELCEO_SMOKE_BASE_URL`.
- Do not use `SECURITY_GATE_ALLOW_AUDIT_UNAVAILABLE=true` for CI or production release sign-off.
- Enforce branch protection on `main` before production release approvals.


## S5 infrastructure/WAF/deployment policy update
- Added and adopted `docs/infrastructure-security-policy.md` as required pre-launch policy source.
- Confirms app-level headers baseline and deployment-level enforcement for HTTPS/HSTS/CSP/CORS/WAF.
- Confirms backup/restore, DB/network isolation, IAM least-privilege, and secret rotation are launch blockers.
- Staging verification is required before launch; S6 attack drill remains mandatory.
- This update is policy hardening only and is not security certification.
