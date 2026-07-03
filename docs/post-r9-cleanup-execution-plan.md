# Post-R9 Cleanup Execution Plan

This plan is derived from proven and strongly indicated findings in `docs/post-r9-repository-closure-audit.md`. It does not define a new C6-R phase, C6-R9H, C6-R10, or any postponed intelligence feature.

## Blocker-scope rule for this plan

A finding labeled `merge_blocking` or `pre_staging_blocking` in the audit describes product/runtime risk. Existing runtime defects do **not** block merging this documentation-only audit PR when the audit is accurate. They block the relevant future runtime implementation PR, staging activation, and/or production activation as stated per batch.

## RC-A — Truth-source and contract corrections

1. Batch ID: RC-A.
2. Exact goal: clarify reasoning completion contracts so descriptor-shape validity, deterministic foundation completion, live provider integration, empirical validation, and production calibration are separate states.
3. Findings closed: F-001, F-002, F-003, F-005 documentation/taxonomy portions.
4. Dependencies: none.
5. Exact likely files: `services/reasoning/src/asset-causality-map/index.ts`, `packages/types/src/market-asset-causality.ts`, `packages/schemas/src/market-asset-causality.schema.ts`, `packages/types/src/market-contradiction-matrix.ts`, `packages/schemas/src/market-contradiction-matrix.schema.ts`, `packages/types/src/provider-source-registry.ts`, `services/reasoning/src/tests/asset-causality-map.test.ts`, `services/reasoning/src/tests/contradiction-matrix.test.ts`, relevant docs.
6. Prohibited scope: no formulas, no confidence recalibration, no provider activation, no golden anchor changes, no asset removal, no new phase.
7. Required tests: reasoning unit tests for renamed/aliased contracts, schema tests proving pending category semantics, DXY/VIX taxonomy tests.
8. Validation commands: `npm run -w @elceo/reasoning lint`, `npm run typecheck`, `npm run test`, `npm run build`.
9. Merge blockers: any runtime formula or golden scenario change without explicit approval.
10. Remaining risks: downstream consumers may depend on old names; compatibility alias may be required.
11. External credentials/environment required: no.
12. Blocker scope: documentation-only audit PR not blocked; future RC-A runtime/docs PR blocked if it changes formulas or phase scope.

## RC-B1 — Step-up trust-boundary correction for commercial mutations

1. Batch ID: RC-B1.
2. Exact goal: make commercial mutation routes reject client-forged step-up verification and resolve/consume server-side challenge state.
3. Findings closed: F-020.
4. Dependencies: RC-A not required; this is the first runtime security correction.
5. Exact likely files: `apps/web/app/api/admin/commercial/users/[userId]/gift-focus-plan/route.ts`, `apps/web/app/api/admin/commercial/users/[userId]/retract-focus-gift/route.ts`, `apps/web/app/api/admin/commercial/users/[userId]/restrict/route.ts`, `services/application-state/src/super-admin-commercial-controls/index.ts`, `packages/schemas/src/super-admin-commercial-controls.schema.ts`, `infra/db/schema/0037_super_admin_step_up_challenges.sql`, admin route tests.
6. Prohibited scope: no payment activation, no entitlement behavior expansion, no UI, no real provider activation unless separately approved.
7. Required tests: forged `status: verified` with `challengeId: null` rejected; server challenge lookup required; verified/fresh/single-use challenge consumed; actor/action/route-scope/target mismatch rejected; cross-action and cross-target reuse rejected; null challenge IDs cannot pass.
8. Validation commands: `npm run typecheck`, `npm run test`, `npm run security:gate`, `npm run build`.
9. Merge blockers: any commercial mutation accepting client-supplied verified status without server-side challenge resolution.
10. Remaining risks: durable multi-instance storage may still need RC-B2 if not completed here.
11. External credentials/environment required: no.
12. Blocker scope: does not block this documentation-only audit PR; blocks the future runtime security PR until fixed; blocks commercial-control staging activation; blocks production activation.

## RC-B2 — Step-up durability and commercial mutation state

1. Batch ID: RC-B2.
2. Exact goal: make step-up challenge, attempts, replay, lockout, freshness, audit, and commercial mutation consumption durable across restarts and multiple instances.
3. Findings closed: F-013 and durable challenge/replay/freshness portions related to F-020.
4. Dependencies: RC-B1.
5. Exact likely files: `services/application-state/src/super-admin-commercial-controls/index.ts`, `services/application-state/src/persistence/security-runtime-repository.ts`, `infra/db/schema/0037_super_admin_step_up_challenges.sql`, `apps/web/app/api/admin/security/step-up/challenge/route.ts`, `apps/web/app/api/admin/security/step-up/verify/route.ts`, tests.
6. Prohibited scope: no real provider activation unless separately approved; no payments/notifications activation.
7. Required tests: durable challenge create/verify/replay; restart and horizontal-instance simulations; max attempts/lockout; freshness expiry; audit persistence.
8. Validation commands: `npm run typecheck`, `npm run test`, `npm run security:gate`, `npm run build`.
9. Merge blockers: fixture-only proof accepted outside test/fixture mode; replay/lockout/freshness stored only in process memory after batch.
10. Remaining risks: production provider selection remains open.
11. External credentials/environment required: no for durable fixture/security tests; yes for real TOTP/WebAuthn/email provider activation.
12. Blocker scope: future runtime implementation PR and staging activation blocked if process-local state remains authoritative.

## RC-C — Persistence consistency and SQL client lifecycle

1. Batch ID: RC-C.
2. Exact goal: make commercial social identifiers and super-admin commercial controls use durable, consistent repository reads/writes in SQL mode and safe DB pool lifecycle.
3. Findings closed: F-012, F-014, and F-015 persistence/readiness portions; external social-ownership verification policy remains undecided unless approved later.
4. Dependencies: RC-B1 for trust boundary; RC-B2 if durable step-up is kept separate.
5. Exact likely files: `apps/web/lib/server/profile/social-identifiers-store.ts`, `services/application-state/src/super-admin-commercial-controls/index.ts`, `services/application-state/src/persistence/security-runtime-repository.ts`, `infra/db/schema/0035_user_social_identifiers.sql`, `infra/db/schema/0036_super_admin_commercial_controls.sql`, route/service tests.
6. Prohibited scope: no payment activation, no entitlement policy changes beyond fixing durable reads, no route redesign, no 2FA provider activation.
7. Required tests: SQL-mode gift create/retract/snapshot/evaluate lifecycle; restart/multi-instance simulation by clearing maps; duplicate active gift/idempotency tests; social identifier query failure pool cleanup test; missing-row behavior test; authenticated subject can only read/write own social identifiers.
8. Validation commands: `npm run typecheck`, `npm run test`, `npm run check:migrations`, `npm run build`.
9. Merge blockers: any SQL-mode snapshot reporting durable while reading only process memory; any retraction path that cannot retract SQL-created gifts.
10. Remaining risks: true multi-instance validation may require integration DB.
11. External credentials/environment required: no for unit/integration with local test DB or mocks; yes only for managed staging DB rehearsal.
12. Blocker scope: documentation-only audit PR not blocked; future runtime persistence PR and commercial staging activation blocked until fixed.

## RC-D — Structured issuer/region/currency inference correctness

1. Batch ID: RC-D.
2. Exact goal: replace broad substring/provider-ID/default inference with structured issuer, region, and currency metadata precedence plus explicit uncertainty warnings.
3. Findings closed: F-004.
4. Dependencies: RC-A recommended so truth-source terminology is stable.
5. Exact likely files: `services/reasoning/src/asset-direction-resolution/index.ts`, `services/reasoning/src/golden-scenarios/index.ts`, `services/reasoning/src/fx-relative-strength/index.ts`, `packages/types/src/market-asset-direction-resolution.ts`, `packages/schemas/src/market-asset-direction-resolution.schema.ts`, relevant reasoning tests.
6. Prohibited scope: no confidence recalibration, no golden anchor changes, no provider activation, no asset removal.
7. Required tests: adversarial substring cases (`us` in unrelated words), provider-ID-only ambiguity, non-Fed issuer/currency ambiguity, structured metadata precedence, duplicate issuer vocabulary regression tests.
8. Validation commands: `npm run -w @elceo/reasoning lint`, `npm run typecheck`, `npm run test`, `npm run build`.
9. Merge blockers: new inference from titles/raw JSON when structured metadata is absent without warning.
10. Remaining risks: live provider payload metadata may reveal additional cases in provider validation batches.
11. External credentials/environment required: no.
12. Blocker scope: future reasoning correctness PR blocked if runtime inference risk remains unassigned.

## RC-E — Exhaustive route, ownership, and entitlement closure

1. Batch ID: RC-E.
2. Exact goal: close gaps identified by the 145-route matrix and keep route map documentation synchronized with live handlers.
3. Findings closed: F-017 and route parts of F-020 after RC-B1.
4. Dependencies: RC-B1, RC-C.
5. Exact likely files: all route files enumerated in the audit route matrix, `apps/web/lib/server/auth.ts`, `apps/web/lib/server/security.ts`, `docs/route-entitlement-enforcement-map.md`, route runtime tests.
6. Prohibited scope: no feature redesign, no entitlement behavior changes beyond enforcing intended requirements, no provider activation.
7. Required tests: generated route inventory snapshot; per-family route tests for auth, ownership, target-user boundaries, restriction-first behavior, entitlement walls, internal token enforcement, rate/idempotency/audit ordering.
8. Validation commands: `npm run -w apps/web lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run security:gate`.
9. Merge blockers: internal mutation route without internal token; side effects before role/security decision; commercial route trusting client step-up.
10. Remaining risks: external auth provider behavior may require staging verification.
11. External credentials/environment required: no for static/route tests; yes for deployed auth smoke.
12. Blocker scope: staging activation blocked until gap-found routes are closed or explicitly disabled.

## RC-F — Provider orchestration hardening

1. Batch ID: RC-F.
2. Exact goal: convert provider orchestration from fixture/dry-run-safe to operationally robust staging-ready behavior without activating live providers by default, and establish the future ELCEO Provider API Gate boundary, including canonical source ID, provider/capability ID, adapter ID, capability translation, runtime resolver, and activation mode.
3. Findings closed: F-008 code-hardening portions, F-009, F-010.
4. Dependencies: RC-E recommended so admin/internal ingestion routes are enforceably safe.
5. Exact likely files: `services/reasoning/src/scheduled-ingestion/retry-policy.ts`, `services/reasoning/src/scheduled-ingestion/scheduled-ingestion-service.ts`, `services/ingestion/src/scheduler/lease-repository.ts`, `services/ingestion/src/scheduler/index.ts`, `packages/providers/src/index.ts`, provider source adapter files listed in the provider matrix, scheduled-ingestion API routes, operator inspection routes, persistence repositories.
6. Prohibited scope: no live credentials, no legal approval claims, no formula recalibration.
7. Required tests: retry worker claim/restart/concurrency; exponential/jittered backoff if selected; replay idempotency; malformed response; payload size; duplicate response; quota/rate accounting; circuit breaker and stale-if-error tests; API Gate tests for canonical source ID, provider/capability ID, adapter ID, capability translation, runtime resolver, activation mode, normalized capability requests, caching, request deduplication, request coalescing, quotas, cost budgets, rate-limit accounting, retries/jitter, circuit breakers, concurrency limits, provider selection, explicit fallback, response validation, provenance, secrets, and observability.
8. Validation commands: `npm run typecheck`, `npm run test`, `npm run -w @elceo/reasoning lint`, `npm run build`, `npm run security:gate`.
9. Merge blockers: non-idempotent retry side effects; live provider calls enabled by default.
10. Remaining risks: official live response variance remains unverified until RC-H; after the API Gate is implemented, no feature or reasoning service may make an unmanaged direct third-party provider call.
11. External credentials/environment required: no for hardening tests; yes for live provider smoke.
12. Blocker scope: production activation blocked until provider protections are proven.

## RC-G — Migration and database rehearsal

1. Batch ID: RC-G.
2. Exact goal: reconcile migration readiness, preserve deterministic full-filename ordering, and rehearse clean/repeat application without unsafe renumbering.
3. Findings closed: F-018 and database portions of F-019.
4. Dependencies: RC-C/RC-B2/RC-F if they add migrations.
5. Exact likely files: `scripts/check-db-migrations.mjs`, `docs/db-migration-readiness-checklist.md`, `infra/db/schema/*.sql`, deployment runbook docs, CI/gate scripts.
6. Prohibited scope: no renumbering without migration-state strategy; no destructive migration without rehearsal and rollback.
7. Required tests: duplicate-prefix checker; clean apply; repeat apply/idempotency; rollback/rehearsal notes; repository references to table/column presence.
8. Validation commands: `npm run check:migrations`, `npm run check:infra-security`, `npm run release:gate`, `npm run build`.
9. Merge blockers: any new migration-order tool that keys only by numeric prefix; migration expecting missing table/column.
10. Remaining risks: managed production migration state may differ from local rehearsal.
11. External credentials/environment required: no for local rehearsal; yes for staging/prod rehearsal.
12. Blocker scope: production activation blocked until staging rehearsal succeeds.

## RC-H — Provider live-payload and schema validation

1. Batch ID: RC-H.
2. Exact goal: validate official/current provider payloads, schemas, pagination, nullable fields, timestamps, duplicate IDs, revisions, rate-limit bodies, and backfills in staging without enabling production by default.
3. Findings closed: F-006 live portions, F-008 live portions, F-011.
4. Dependencies: RC-F and RC-G.
5. Exact likely files: provider adapters/source descriptors from the provider matrix, `docs/provider-live-activation-readiness.md`, provider replay/smoke scripts, captured fixture/replay docs.
6. Prohibited scope: no public production claims, no formula recalibration, no unapproved provider activation.
7. Required tests: live provider smoke/replay per source; schema validation against captured payloads; rate-limit/error body tests; duplicate/revision/backfill handling.
8. Validation commands: provider smoke/replay commands approved for staging, `npm run test`, `npm run security:gate`, `npm run release:gate`.
9. Merge blockers: official payload schema mismatch, unhandled provider error body, unbounded rate-limit exposure.
10. Remaining risks: provider API changes after validation.
11. External credentials/environment required: yes.
12. Blocker scope: production provider activation blocked until complete.

## RC-I1 — Payment correctness and resilience implementation

1. Batch ID: RC-I1.
2. Exact goal: implement the local payment correctness boundary before external sandbox validation. Invariant: one genuine customer payment intention may create at most one provider charge and exactly one local billing, ledger, and entitlement effect.
3. Findings closed: F-016 local payment correctness portions.
4. Dependencies: RC-B1, RC-B2, RC-C, RC-E.
5. Exact likely files: `apps/web/app/api/billing/checkout/route.ts`, `apps/web/app/api/billing/webhook/route.ts`, `apps/web/app/api/internal/billing/reconcile/route.ts`, billing persistence repositories, payment-provider boundary migrations/repositories, entitlement transition services, ledger/audit services, billing tests.
6. Prohibited scope: no production-live payment activation, no notification provider implementation, no referral/affiliate implementation.
7. Required tests: rapid double click; same request sent concurrently; retry with same idempotency key; timeout before provider response; provider success response lost; disconnect during redirect; webhook before redirect; duplicate webhook; out-of-order webhook; concurrent webhook and reconciliation; process restart during payment; database failure after provider success; provider 500 after accepting request; retry after unknown result; duplicate provider event ID; duplicate provider reference; refund and chargeback; one payment grants entitlement exactly once.
8. Validation commands: `npm run typecheck`, `npm run test`, `npm run security:gate`, `npm run build`.
9. Merge blockers: any path that creates a new provider charge for an operation whose outcome is `processing`, `unknown`, or `reconciliation_required`; any non-idempotent entitlement, ledger, or billing effect.
10. Remaining risks: provider-specific sandbox/live behavior remains unverified until RC-I2.
11. External credentials/environment required: no for local correctness tests; yes only for later provider validation.
12. Blocker scope: does not block this documentation-only audit PR; blocks payment staging activation and any future payment runtime PR until exactly-once local effects and unknown-outcome handling are implemented.

Required architecture: durable payment operations must include immutable internal operation ID, provider idempotency key, subject/user ID, target plan, amount/currency, provider, current state, provider references, version, timestamps, and reconciliation state. Unique constraints must cover internal payment operation, provider payment reference, provider event ID, invoice/subscription transition, and business idempotency key. Legal monotonic states include `created` -> `pending_provider` -> `processing` -> `succeeded | failed | expired | cancelled`, plus explicit `unknown`, `reconciliation_required`, `refunded`, `partially_refunded`, `reversed`, and `chargeback`. Timeouts, disconnects, and lost responses must record unknown/reconciliation state, reuse the same provider idempotency key, query the provider using existing references, and wait for signed webhook or reconciliation rather than charging again. Provider events must be persisted in a deduplicating inbox and processed in a DB transaction with payment state, immutable ledger, entitlement transition, and outbox event. Row/advisory/optimistic locking must prevent split-brain between webhooks, polling, reconciliation, retries, and multiple app instances. Operators need lookup, provider/local comparison, reconciliation trigger, duplicate-charge alert, unknown-operation queue, safe retry, refund/reversal visibility, and immutable audit.

## RC-I2 — Payment provider sandbox/end-to-end validation

1. Batch ID: RC-I2.
2. Exact goal: validate real payment-provider sandbox behavior after RC-I1 local correctness exists.
3. Findings closed: F-016 payment provider validation portions.
4. Dependencies: RC-I1.
5. Exact likely files: payment runbooks, `apps/web/app/api/billing/checkout/route.ts`, `apps/web/app/api/billing/webhook/route.ts`, reconciliation routes/services, provider smoke/replay scripts, payment tests.
6. Prohibited scope: no production-live payment activation without separate approval; no notification-provider work.
7. Required tests: checkout; signature verification; unknown outcomes; disconnects; duplicate/out-of-order events; reconciliation; refunds/reversals; exactly-once entitlement effects.
8. Validation commands: approved payment sandbox smoke/replay commands, `npm run test`, `npm run security:gate`, `npm run release:gate`.
9. Merge blockers: webhook signature bypass, non-idempotent entitlement mutation, duplicate charge on retry, inability to reconcile provider/local split-brain.
10. Remaining risks: sandbox/live differences and provider API changes after validation.
11. External credentials/environment required: yes.
12. Blocker scope: blocks payment staging/production activation until complete.

## RC-I3 — Notification durability and sandbox/end-to-end validation

1. Batch ID: RC-I3.
2. Exact goal: separately close notification durability and provider validation without coupling it to payment correctness.
3. Findings closed: F-016 notification portions.
4. Dependencies: RC-C and RC-E; RC-I1 not required unless notification is triggered by payment effects.
5. Exact likely files: `services/notifications/src/index.ts`, `services/notifications/src/policy.ts`, `infra/db/schema/0011_notification_decisions.sql`, `infra/db/schema/0012_notification_delivery_outbox.sql`, `infra/db/schema/0013_notification_targets_and_inbox.sql`, notification routes, notification runbooks/tests.
6. Prohibited scope: no payment provider activation, no production-live notification activation without separate approval.
7. Required tests: notification outbox; provider dispatch; retries; receipts; dead-letter/exhausted state; unsubscribe/disable; operator inspection.
8. Validation commands: approved notification sandbox smoke/replay commands, `npm run test`, `npm run security:gate`, `npm run release:gate`.
9. Merge blockers: notification outbox loss without operator visibility; missing unsubscribe/disable enforcement; non-idempotent provider dispatch.
10. Remaining risks: provider-specific sandbox/live differences.
11. External credentials/environment required: yes.
12. Blocker scope: blocks notification staging/production activation until complete.

## RC-J — Infrastructure, security, and disaster-recovery validation

1. Batch ID: RC-J.
2. Exact goal: verify WAF, monitoring, alerting, backup/restore, rollback, attack drill, deployment promotion, and staging isolation.
3. Findings closed: F-019 and operational validation portions from F-006/F-008/F-016.
4. Dependencies: RC-G, RC-H, RC-I1, RC-I2, and RC-I3 as applicable.
5. Exact likely files: `docs/deployment-runbook.md`, `docs/observability-security-final-review-checklist.md`, `.github/workflows/*`, smoke/attack scripts, infra/security runbooks.
6. Prohibited scope: no runtime feature changes unless validation exposes a defect requiring a separate implementation PR.
7. Required tests: WAF/rate-limit drill, monitoring alert test, backup restore rehearsal, rollback drill, `npm run attack-drill:staging`, staging isolation verification.
8. Validation commands: `npm run attack-drill:staging`, `npm run smoke:production` against staging/target URL when configured, `npm run security:gate`, `npm run release:gate`.
9. Merge blockers: failed attack drill, missing backup restore proof, missing rollback proof, missing staging isolation.
10. Remaining risks: vendor outages and post-validation drift.
11. External credentials/environment required: yes.
12. Blocker scope: production activation blocked until complete.

## RC-K — Final full-repository closure

1. Batch ID: RC-K.
2. Exact goal: reconcile all truth sources, registers, production-readiness claims, route maps, provider readiness, and validation artifacts after RC-A through RC-J, including RC-I1/RC-I2/RC-I3.
3. Findings closed: remaining documentation-only and environment-verification entries once evidence exists.
4. Dependencies: RC-A, RC-B1, RC-B2, RC-C, RC-D, RC-E, RC-F, RC-G, RC-H, RC-I1, RC-I2, RC-I3, and RC-J complete.
5. Exact likely files: `docs/backend-open-loop-register.md`, `docs/final-production-status-report.md`, `docs/production-readiness-checklist.md`, `docs/final-backend-foundation-readiness-review.md`, `docs/backend-foundation-completion-map.md`, `docs/route-entitlement-enforcement-map.md`, `docs/provider-live-activation-readiness.md`, `docs/deployment-runbook.md`, `docs/observability-security-final-review-checklist.md`.
6. Prohibited scope: no runtime implementation, no new C6-R phase, no postponed intelligence features.
7. Required tests: full validation suite and documentation consistency checks.
8. Validation commands: `npm install`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run -w @elceo/reasoning lint`, `npm run -w apps/web lint`, `npm run check:migrations`, `npm run check:c5-readiness`, `npm run check:infra-security`, `npm run security:gate`, `npm run release:gate`, `git diff --check`.
9. Merge blockers: any production claim without code/runtime/environment evidence.
10. Remaining risks: future provider/API changes after validation.
11. External credentials/environment required: yes for final staging/prod validation evidence.
12. Blocker scope: final production claim blocked until all prior evidence exists.

## Final roadmap order guardrails

- The seven postponed intelligence features remain deferred until repository cleanup and full closure are complete: Expectation-Reality Delta Engine, Historical Market Memory / Analog Engine, Contradiction-to-Action Protocol, Market Cleanliness Ranking, News Half-Life / Narrative Decay, Crowd Pain / Positioning Stress Map, and Fragility Score.
- The referral/affiliate system remains the final major commercial product implementation after billing correctness, entitlement durability, provider/API Gate closure, analytics, anti-abuse, audit, and legal rules.
- This audit/plan PR does not implement referrals, payment activation, notification activation, provider activation, C6-R9H, C6-R10, or any new reasoning phase.

- RC-C code foundations now include durable commercial repositories, commercial operation idempotency records, consolidated social identifier persistence, and shared SQL pool lifecycle handling. This is code-level foundation only; staging/managed database rehearsal, production activation, live payment readiness, and external social ownership proof remain unclaimed.

## RC-A resolution note (2026-07-03)
RC-A corrects terminology, readiness contracts, and asset taxonomy only. Deterministic R1-R9 reasoning foundations exist; live provider activation remains blocked, empirical validation remains pending, and production calibration remains pending. DXY and VIX are reasoning diagnostic assets, not launch-tradable instruments. No reasoning formula, confidence arithmetic, provider activation, or golden-scenario anchor changed in RC-A. RC-D remains the next reasoning-correctness batch and will address structured issuer/region/currency inference.

## RC-A current truth source (2026-07-03)
- Current status: deterministic R1-R9 foundations are implemented and reported through the canonical readiness contract.
- Current status: live provider activation remains blocked; empirical validation and production calibration remain pending.
- Asset taxonomy: DXY and VIX are reasoning diagnostics only; the launch-tradable set remains the 12 `TRADING_ASSET_COVERAGE` instruments.
- RC-A scope: terminology, readiness-contract, and taxonomy correction only; no formula, provider activation, or golden-anchor changes.
- Next reasoning-correctness dependency: RC-D structured issuer/region/currency inference.
