# ELCEO Production Readiness Checklist (C4-M8A)

## 1) Build / test / lint gates
- [ ] `npm install`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run -w @elceo/application-state lint`
- [ ] `npm run -w @elceo/analytics lint`
- [ ] `npm run -w @elceo/reasoning lint`
- [ ] `npm run -w @elceo/notifications lint`
- [ ] `npm run -w apps/web lint`

## 2) Environment readiness
- [ ] `APP_ENV=production`
- [ ] `NEXT_PUBLIC_APP_BASE_URL` set to absolute public HTTPS URL
- [ ] `AUTH_SECRET` configured
- [ ] `ELCEO_INTERNAL_API_TOKEN` configured
- [ ] Billing/provider keys set for enabled integrations only
- [ ] DB repository mode and credentials validated

## 3) Build warning review
- [ ] `NEXT_PUBLIC_APP_BASE_URL is required` warning resolved by production env configuration.
- [ ] Next.js Edge warning from `jose` (`CompressionStream` / `DecompressionStream`) acknowledged as dependency/runtime warning requiring future dependency/runtime alignment if strict Edge execution is planned.
- [ ] npm `Unknown env config "http-proxy"` warning tracked in deployment environment configuration cleanup.

## 4) DB migration readiness
- [ ] Follow ordered migration plan from `docs/db-migration-readiness-checklist.md`.
- [ ] Rehearse on staging snapshot.
- [ ] Backup + restore validation completed.
- [ ] Post-migration smoke checks completed.

## 5) Security + observability
- [ ] API envelope checks complete.
- [ ] Security audit event persistence verified.
- [ ] Internal/admin token protection verified.
- [ ] Idempotency/rate-limit protected-route checks complete.
- [ ] Logging level and external error transport config reviewed.

## 6) API and runtime smoke checks
- [ ] Account/billing/entitlements reads.
- [ ] Billing reconcile/policy/orchestration internals.
- [ ] Notification dispatch/feedback/verification flows.
- [ ] Refresh/workspace/analytics/coaching generate+latest flows.
- [ ] Ops runtime scheduled/lease-safe execution checks.

## 7) Rollback plan
- [ ] Deployment rollback procedure documented and tested.
- [ ] DB rollback strategy (restore or reversible migration path) approved.
- [ ] Incident communication + ownership matrix confirmed.

## 8) Known non-blocking warnings (current)
- Edge runtime compatibility warnings from `jose` in Next build output.
- npm environment warning for `http-proxy` config in current shell/CI environment.

## 9) Production-hardening backlog
- Optional full-response idempotency replay body support.
- Infra/WAF tier rate limits layered above app limits.
- Final external penetration/security test sign-off.

## 10) Deployment smoke test command (C4-M8B)
- [ ] Export `ELCEO_SMOKE_BASE_URL` to the deployed environment URL (staging first).
- [ ] Optionally export `ELCEO_INTERNAL_API_TOKEN` for internal/admin read checks.
- [ ] Optionally export `ELCEO_SMOKE_AUTH_TOKEN` for authenticated read checks.
- [ ] Keep `ELCEO_SMOKE_ALLOW_MUTATIONS=false` (default safe mode).
- [ ] Run `npm run smoke:production`.
- [ ] Review summary output (`passed/failed/skipped`) and treat any failed required check as release-blocking.

### Smoke test safety behavior
- Default mode is non-destructive and read-only focused.
- Mutation probes are skipped unless `ELCEO_SMOKE_ALLOW_MUTATIONS=true`.
- Mutation mode is intended for staging/safe environments only, not live production.

## 11) Release gate + runbook (C4-M8C)
- [ ] Run `npm run release:gate` locally before requesting deployment approval.
- [ ] Follow staged rollout sequence in `docs/deployment-runbook.md`.
- [ ] Run staging smoke validation (`ELCEO_SMOKE_BASE_URL=... npm run smoke:production`) after staging deploy and before production promotion.

## 12) Final production status report (C4-M8D)
- Reference: `docs/final-production-status-report.md` for consolidated backend completion, launch blockers, and explicit go/no-go criteria.


## C5-A1 note
C5-A1 starts backend market-evidence and SEO/content architecture expansion as a foundation only; no live provider integration is active yet.
