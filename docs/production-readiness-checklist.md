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
