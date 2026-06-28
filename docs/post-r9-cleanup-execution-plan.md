# Post-R9 Cleanup Execution Plan

This plan is derived from proven and strongly indicated findings in `docs/post-r9-repository-closure-audit.md`. It does not define a new C6-R phase, C6-R9H, C6-R10, or any postponed intelligence feature.

## RC-A — Truth-source and contract corrections

1. Batch ID: RC-A.
2. Exact goal: clarify reasoning completion contracts so descriptor-shape validity, deterministic foundation completion, live provider integration, empirical validation, and production calibration are separate states.
3. Findings closed: F-001, F-002, F-003, F-004 truth-source portions, F-005.
4. Dependencies: none.
5. Exact likely files: `services/reasoning/src/asset-causality-map/index.ts`, `packages/types/src/market-asset-causality.ts`, `packages/schemas/src/market-asset-causality.schema.ts`, `packages/types/src/market-contradiction-matrix.ts`, `packages/schemas/src/market-contradiction-matrix.schema.ts`, reasoning tests, relevant docs.
6. Prohibited scope: no formulas, no confidence recalibration, no provider activation, no golden anchor changes, no asset removal, no new phase.
7. Required tests: reasoning unit tests for renamed/aliased contracts, schema tests proving pending category semantics, DXY/VIX taxonomy tests.
8. Validation commands: `npm run -w @elceo/reasoning lint`, `npm run typecheck`, `npm run test`, `npm run build`.
9. Merge blockers: any runtime formula or golden scenario change without explicit approval.
10. Remaining risks: downstream consumers may depend on old names; compatibility alias may be required.
11. External credentials/environment required: no.

## RC-B — Persistence consistency and SQL client lifecycle

1. Batch ID: RC-B.
2. Exact goal: make commercial social identifiers and super-admin commercial controls use durable, consistent repository reads/writes in SQL mode and safe DB pool lifecycle.
3. Findings closed: F-012, F-014, F-015 pool defect.
4. Dependencies: RC-A not required, but recommended first for truth-source clarity.
5. Exact likely files: `apps/web/lib/server/profile/social-identifiers-store.ts`, `services/application-state/src/super-admin-commercial-controls/index.ts`, commercial persistence repository files, `infra/db/schema/0035_user_social_identifiers.sql`, `infra/db/schema/0036_super_admin_commercial_controls.sql`, route/service tests.
6. Prohibited scope: no payment activation, no entitlement policy changes beyond fixing durable reads, no route redesign, no 2FA provider activation.
7. Required tests: SQL-mode gift create/retract/snapshot/evaluate lifecycle; restart/multi-instance simulation by clearing maps; duplicate active gift/idempotency tests; social identifier query failure pool cleanup test; missing-row behavior test.
8. Validation commands: `npm run typecheck`, `npm run test`, `npm run check:migrations`, `npm run build`.
9. Merge blockers: any SQL-mode snapshot reporting durable while reading only process memory; any retraction path that cannot retract SQL-created gifts.
10. Remaining risks: true multi-instance validation may require integration DB.
11. External credentials/environment required: no for unit/integration with local test DB or mocks; yes only for managed staging DB rehearsal.

## RC-C — Step-up and commercial mutation durability

1. Batch ID: RC-C.
2. Exact goal: make step-up challenge, attempts, replay, lockout, freshness, audit, and commercial mutation consumption durable and bound to actor/action/scope/target.
3. Findings closed: F-013, F-016 commercial-sensitive portions.
4. Dependencies: RC-B.
5. Exact likely files: `services/application-state/src/super-admin-commercial-controls/index.ts`, `services/application-state/src/persistence/security-runtime-repository.ts`, `infra/db/schema/0037_super_admin_step_up_challenges.sql`, admin security step-up routes, admin commercial mutation routes, tests.
6. Prohibited scope: no real provider activation unless explicitly separately approved; no payments/notifications activation.
7. Required tests: durable challenge create/verify/replay; restart and horizontal-instance simulations; max attempts/lockout; freshness expiry; actor/action/scope/target mismatch; audit persistence.
8. Validation commands: `npm run typecheck`, `npm run test`, `npm run security:gate`, `npm run build`.
9. Merge blockers: fixture-only proof accepted outside test/fixture mode; user-supplied freshness object bypassing durable challenge state.
10. Remaining risks: production provider selection remains open.
11. External credentials/environment required: no for durable fixture/security tests; yes for real TOTP/WebAuthn/email provider activation.

## RC-D — Exhaustive route, ownership, and entitlement closure

1. Batch ID: RC-D.
2. Exact goal: enumerate every `apps/web/app/api/**/route.ts` handler and close auth/internal-token/role/commercial/owner/rate/audit/validation/test gaps.
3. Findings closed: F-017.
4. Dependencies: RC-B and RC-C for commercial and step-up correctness.
5. Exact likely files: `apps/web/app/api/**/route.ts`, `apps/web/lib/server/auth`, `apps/web/lib/server/security`, `docs/route-entitlement-enforcement-map.md`, route runtime tests.
6. Prohibited scope: no feature redesign, no entitlement behavior changes beyond enforcing intended requirements, no provider activation.
7. Required tests: generated route inventory snapshot; per-family route tests for auth, ownership, target-user boundaries, restriction-first behavior, entitlement walls, internal token enforcement, rate/idempotency/audit ordering.
8. Validation commands: `npm run -w apps/web lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run security:gate`.
9. Merge blockers: internal mutation route without internal token; side effects before role/security decision; commercial route without ownership/entitlement where required.
10. Remaining risks: external auth provider behavior may require staging verification.
11. External credentials/environment required: no for static/route tests; yes for deployed auth smoke.

## RC-E — Provider orchestration hardening

1. Batch ID: RC-E.
2. Exact goal: convert provider orchestration from fixture/dry-run-safe to operationally robust staging-ready behavior without activating live providers by default.
3. Findings closed: F-008 code-hardening portions, F-009, F-010.
4. Dependencies: RC-D recommended so admin/internal ingestion routes are enforceably safe.
5. Exact likely files: `services/reasoning/src/scheduled-ingestion/*`, `services/ingestion/src/scheduler/*`, `packages/providers/*`, provider source adapters, scheduled-ingestion API routes, operator inspection routes, persistence repositories.
6. Prohibited scope: no live credentials, no legal approval claims, no formula recalibration.
7. Required tests: retry worker claim/restart/concurrency; exponential/jittered backoff if selected; replay idempotency; malformed response; payload size; duplicate response; quota/rate accounting; circuit breaker and stale-if-error tests.
8. Validation commands: `npm run typecheck`, `npm run test`, `npm run -w @elceo/reasoning lint`, `npm run build`, `npm run security:gate`.
9. Merge blockers: non-idempotent retry side effects; live provider calls enabled by default.
10. Remaining risks: official live response variance remains unverified until RC-G.
11. External credentials/environment required: no for hardening tests; yes for live provider smoke.

## RC-F — Migration and infrastructure verification

1. Batch ID: RC-F.
2. Exact goal: remove or prove harmless migration-order ambiguity and verify infra/security gates against a clean database rehearsal.
3. Findings closed: F-018 and migration portions of F-019.
4. Dependencies: RC-B/RC-C/RC-E if they add migrations.
5. Exact likely files: `infra/db/schema/*`, migration checker scripts, deployment runbook docs, CI/gate scripts.
6. Prohibited scope: no destructive migration without rehearsal and rollback; no silent renumbering without migration-state strategy.
7. Required tests: duplicate-prefix checker; clean apply; repeat apply/idempotency; rollback/rehearsal notes; repository references to table/column presence.
8. Validation commands: `npm run check:migrations`, `npm run check:infra-security`, `npm run release:gate`, `npm run build`.
9. Merge blockers: ambiguous duplicate prefix left unresolved without documented runner proof; migration expecting missing table/column.
10. Remaining risks: managed production migration state may differ from local rehearsal.
11. External credentials/environment required: no for local rehearsal; yes for staging/prod rehearsal.

## RC-G — Staging/production operational validation

1. Batch ID: RC-G.
2. Exact goal: verify external provider, payment, notification, smoke, attack drill, WAF, monitoring, backup/restore, rollback, and public-claim boundaries in actual environments.
3. Findings closed: F-006 live portions, F-007 empirical prerequisite tracking, F-008 live portions, F-011, F-016 live portions, F-019.
4. Dependencies: RC-A through RC-F.
5. Exact likely files: docs/runbooks/checklists, provider readiness docs, smoke/attack scripts, environment documentation; code only if validation exposes defects.
6. Prohibited scope: no postponed intelligence features; no recalibration until empirical data is captured and reviewed; no unapproved live provider/payment/notification activation.
7. Required tests: `npm run smoke:production`, `npm run attack-drill:staging`, live provider smoke/replay, payment sandbox webhook raw-body verification, notification live send smoke, backup/restore drill, rollback drill, monitoring alert tests.
8. Validation commands: `npm run smoke:production`, `npm run attack-drill:staging`, `npm run security:gate`, `npm run release:gate` plus provider/payment/notification smoke commands approved for the target environment.
9. Merge blockers: missing required env/tokens; live provider schema mismatch; raw-body webhook verification failure; attack drill failure; backup/restore failure.
10. Remaining risks: external provider outages and terms changes.
11. External credentials/environment required: yes.

## RC-H — Final full-repository closure

1. Batch ID: RC-H.
2. Exact goal: reconcile all truth sources, registers, production-readiness claims, route maps, provider readiness, and validation artifacts after RC-A through RC-G.
3. Findings closed: remaining documentation-only and environment-verification entries once evidence exists.
4. Dependencies: RC-A through RC-G complete.
5. Exact likely files: `docs/backend-open-loop-register.md`, `docs/final-production-status-report.md`, `docs/production-readiness-checklist.md`, `docs/final-backend-foundation-readiness-review.md`, `docs/backend-foundation-completion-map.md`, `docs/route-entitlement-enforcement-map.md`, `docs/provider-live-activation-readiness.md`, `docs/deployment-runbook.md`, `docs/observability-security-final-review-checklist.md`.
6. Prohibited scope: no runtime implementation, no new C6-R phase, no postponed intelligence features.
7. Required tests: full validation suite and documentation consistency checks.
8. Validation commands: `npm install`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run -w @elceo/reasoning lint`, `npm run -w apps/web lint`, `npm run check:migrations`, `npm run check:c5-readiness`, `npm run check:infra-security`, `npm run security:gate`, `npm run release:gate`, `git diff --check`.
9. Merge blockers: any production claim without code/runtime/environment evidence.
10. Remaining risks: future provider/API changes after validation.
11. External credentials/environment required: yes for final staging/prod validation evidence.
