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
- Optional env: `ELCEO_INTERNAL_API_TOKEN`, `ELCEO_SMOKE_SESSION_COOKIE` (a legitimate unexpired NextAuth cookie header value).
- Default safe mode (`ELCEO_SMOKE_ALLOW_MUTATIONS=false`) verifies envelope/auth/internal-gate behavior without intentional mutations.
- If `ELCEO_SMOKE_SESSION_COOKIE` is absent, authenticated checks are marked skipped and do not fail the full run; positive admin checks require it together with `ELCEO_INTERNAL_API_TOKEN`.
- Any failed required smoke check is release-blocking.

## C4-M8C release execution linkage
- Run `npm run release:gate` before deployment handoff.
- Use `docs/deployment-runbook.md` for staging -> production release sequence.
- Staging smoke-test execution (`ELCEO_SMOKE_BASE_URL=... npm run smoke:production`) is required post-deploy and pre-production.

## Final production status linkage (C4-M8D)
- Cross-check final launch blockers, caveats, and go/no-go criteria in `docs/final-production-status-report.md` before production sign-off.
\n\n## C5-A24 backend consolidation linkage\n- See  for consolidated C5 backend readiness truth source.\n- Live ingestion remains blocked-by-default; cron deployment and public SEO route launch remain not in this RC-J scope.\n- Production go/no-go still requires security verification track, staging smoke, and production smoke.\n- DB migrations must be applied in strict lexicographic order (including , , ).\n- Known non-blocking warnings remain tracked; do not treat them as launch-complete signals.

## C5-A24 backend consolidation linkage
- See `docs/c5-market-evidence-backend-readiness-report.md` for consolidated C5 backend readiness truth source.
- Live ingestion remains blocked-by-default; cron deployment and public SEO route launch remain not in this RC-J scope.
- Production go/no-go still requires security verification track, staging smoke, and production smoke.
- DB migrations must be applied in strict lexicographic order (including `0032`, `0033`, `0034`).
- Known non-blocking warnings remain tracked; do not treat them as launch-complete signals.

## S1 security CI gates
- Run `npm run security:gate` locally before release handoff.
- Confirm CI executes `npm run security:gate` with restrictive workflow permissions (`contents: read`).
- Treat any high-confidence secret-scan finding as release-blocking unless explicitly allowlisted using same-line `security-scan-ignore`.

## S2 IDOR/authorization verification note
- Added `docs/security-idor-authorization-matrix.md` with representative route family gate classification and expected subject boundaries.
- Route-runtime coverage now includes representative cross-subject denial checks (journal/portfolio), admin/internal gate denial checks (billing/admin/internal/market-evidence/scheduled-ingestion), and mutation security action-kind regression assertions.
- This does not replace external pentest or staging attack drill sign-off.
- Next security phase remains S3 input abuse/injection adversarial testing.

## S3 injection/input-abuse hardening note
- Added representative input-abuse matrix: `docs/security-input-abuse-hardening-matrix.md`.
- Added representative route-runtime tests for query injection/abuse, malformed JSON/body abuse, and internal-error redaction checks.
- This is not security certification and does not replace DAST/fuzzing/pentest.
- S4 (supply-chain/CI), S5 (infra/WAF), and S6 (staging attack drill) remain required.

## S4 supply-chain/CI review additions
- Verify branch protection is active on `main` (PR review + required CI + required `security:gate` + force-push disabled).
- Verify CI workflow remains read-only (`permissions: contents: read`) and does not run `pull_request_target` or production smoke tests.
- Verify release sign-off does not use `SECURITY_GATE_ALLOW_AUDIT_UNAVAILABLE=true`.
- Confirm S5 (infra/WAF) and S6 (staging attack drill) are still open requirements.


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

## RC-J operational validation checklist
- Staging/prod isolation is mandatory and must prove distinct URLs, distinct database URLs, non-live staging provider modes, no committed staging secrets, non-mutating staging smoke, and explicit deployment target selection.
- Attack drill proof is mandatory and must show protected route denial, rate-limit or simulated policy gate status, anonymous/admin denial, malformed payload safety, oversized payload rejection, unsafe production-live flag refusal, and redacted summaries.
- Monitoring/alerting proof is mandatory and must identify the alert receiver, expected operator action, safe synthetic trigger path, health/smoke endpoint status, alert sink status, and redacted payload evidence.
- Backup/restore proof is mandatory and must record a secret-free artifact/checksum plus schema/table validation evidence.
- Rollback proof is mandatory and must include explicit target, no manual production editing, post-rollback smoke, migration rollback policy, and irreversible migration policy.
- RC-I2-CERT remains a mandatory unresolved pre-launch blocker. IFP remains a mandatory pre-launch dependency. RC-K remains final full-repository closure.
