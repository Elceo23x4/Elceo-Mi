# ELCEO Observability/Security Final Review Checklist (C4-M8A)

## API correctness and error envelope
- Verify all production API routes return standard envelope shape for success/error.
- Spot-check deterministic error codes/status mapping.

## Security controls
- Verify route-level idempotency/rate-limit checks on protected mutations.
- Verify security audit events persist for blocked/replayed/successful protected actions.
- Verify internal/admin routes reject missing or invalid `x-elceo-internal-token`.
- Verify auth/session behavior with production secret configured.

## Billing safety checks
- Reconciliation endpoint smoke check.
- Policy evaluation/transition read smoke check.
- Orchestration retry path smoke check with idempotency headers.

## Notifications and ops checks
- Notification dispatch run + feedback processing smoke checks.
- Verification issue/consume and expiry processor checks.
- Ops runtime lease and run persistence checks.

## Domain smoke checks
- Workspace refresh/query smoke checks.
- Analytics generate/latest smoke checks.
- Coaching generate/latest smoke checks.
- Journal/portfolio mutation smoke checks with security controls active.

## Infrastructure hardening recommendations
- Perform final penetration/security review before launch.
- Enforce edge/WAF rate limiting in front of app-level limits.
- Run backup/restore drill for production database before go-live.

## C4-M8B smoke-test verification command
- Run `npm run smoke:production` against staging before production rollout.
- Required env: `ELCEO_SMOKE_BASE_URL`.
- Optional env: `ELCEO_INTERNAL_API_TOKEN`, `ELCEO_SMOKE_AUTH_TOKEN`.
- Default safe mode (`ELCEO_SMOKE_ALLOW_MUTATIONS=false`) verifies envelope/auth/internal-gate behavior without intentional mutations.
- If `ELCEO_SMOKE_AUTH_TOKEN` is absent, authenticated checks are marked skipped and do not fail the full run.
- Any failed required smoke check is release-blocking.

## C4-M8C release execution linkage
- Run `npm run release:gate` before deployment handoff.
- Use `docs/deployment-runbook.md` for staging -> production release sequence.
- Staging smoke-test execution (`ELCEO_SMOKE_BASE_URL=... npm run smoke:production`) is required post-deploy and pre-production.

## Final production status linkage (C4-M8D)
- Cross-check final launch blockers, caveats, and go/no-go criteria in `docs/final-production-status-report.md` before production sign-off.
\n\n## C5-A24 backend consolidation linkage\n- See  for consolidated C5 backend readiness truth source.\n- Live ingestion remains blocked-by-default; cron deployment and public SEO route launch remain deferred.\n- Production go/no-go still requires security verification track, staging smoke, and production smoke.\n- DB migrations must be applied in strict lexicographic order (including , , ).\n- Known non-blocking warnings remain tracked; do not treat them as launch-complete signals.

## C5-A24 backend consolidation linkage
- See `docs/c5-market-evidence-backend-readiness-report.md` for consolidated C5 backend readiness truth source.
- Live ingestion remains blocked-by-default; cron deployment and public SEO route launch remain deferred.
- Production go/no-go still requires security verification track, staging smoke, and production smoke.
- DB migrations must be applied in strict lexicographic order (including `0032`, `0033`, `0034`).
- Known non-blocking warnings remain tracked; do not treat them as launch-complete signals.

## S1 security CI gates
- Run `npm run security:gate` locally before release handoff.
- Confirm CI executes `npm run security:gate` with restrictive workflow permissions (`contents: read`).
- Treat any high-confidence secret-scan finding as release-blocking unless explicitly allowlisted using same-line `security-scan-ignore`.
