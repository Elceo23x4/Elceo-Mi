# Post-R9 Repository Closure Audit

## 1. Audit metadata and baseline SHA

- Repository path: `/workspace/Elceo-Mi`.
- Requested repository: `Elceo23x4/Elceo-Mi`.
- Requested baseline branch: `main`.
- Expected baseline commit: `0a3c389945dc6c41bb36cb77862a09910bb03172`.
- Baseline validation commands attempted before work: `git checkout main` failed because the local clone initially had only `work`; `git fetch origin main` failed because no `origin` remote is configured; `git checkout -B main` then anchored the local `main` name at `0a3c389945dc6c41bb36cb77862a09910bb03172`; `git checkout -B codex/post-r9-repository-closure-audit` created the audit branch from that SHA.
- Actual audited baseline SHA: `0a3c389945dc6c41bb36cb77862a09910bb03172`.
- Audit branch: `codex/post-r9-repository-closure-audit`.
- Scope discipline: audit/planning only. Runtime code, schemas, tests, migrations, UI, readiness checkboxes, providers, credentials, entitlements, authentication, confidence formulas, anchors, penalties, and golden scenarios were not changed.
- Permitted files created: `docs/post-r9-repository-closure-audit.md`, `docs/post-r9-cleanup-execution-plan.md`.

## 2. Executive conclusion

The C6-R0 through C6-R9 deterministic reasoning foundations are present, but repository closure is not complete. This reconciled audit now contains the completed 145-route matrix, corrected provider-by-provider matrix, corrected root migration inventory, actual emitted confidence traces, and a single findings sequence including F-020. The most important real defects are operational, trust-boundary, persistence, and durability defects rather than deterministic engine defects:

1. **Client-supplied step-up verification is a verified trust-boundary defect.** Sensitive super-admin commercial mutation routes accept body-supplied `status: "verified"` without requiring server-side challenge resolution, freshness, single-use consumption, or actor/action/scope/target binding. This requires internal access plus `admin.ops`; it is not an unauthenticated public bypass. It does not block this documentation-only audit PR, but it blocks commercial-control staging activation and is the first runtime security correction.
2. **Commercial SQL/memory split is a verified defect.** SQL gift creation returns after insert without updating the process-local gift map, gift retraction checks the map before issuing SQL, and snapshots report `durable` while reading maps. This is reachable when `APP_STATE_REPOSITORY=sql` and `DATABASE_URL` are configured.
3. **Step-up/2FA durability remains a separate open loop.** Challenge, replay, rate-limit, lockout, and freshness state are process-local maps/sets, and only fixture verification can succeed. This durability issue is distinct from the F-020 request-forgery trust-boundary defect.
4. **Social identifier self-ownership exists, but readiness remains partial.** The current social-identifier route requires an authenticated subject, reads/writes that subject's own identifier, and uses the owner-boundary helper. The pool lifecycle defect belongs only to F-012; external LinkedIn/Telegram/X ownership verification remains a policy/open-loop uncertainty, not a second pool defect.
5. **Route enforcement is now matrix-backed but not fully closed.** The completed matrix covers 145 API route files. Totals are `verified`: 0, `partial`: 140, `gap_found`: 3, `environment_verification_required`: 1, `not_applicable`: 1. The three `gap_found` rows are the step-up commercial mutation routes.
6. **Provider orchestration is adapter-backed but not live-closed.** The corrected provider matrix covers 43 `PROVIDER_SOURCE_IDS` entries and distinguishes direct runtime-wired sources, identifier/capability mismatches, descriptor-only sources, and live activation blockers. Tiingo and CFTC are the only directly scheduled-ingestion-wired sources; semantic adapter names are not counted as source wiring without an explicit resolver/crosswalk.
7. **Migration duplicate prefixes are deterministic under current repository ordering.** `scripts/check-db-migrations.mjs` and the documented plan use complete lexicographic filenames. Duplicate numeric prefixes remain an external-tool/operator compatibility risk and require staging rehearsal; they are not proven ambiguous under current repository execution.
8. **Confidence-floor saturation is preserved with actual traces.** The 33-scenario suite still produces 25 zero-confidence deterministic golden scenarios. Representative traces in this document come from actual emitted runner output; no recalibration was performed.

## 3. Repository inventory

### Top-level inventory

- Applications: 1 (`apps/web`).
- Packages: 7 (`packages/config`, `packages/domain`, `packages/motion`, `packages/providers`, `packages/schemas`, `packages/types`, `packages/ui`).
- Services: 8 (`services/admin-jobs`, `services/analytics`, `services/application-state`, `services/billing`, `services/chart-intelligence`, `services/ingestion`, `services/notifications`, `services/reasoning`).
- API route handlers: 145 files under `apps/web/app/api/**/route.ts`.
- Migration/schema files: 44 files under `infra/db/schema/`, including 38 numbered root migrations (`0001` through `0037` with duplicate `0027` and `0028`) plus 6 table fragments under `infra/db/schema/tables/`.
- Production/readiness documents inspected: `docs/backend-open-loop-register.md`, `docs/final-production-status-report.md`, `docs/production-readiness-checklist.md`, `docs/final-backend-foundation-readiness-review.md`, `docs/backend-foundation-completion-map.md`, `docs/route-entitlement-enforcement-map.md`, `docs/provider-live-activation-readiness.md`, `docs/deployment-runbook.md`, `docs/observability-security-final-review-checklist.md`.
- Open-loop entries: at least 64 checklist-style unchecked items in `docs/backend-open-loop-register.md`, including environment, provider, commercial, notifications, security, migration-prefix, runtime-warning, and production operations entries.

### Route inventory summary

Route families observed in the 145 handlers:

- Account/profile/billing/entitlements/usage.
- Admin audit, billing, commercial, entitlements, market evidence, providers, SEO, step-up, ops, system summary.
- Analytics, app-state, auth, billing, coaching, dashboard.
- Internal billing and market-evidence ingestion.
- Journal, notifications, operations, portfolio, refresh, workspace.

The route map documentation is useful but cannot be treated as proof of exhaustive runtime enforcement by itself; this audit now compares all 145 live handlers in the route matrix and leaves only `partial`, `gap_found`, and `environment_verification_required` rows for follow-up.

### Persistence and repository inventory

- Application-state SQL repositories exist for entitlements, billing lifecycle, billing orchestration, billing policy, security runtime, notification state, and related billing/commercial surfaces.
- Direct SQL client use appears in application-state and the web social-identifier store.
- Super-admin commercial controls use direct process-local maps for gifts, restrictions, step-up challenges, replay proofs, rate buckets, lockouts, and freshness, with partial SQL writes for gifts/restrictions.
- Notification and billing repositories include persistence and idempotency concepts, but outbox/dead-letter/operator replay closure remains partially environmental and partially route/service dependent.

### Provider and ingestion inventory

- Provider-related evidence is extensive: source registries, readiness reports, fixture payloads, dry-run routes, scheduled-ingestion policies, weighted evidence snapshots, normalized evidence, provider reliability weighting, and operator inspection routes.
- Adapter reality is mixed: several providers are represented as shells, fixture sources, or readiness descriptors, while live credentialed execution and current official payload verification are not evidenced in-repo.
- Scheduled ingestion includes retry status and next-retry fields, but the retry policy is linear and metadata-oriented; restart-safe worker claiming/replay execution was not proven.

## 4. Validation baseline

Validation commands run on `codex/conduct-post-c6-r9-repository-audit` after editing only the two audit documents:

- `npm install`: passed with npm `http-proxy` config warning and audit output showing 6 low/moderate vulnerabilities; no install failure.
- `npm run typecheck`: passed.
- `npm run test`: passed.
- `npm run build`: passed with warnings for `jose` Edge Runtime `CompressionStream`/`DecompressionStream` usage and missing `NEXT_PUBLIC_APP_BASE_URL` during static generation.
- `npm run -w @elceo/reasoning lint`: passed.
- `npm run -w apps/web lint`: passed; `next lint` deprecation warning only.
- `npm run check:migrations`: passed but warned about duplicate numeric prefixes `0027` and `0028`.
- `npm run check:c5-readiness`: passed.
- `npm run check:infra-security`: passed.
- `npm run security:gate`: passed.
- `npm run release:gate`: passed; release gate repeated install/typecheck/test/build/lint/migration/security checks and advised production smoke after configuring `ELCEO_SMOKE_BASE_URL`.
- `git checkout -- apps/web/tsconfig.tsbuildinfo || true`: completed to restore generated metadata if present.
- `git diff --check`: passed.
- `git status --short`: only the two permitted audit documents are modified before commit.
- `npm run smoke:production`: skipped because `ELCEO_SMOKE_BASE_URL` is not configured; classified as `environment_verification_required`.
- `npm run attack-drill:staging`: skipped because `ELCEO_STAGING_BASE_URL`/`ATTACK_DRILL_BASE_URL` are not configured; classified as `environment_verification_required`.

## 5. Findings by domain

### F-001 — Asset-causality assertion naming overclaims completion

- Domain: reasoning/truth-source contracts.
- Classification: `stale_truth_source`.
- Severity: `documentation_only`.
- Exact files: `services/reasoning/src/asset-causality-map/index.ts`, `packages/types/src/market-asset-causality.ts`, `packages/schemas/src/market-asset-causality.schema.ts`, `services/reasoning/src/tests/asset-causality-map.test.ts`.
- Exact symbols: `assertMarketAssetCausalityMatrixComplete()`, `assertMarketAssetCausalityMatrixValid()`, `getMarketAssetCausalityCoverageReport()`, `coverageReport.complete`, `PHASE_GAPS`, `knownGaps`, `implementationPhaseDependencies`, `currentCodeCoverage`.
- Current behavior: the assertion builds and schema-validates a descriptor matrix; coverage explicitly returns `complete: false`, records `PHASE_GAPS`, and says R2-R9 engines remain pending.
- Evidence: `assertMarketAssetCausalityMatrixComplete()` returns a validated snapshot rather than proving engine/provider/live readiness; `getMarketAssetCausalityCoverageReport()` returns `complete: false` with notes about pending R2-R9 and no live activation.
- Why it matters: callers and documents may read “Complete” as production/live completion rather than descriptor-shape completeness.
- Reachable runtime: yes through canonical market-intelligence boundary methods, but the risk is semantic overclaim, not a broken runtime path.
- Existing tests: asset-causality tests call the complete assertion.
- Missing tests: no test enforces a non-overclaiming name/contract boundary.
- Dependency/blocker: truth-source rename or alias deprecation only.
- Recommended remediation boundary: add a validity/descriptor-completeness API name, keep compatibility alias if needed, and update docs/tests to distinguish descriptor completeness from engine/provider/live readiness.
- Proposed cleanup batch: RC-A.
- Explicit non-goals: do not alter reasoning formulas, assets, providers, or phase state.
- Confidence: `proven`.

### F-002 — R2-R9 phase-state records are stale/ambiguous after deterministic foundations

- Domain: reasoning/truth-source contracts.
- Classification: `partially_resolved`.
- Severity: `documentation_only`.
- Exact files: `services/reasoning/src/asset-causality-map/index.ts`, `services/reasoning/src/contradiction-matrix/index.ts`, `services/reasoning/src/confidence-calibration/index.ts`, `services/reasoning/src/price-reaction/index.ts`, `packages/schemas/src/market-contradiction-matrix.schema.ts`, `packages/schemas/src/market-confidence-calibration.schema.ts`, `docs/final-production-status-report.md`, `docs/backend-open-loop-register.md`.
- Exact symbols: `PHASE_GAPS`, `pending.confidenceCalibrationR6`, `pending.priceReactionR7`, `pending.providerReliabilityExpansion`, `pending.goldenScenarioExpansion`, `pending.empiricalBacktesting`.
- Current behavior: deterministic foundations for R5/R6/R7/R8/R9 are represented in code/tests, while pending booleans often remain true because they mean live/empirical/provider/golden expansion, not absence of deterministic foundation.
- Evidence: contradiction matrix still requires `confidenceCalibrationR6` true in schema even though confidence calibration is implemented; confidence and price reaction keep provider/golden/empirical pending fields true.
- Why it matters: truth sources confuse deterministic foundation completion with production/live/empirical completion.
- Reachable runtime: yes in returned snapshots/reports.
- Existing tests: tests assert these pending fields remain true.
- Missing tests: no explicit phase-state taxonomy test differentiating deterministic foundation, live provider integration, empirical validation, and production calibration.
- Dependency/blocker: contract semantics cleanup.
- Recommended remediation boundary: replace phase-name booleans with scoped pending categories or add explicit foundation/live/empirical fields without changing formulas.
- Proposed cleanup batch: RC-A.
- Explicit non-goals: do not create C6-R10 or a new reasoning phase.
- Confidence: `strongly_indicated`.

### F-003 — Contradiction pending fields are semantically stale but intentionally conservative

- Domain: reasoning/contracts.
- Classification: `stale_truth_source`.
- Severity: `documentation_only`.
- Exact files: `packages/types/src/market-contradiction-matrix.ts`, `packages/schemas/src/market-contradiction-matrix.schema.ts`, `services/reasoning/src/contradiction-matrix/index.ts`, `services/reasoning/src/tests/contradiction-matrix.test.ts`.
- Exact symbols: `confidenceCalibrationR6`, `priceReactionR7`, `providerReliabilityExpansion`.
- Current behavior: the fields remain `true` and tests require them, despite downstream deterministic engines existing.
- Evidence: type and schema require all three pending fields; tests assert pending state.
- Why it matters: consumers may think deterministic confidence calibration and price reaction are absent.
- Reachable runtime: yes.
- Existing tests: present and currently lock the stale semantics.
- Missing tests: no test that maps these fields to empirical/live provider status rather than deterministic foundation status.
- Dependency/blocker: RC-A contract cleanup.
- Recommended remediation boundary: truth-source-only contract clarification.
- Proposed cleanup batch: RC-A.
- Explicit non-goals: no recalibration and no matrix rule changes.
- Confidence: `proven`.

### F-004 — Issuer and metadata inference remains broad/fragile in some paths

- Domain: reasoning/inference correctness.
- Classification: `partially_resolved`.
- Severity: `correctness_risk`.
- Exact files: `services/reasoning/src/asset-direction-resolution/index.ts`, `services/reasoning/src/golden-scenarios/index.ts`, `services/reasoning/src/fx-relative-strength/index.ts`.
- Exact symbols: `valueIdentifiesFedOrUsd()`, `policyIssuerIsFed()`, `policyIssuerCurrency()`, `includesMeta()`, `inferDriverKindFromEvidenceClassOrMetadata()`, `inferredRegion()`, `inferredCurrency()`.
- Current behavior: some exact-ish issuer checks exist, but raw JSON substring matching, provider-ID-derived region/currency inference, default-to-US behavior, and broad metadata matching remain.
- Evidence: `includesMeta()` stringifies metadata and uses substring matching; golden scenarios infer region/currency from provider IDs and default to U.S./USD.
- Why it matters: false positives can assign economic meaning from substrings, titles, providers, or ambiguous metadata rather than structured fields.
- Reachable runtime: yes in reasoning helper paths and golden-scenario input assembly; production reachability depends on live evidence ingestion paths supplying metadata.
- Existing tests: direction/golden tests exercise representative cases.
- Missing tests: adversarial issuer/substring/provider-id tests.
- Dependency/blocker: structured metadata vocabulary and provider payload verification.
- Recommended remediation boundary: replace broad inference with structured metadata precedence and explicit fallback warnings.
- Proposed cleanup batch: RC-D.
- Explicit non-goals: do not change confidence penalties or golden scenario anchors in this audit.
- Confidence: `strongly_indicated`.

### F-005 — DXY and VIX are diagnostic/reasoning assets, not fully launch-tradable/provider-covered assets

- Domain: asset vocabulary.
- Classification: `partially_resolved`.
- Severity: `documentation_only`.
- Exact files: `packages/types/src/provider-source-registry.ts`, `packages/types/src/market-asset-causality.ts`, `packages/types/src/market-golden-scenarios.ts`, `packages/types/src/market-contradiction-matrix.ts`, `packages/types/src/market-price-reaction.ts`, `services/reasoning/src/asset-causality-map/index.ts`, `services/reasoning/src/golden-scenarios/index.ts`, `services/reasoning/src/crypto-risk-liquidity/index.ts`, `apps/web/lib/server/composition/runtime.ts`.
- Exact symbols/routes/tables: `LaunchAsset`, `TradingAssetCoverage`, `MarketAssetCausalityAsset`, `MarketGoldenScenarioAsset`, `MarketContradictionAsset`, `MarketPriceReactionAsset`.
- Current behavior: DXY and VIX appear in reasoning/diagnostic paths and golden scenarios. Golden-scenario assembly maps DXY/VIX assets to null in weighted evidence and VIX confidence uses diagnostic fallback; tests prevent DXY/VIX from reaching very-high confidence.
- Evidence: golden-scenario code treats DXY/VIX differently in evidence and confidence; crypto/risk/liquidity fixtures include VIX and DXY as asset relevance.
- Why it matters: docs/types must avoid implying they are launch tradable assets with live provider coverage.
- Reachable runtime: yes in reasoning diagnostics and fixtures.
- Existing tests: golden tests cover DXY/VIX diagnostic limits.
- Missing tests: unified vocabulary test proving DXY/VIX support status across frontend/provider/reasoning contracts.
- Dependency/blocker: asset taxonomy cleanup.
- Recommended remediation boundary: document diagnostic vs tradable vs provider-covered states; do not remove DXY/VIX.
- Proposed cleanup batch: RC-A.
- Explicit non-goals: no asset removal.
- Confidence: `proven`.

### F-006 — Provider/source context reaches reasoning in fixtures/canonical paths but live production context remains unproven

- Domain: provider/reasoning runtime.
- Classification: `environment_verification_required`.
- Severity: `pre_production_blocking`.
- Exact files: `services/reasoning/src/golden-scenarios/index.ts`, `services/reasoning/src/provider-reliability/index.ts`, `services/reasoning/src/weighted-evidence-snapshot/index.ts`, `apps/web/app/api/admin/market-evidence/*`, `apps/web/app/api/admin/market-evidence/scheduled-ingestion/dry-run/route.ts`, `apps/web/app/api/admin/market-evidence/scheduled-ingestion/inspection/route.ts`, `apps/web/app/api/admin/market-evidence/scheduled-ingestion/policies/route.ts`, `apps/web/app/api/admin/market-evidence/scheduled-ingestion/replay/route.ts`, `apps/web/app/api/admin/market-evidence/scheduled-ingestion/runs/route.ts`.
- Current behavior: reasoning can consume supplied provider reliability and source context; fixture/golden paths prove sensitivity. Live ingestion-to-frontend payload context requires configured providers and production data.
- Evidence: golden tests mutate provider metadata and confidence changes; production status docs still block live provider activation.
- Why it matters: production cognition claims require live source provenance, not only fixture context.
- Reachable runtime: partially; fixture/admin routes reachable, live provider path gated by env/activation.
- Existing tests: provider reliability and golden scenario tests.
- Missing tests: staging/live payload replay using official provider schemas.
- Dependency/blocker: provider credentials, legal/terms approval, rate limits, staging smoke.
- Recommended remediation boundary: staging verification batch, no formula changes.
- Proposed cleanup batch: RC-H.
- Explicit non-goals: do not activate providers in audit.
- Confidence: `requires_runtime_verification`.

### F-007 — Confidence-floor saturation preserved; future recalibration requires evidence

- Domain: reasoning/confidence.
- Classification: `verified_open_loop`.
- Severity: `pre_production_blocking`.
- Exact files: `services/reasoning/src/golden-scenarios/index.ts`, `services/reasoning/src/tests/golden-scenarios.test.ts`, `services/reasoning/src/confidence-calibration/index.ts`.
- Exact symbols: `runMarketGoldenScenarioSuite()`, `runScenarioConfidenceCalibration()`, `confidenceSupported()`, `diagnosticFallback()`.
- Current behavior: 33 deterministic scenarios exist, VIX uses diagnostic fallback, DXY has diagnostic path penalties, and 25 of 33 deterministic scenarios produce confidence 0 by current sealed calibration.
- Evidence: tests assert exact 33-scenario suite and diagnostic limitations. Representative zero-confidence causes are severe contradiction, missing price confirmation, provider activation gap, missing provider reliability, fixture-only/diagnostic caps, and low evidence coverage.
- Why it matters: confidence 0 saturation may be legitimate under missing live evidence, but production calibration cannot be claimed without empirical data.
- Reachable runtime: yes in golden tests and reasoning boundary; production live data not activated.
- Existing tests: golden scenario tests.
- Missing tests: empirical backtesting and provider-live calibration tests.
- Dependency/blocker: live payload verification and empirical dataset.
- Recommended remediation boundary: evidence collection first; no recalibration in cleanup unless data justifies it.
- Proposed cleanup batch: RC-H.
- Explicit non-goals: do not recalibrate now.
- Confidence: `strongly_indicated`.

### F-008 — Adapter reality is fixture/shell-heavy and live activation remains blocked

- Domain: providers/ingestion.
- Classification: `external_activation_blocker`.
- Severity: `pre_production_blocking`.
- Exact files: `packages/providers/src/index.ts`, `services/ingestion/src/provider.ts`, `services/reasoning/src/provider-source-registry/source-registry.ts`, `services/reasoning/src/provider-reliability/index.ts`, `docs/provider-live-activation-readiness.md`, `docs/backend-open-loop-register.md`.
- Current behavior: registry/source descriptors exist; Tiingo and CFTC are directly scheduled-ingestion-wired, but many other provider-source rows are descriptor-only or identifier/capability mismatches. `PROVIDER_SOURCE_IDS` entries such as `fred_macro`, `federal_reserve_official`, `marketaux_news`, and `newsapi_news` are semantically related to provider/capability IDs or adapter descriptor IDs, but no explicit resolver/crosswalk proves those source IDs are translated into adapter instantiations. Production-live execution, credentials, legal approvals, official-schema live verification, and smoke evidence are absent.
- Evidence: open-loop docs list provider keys, smoke tests, rate limits, response schemas, retries/timeouts/circuit breakers, rollback approval, and legal/terms as unchecked.
- Why it matters: registry presence or semantic name similarity must not be counted as adapter completion, fixture execution, or source wiring without an explicit runtime resolver/crosswalk.
- Reachable runtime: fixture/dry-run paths yes; live paths blocked.
- Existing tests: fixture/smoke-like unit and route tests.
- Missing tests: live staging provider smoke and schema validation.
- Dependency/blocker: credentials and provider activation.
- Recommended remediation boundary: provider activation hardening after persistence/auth route closure.
- Proposed cleanup batch: RC-F/RC-H.
- Explicit non-goals: no live activation in audit.
- Confidence: `proven`.

### F-009 — Scheduled ingestion retry policy is linear metadata; worker claiming/restart safety unproven

- Domain: scheduled ingestion.
- Classification: `verified_open_loop`.
- Severity: `operational_risk`.
- Exact files: `services/reasoning/src/scheduled-ingestion/retry-policy.ts`, `services/reasoning/src/scheduled-ingestion/scheduled-ingestion-service.ts`, `services/ingestion/src/scheduler`, scheduled-ingestion API routes.
- Exact symbols: `computeNextRetryAt()`, `deriveRetryStatus()`, `retryCount`, `nextRetryAt`, `maxRetries`, `retryBackoffSeconds`.
- Current behavior: `computeNextRetryAt()` adds `(retryCount + 1) * retryBackoffSeconds`; no jitter/exponential policy is evident in the helper. Persistence and run records exist, but actual retry execution/worker claiming was not proven.
- Evidence: retry helper implementation is linear; tests assert `retryCount=1`, `backoff=30` results in 60 seconds.
- Why it matters: production ingestion needs replay-safe, restart-safe, rate-limit-aware retries.
- Reachable runtime: scheduled-ingestion service and routes.
- Existing tests: scheduled-ingestion tests.
- Missing tests: crash/restart, concurrent worker, idempotent replay, retry exhaustion.
- Dependency/blocker: ingestion worker design and persistence locking.
- Recommended remediation boundary: provider orchestration batch.
- Proposed cleanup batch: RC-F.
- Explicit non-goals: no retry implementation in audit.
- Confidence: `proven` for linear helper, `requires_runtime_verification` for worker claim behavior.

### F-010 — Operational provider protections are partial

- Domain: providers/ops.
- Classification: `verified_open_loop`.
- Severity: `operational_risk`.
- Exact files: `services/ingestion`, `services/reasoning/src/scheduled-ingestion`, `packages/providers`, provider admin routes, docs runbooks.
- Current behavior: schema validation, dry-run/replay, duplicate decisions, payload inspection, and observability shells exist. Quotas, circuit breakers, request coalescing, stale-if-error, fallback, concurrency limits, live rate-limit accounting, and malformed live response handling are not proven. The Provider API Gate also lacks a canonical source-ID/provider-ID/adapter-ID/capability resolver, so semantic adapter candidates cannot be treated as wired source execution.
- Evidence: open-loop docs still track provider rate limits, retries/timeouts/circuit breakers, and response schema verification.
- Why it matters: production providers can fail or rate-limit unpredictably.
- Reachable runtime: partial in dry-run/admin flows; live external protections unproven.
- Existing tests: fixture/dry-run tests.
- Missing tests: provider failure-mode integration tests.
- Dependency/blocker: provider credentials and staging instrumentation.
- Recommended remediation boundary: RC-F then RC-H.
- Proposed cleanup batch: RC-F.
- Explicit non-goals: no provider activation in audit.
- Confidence: `strongly_indicated`.

### F-011 — Live payload verification has not been proven

- Domain: providers/production data.
- Classification: `environment_verification_required`.
- Severity: `pre_production_blocking`.
- Exact files: `docs/provider-live-activation-readiness.md`, provider adapters/registries, ingestion routes.
- Current behavior: official current provider schemas, nullable fields, pagination, time zones, revisions, rate-limit bodies, duplicate IDs, and historical backfills require live or staging verification.
- Evidence: open-loop docs leave response schema verification and provider smoke tests unchecked.
- Why it matters: fixture validation does not prove live compatibility.
- Reachable runtime: only with credentials and activation.
- Existing tests: fixture schemas.
- Missing tests: staging/live payload capture and replay.
- Dependency/blocker: external provider environments.
- Recommended remediation boundary: RC-H.
- Proposed cleanup batch: RC-H.
- Explicit non-goals: no live calls in audit.
- Confidence: `requires_runtime_verification`.

### F-012 — PostgreSQL connection lifecycle is inconsistent; social identifiers create per-query pools

- Domain: persistence.
- Classification: `verified_defect`.
- Severity: `operational_risk`.
- Exact files: `apps/web/lib/server/profile/social-identifiers-store.ts`, application-state DB client files.
- Exact symbols: `queryDb()`, `new pgModule.Pool()`, `pool.end()`.
- Current behavior: social identifier store creates a new `Pool` for each query and calls `pool.end()` only after `pool.query()` resolves; errors before `pool.end()` can leak.
- Evidence: `queryDb()` dynamically imports `pg`, constructs `new Pool({ connectionString })`, performs query, then ends the pool without `finally`.
- Why it matters: serverless or concurrent traffic can exhaust database connections or leak pools on errors.
- Reachable runtime: yes when social identifier route uses SQL mode.
- Existing tests: route stubs do not prove pool lifecycle.
- Missing tests: failure-path pool disposal and reuse tests.
- Dependency/blocker: canonical SQL client strategy.
- Recommended remediation boundary: persistence consistency batch.
- Proposed cleanup batch: RC-C.
- Explicit non-goals: do not edit in audit.
- Confidence: `proven`.

### F-013 — Step-up/2FA state is process-local and fixture-only

- Domain: security/commercial mutations.
- Classification: `verified_open_loop`.
- Severity: `pre_staging_blocking`.
- Exact files: `services/application-state/src/super-admin-commercial-controls/index.ts`, `apps/web/app/api/admin/security/step-up/*`, super-admin commercial mutation routes.
- Exact symbols: `challenges`, `consumedProofs`, `actorRate`, `actorLockouts`, `verifiedFreshness`, `createSuperAdminStepUpChallenge()`, `verifySuperAdminStepUpChallenge()`, `assertSuperAdminStepUpFresh()`.
- Current behavior: challenges, replay, attempts, rate limits, lockout, and freshness are process-local maps/sets. Non-fixture providers return `provider_pending`. Verification succeeds only for `fixture_test_only` in test/fixture mode with proof `fixture-pass`.
- Evidence: provider readiness report marks TOTP/WebAuthn/authenticator app as provider-pending and fixture as test-only; verification logic checks provider kind and fixture mode.
- Why it matters: restarts and horizontal scaling can reset replay/lockout/freshness state, and real 2FA is not available.
- Reachable runtime: yes for admin step-up routes; production verification intentionally blocks non-fixture providers.
- Existing tests: route/runtime tests assert provider pending.
- Missing tests: durable step-up repository, multi-instance replay, challenge binding to actor/action/scope/target across routes.
- Dependency/blocker: durable security repository and provider selection.
- Recommended remediation boundary: auth/commercial durability batch.
- Proposed cleanup batch: RC-B2.
- Explicit non-goals: no provider activation in audit.
- Confidence: `proven`.

### F-014 — Commercial SQL/memory consistency defect

- Domain: commercial controls/persistence.
- Classification: `verified_defect`.
- Severity: `merge_blocking`.
- Exact files: `services/application-state/src/super-admin-commercial-controls/index.ts`, `infra/db/schema/0036_super_admin_commercial_controls.sql`, admin commercial routes.
- Exact symbols: `giftFocusPlanToUser()`, `retractFocusPlanGift()`, `restrictUserAccount()`, `getSuperAdminCommercialControlSnapshot()`, `evaluateSuperAdminGrantedEntitlement()`, `gifts`, `restrictions`.
- Current behavior: in SQL mode, gift creation inserts into DB and returns without storing the gift in `gifts`; retraction reads `gifts.get()` before issuing SQL update; snapshots read maps while reporting `durable` when SQL mode is enabled. Restrictions are written to both map and SQL, but snapshots still depend on the current process map and do not read SQL.
- Evidence: `giftFocusPlanToUser()` returns immediately after SQL insert; `retractFocusPlanGift()` blocks if `gifts.get()` misses; `getSuperAdminCommercialControlSnapshot()` builds counts from `gifts`/`restrictions` maps and sets `persistenceStatus` to `durable` in SQL mode.
- Why it matters: SQL-mode state can be durable but unreachable to retraction/snapshot/entitlement checks after restart or on another instance.
- Reachable runtime: yes in SQL mode via admin commercial mutation routes and snapshot routes.
- Existing tests: stubs and unit coverage do not prove SQL-mode consistency.
- Missing tests: SQL-mode gift lifecycle, restart/multi-instance, idempotency uniqueness, duplicate active gift overlap, row-count checks, transaction tests.
- Dependency/blocker: canonical commercial repository.
- Recommended remediation boundary: persistence consistency first, then auth/commercial durability.
- Proposed cleanup batch: RC-C.
- Explicit non-goals: do not fix in audit.
- Confidence: `proven`.

### F-015 — Social identifier readiness is partial, with authenticated self-ownership present

- Domain: profile/commercial readiness.
- Classification: `partially_resolved`.
- Severity: `operational_risk`.
- Exact files: `apps/web/lib/server/profile/social-identifiers-store.ts`, `apps/web/app/api/account/profile/social-identifiers/route.ts`, `infra/db/schema/0035_user_social_identifiers.sql`.
- Exact symbols/routes/tables: `/api/account/profile/social-identifiers`, `requireAuthenticatedSubject()`, `readSocialIdentifiersForUser()`, `writeSocialIdentifiersForUser()`, `user_social_identifiers`.
- Current behavior: the route requires an authenticated subject, reads/writes only that subject's own social identifier record, and applies the owner-boundary helper. Validation/normalization and SQL upsert/read exist; missing rows return blocked readiness. The DB pool lifecycle issue is not counted here because it is F-012. External proof that a LinkedIn, Telegram, or X identifier is owned by the authenticated user is not implemented, but no approved current contract in this audit required external ownership verification before checkout.
- Evidence: route inspection shows authenticated-subject ownership rather than arbitrary target-user writes; `0035_user_social_identifiers.sql` defines the durable table; F-012 covers the per-query pool lifecycle defect in the same store.
- Why it matters: social identifiers are part of payment-readiness coupling, so product/security policy must decide whether self-declared identifiers are acceptable or whether provider ownership proof is required.
- Reachable runtime: yes.
- Existing tests: route/runtime stubs and readiness tests cover basic presence/absence behavior; exact external ownership proof is not present.
- Missing tests: explicit self-owner read/write regression, missing-row readiness, data exposure checks, SQL constraint behavior, and policy-specific external ownership proof if that contract is approved.
- Dependency/blocker: RC-C for pool/readiness hardening; policy decision before any external ownership-verification implementation.
- Recommended remediation boundary: preserve authenticated self-owner behavior, fix F-012 pool lifecycle in RC-C, and separately document/implement external social ownership only if product/security policy requires it.
- Proposed cleanup batch: RC-C.
- Explicit non-goals: no payment activation, no external social provider verification in this audit, no duplicate counting of F-012.
- Merge/blocker scope: does not block this documentation-only audit PR; external ownership verification is a policy/open-loop uncertainty mapped to `partially_resolved` because `policy_decision_or_open_loop` is not an allowed primary classification.
- Confidence: `proven` for authenticated self-ownership and pool-issue deduplication; `strongly_indicated` for policy uncertainty.

### F-016 — Billing and notification durability require a formal payment correctness gate

- Domain: billing/notifications.
- Classification: `verified_open_loop`.
- Severity: `pre_production_blocking`.
- Exact files: `services/application-state/src/persistence/billing-lifecycle-repository.ts`, `services/application-state/src/persistence/billing-orchestration-repository.ts`, `services/application-state/src/persistence/billing-policy-repository.ts`, `services/notifications/src/index.ts`, `services/notifications/src/policy.ts`, `infra/db/schema/0011_notification_decisions.sql`, `infra/db/schema/0012_notification_delivery_outbox.sql`, `infra/db/schema/0013_notification_targets_and_inbox.sql`, `infra/db/schema/0028_payment_provider_boundary.sql`, `apps/web/app/api/billing/checkout/route.ts`, `apps/web/app/api/billing/webhook/route.ts`, `apps/web/app/api/internal/billing/reconcile/route.ts`.
- Exact symbols/routes/tables: `/api/billing/checkout`, `/api/billing/webhook`, `/api/internal/billing/reconcile`, payment-provider boundary tables, notification outbox/inbox tables.
- Current behavior: transactional repositories, idempotency records, response storage, provider events, reconciliation, policy transitions, and notification outbox/targets/inbox exist. Full payment correctness is not closure-proven: one genuine customer payment intention must create at most one provider charge and exactly one local billing, ledger, and entitlement effect, and a timeout/lost provider response must never be treated automatically as a failed payment that can be charged again. Notification outbox failure recovery, dead-letter handling, replay handling, provider receipts, and operator inspection also remain open.
- Evidence: open-loop docs keep payment provider docs verification, webhook raw-body end-to-end, sandbox checkout, idempotency finalization, entitlement mutation after webhook, and notification provider decisions unchecked; repository inspection found persistence concepts but not the complete architecture and tests listed below.
- Why it matters: payment systems face at-least-once external events, duplicate browser requests, timeouts after provider acceptance, delayed/out-of-order webhooks, and local/provider split-brain. ELCEO must provide exactly-once local business effects even when provider delivery is at least once.
- Reachable runtime: partial with internal/fixture paths; live provider operations are blocked.
- Existing tests: route runtime and service tests cover pieces of billing and notifications.
- Missing tests: rapid double click; same request sent concurrently; retry with same idempotency key; timeout before provider response; provider success response lost; disconnect during redirect; webhook before redirect; duplicate webhook; out-of-order webhook; concurrent webhook and reconciliation; process restart during payment; database failure after provider success; provider 500 after accepting request; retry after unknown result; duplicate provider event ID; duplicate provider reference; refund and chargeback; one payment grants entitlement exactly once; notification provider retry/receipt/dead-letter/operator inspection.
- Dependency/blocker: RC-B1, RC-B2, RC-C, and RC-E before payment activation; external payment/notification credentials only after local correctness boundaries exist.
- Recommended remediation boundary: implement a durable payment operation with immutable internal payment-operation ID, provider idempotency key, subject/user ID, target plan, amount/currency, provider, state, provider references, version, timestamps, and reconciliation state. Enforce unique constraints for operation ID, provider payment reference, provider event ID, invoice/subscription transition, and business idempotency key. Use a monotonic state machine (`created` -> `pending_provider` -> `processing` -> `succeeded|failed|expired|cancelled`) plus explicit `unknown`, `reconciliation_required`, `refunded`, `partially_refunded`, `reversed`, and `chargeback`; reject impossible, regressive, and conflicting transitions. On timeout/disconnect/lost provider response, record `unknown`/`reconciliation_required`, reuse the same provider idempotency key, query the provider using the existing reference, wait for signed webhook or reconciliation, and let the user resume safely without creating a new charge. Persist provider events in a deduplicating inbox and execute event record, payment state, immutable ledger entry, entitlement transition, and outbox event in one DB transaction. Use row locks, advisory locks, or optimistic versions so polling, webhooks, reconciliation, retries, and multiple instances cannot create duplicate charges or effects. Provide scheduled reconciliation, durable user-facing states (`processing`, `payment confirmation pending`, `payment successful`, `payment failed`, `action required`, `refund processing`), and operator controls for lookup, provider/local comparison, reconciliation trigger, duplicate-charge alert, unknown-operation queue, safe retry, refund/reversal visibility, and immutable audit.
- Proposed cleanup batch: RC-I1 for local payment correctness/resilience, RC-I2 for payment sandbox/end-to-end validation, and RC-I3 for notification durability/sandbox validation.
- Explicit non-goals: no external payments/notifications activation in this audit, no production-live provider enablement, no referral/affiliate implementation.
- Merge/blocker scope: does not block this documentation-only audit PR; blocks payment/notification staging activation and production activation until the local correctness gate and external validation pass.
- Confidence: `strongly_indicated`.

### F-017 — Route entitlement closure is matrix-backed but still has partial and gap-found rows

- Domain: route/auth/entitlements.
- Classification: `verified_open_loop`.
- Severity: `pre_staging_blocking`.
- Exact files: route matrix appendix in this document; `apps/web/lib/server/auth.ts`, `apps/web/lib/server/security.ts`, `apps/web/lib/server/app-user-state.ts`, `apps/web/lib/server/commercial-route-guards.ts`, `apps/web/lib/server/internal-route-access.ts`, `docs/route-entitlement-enforcement-map.md`.
- Exact symbols/routes/tables: 145 `apps/web/app/api/**/route.ts` handlers; `requireAuthenticatedSubject()`, `requireAppUserState()`, `requireOnboardedAppUserState()`, `requireFeatureAccess()`, `requireInternalRouteAccess()`, `guardRouteCommercialEntitlement()`, `guardRoutePaymentReadiness()`.
- Current behavior: the audit now contains a completed 145-route matrix built from route imports and delegated helper paths. Totals are `verified`: 0, `partial`: 140, `gap_found`: 3, `environment_verification_required`: 1, `not_applicable`: 1. Known helper paths such as `/api/app-state/me` -> `requireAppUserState()`, `/api/app-state/alerts` -> `requireAppUserState()`, `/api/billing/checkout` -> `requireAppUserState()` plus `guardRoutePaymentReadiness()`, `/api/dashboard/[asset]` -> `requireOnboardedAppUserState()`, and `/api/journal/entries` -> `requireAppUserState()` are recognized. Three commercial step-up mutation routes are `gap_found` because of F-020.
- Evidence: route enumeration found 145 handlers and the matrix records method, helper, internal-token, role/feature, entitlement, owner/target boundary, restriction-first behavior, rate/security decision, idempotency, validation, audit, live-operation block, exact test reference, status, and gap per route.
- Why it matters: production closure requires no feature-only guard gaps, no header-only ownership, no internal route token omissions, no stale route-map entries, and no route marked verified while helper/test/control evidence is unproven.
- Reachable runtime: yes.
- Existing tests: exact route-test evidence is listed per matrix row; rows without exact assertions are `not_proven` and generally remain `partial` unless not applicable.
- Missing tests: per-row assertions for `partial` routes, commercial step-up bypass tests for `gap_found` routes, and route-map synchronization tests.
- Dependency/blocker: RC-B1 for gap-found commercial step-up routes; RC-C before commercial persistence-sensitive route closure.
- Recommended remediation boundary: close the three F-020 routes first, then convert `partial` rows to verified by adding exact control/test evidence or documented non-applicability; keep `docs/route-entitlement-enforcement-map.md` synchronized with live handlers.
- Proposed cleanup batch: RC-E.
- Explicit non-goals: no route implementation changes in this audit.
- Merge/blocker scope: does not block this documentation-only audit PR; blocks staging activation of affected commercial/admin surfaces until gap-found rows are fixed and partial rows are dispositioned.
- Confidence: `strongly_indicated`.

### F-018 — Duplicate migration prefixes are deterministic in current checker but remain operator-compatibility risk

- Domain: database/migrations.
- Classification: `verified_open_loop`.
- Severity: `operational_risk`.
- Exact files: `scripts/check-db-migrations.mjs`, `docs/db-migration-readiness-checklist.md`, `infra/db/schema/0027_billing_lifecycle.sql`, `infra/db/schema/0027_billing_runtime.sql`, `infra/db/schema/0028_billing_policy_transitions.sql`, `infra/db/schema/0028_payment_provider_boundary.sql`, `docs/backend-open-loop-register.md`.
- Current behavior: duplicate numeric prefixes `0027` and `0028` exist, but the checked/documented repository execution order is full-filename lexicographic.
- Evidence: `npm run check:migrations` passed and printed lexicographic order while warning about duplicates; no repository executor was found that keys only by numeric prefix.
- Why it matters: this is not a proven current execution ambiguity, but it is a compatibility/operator risk for external tools that assume unique numeric versions.
- Reachable runtime: deployment-time.
- Existing tests: `check:migrations` is required; result recorded separately.
- Missing tests: migration rehearsal/rollback on clean database.
- Dependency/blocker: migration strategy decision.
- Recommended remediation boundary: migration verification/rehearsal batch; do not rename in audit.
- Proposed cleanup batch: RC-G.
- Explicit non-goals: no migration rename here.
- Confidence: `proven`.

### F-019 — Security/infrastructure production controls are checklist-backed, not fully runtime-proven

- Domain: security/infrastructure.
- Classification: `environment_verification_required`.
- Severity: `pre_production_blocking`.
- Exact files: `docs/deployment-runbook.md`, `docs/observability-security-final-review-checklist.md`, `docs/backend-open-loop-register.md`, `.github`, scripts, security helpers.
- Current behavior: repository has security helpers, internal tokens, idempotency/rate/audit repositories, runbooks, and gates. External WAF, backup/restore, monitoring export, alerting, tracing, staging isolation, migration rehearsal, smoke, and attack drills require environment verification.
- Evidence: backend open-loop register leaves staging smoke, attack drill, WAF/rate-limit layer, monitoring/export vendor, backup/restore, rollback drill, legal/compliance, and public claim review unchecked.
- Why it matters: production readiness cannot be established solely from documentation.
- Reachable runtime: partially; external infrastructure dependent.
- Existing tests: infra/security gates.
- Missing tests: environment-backed smoke and attack drill.
- Dependency/blocker: staging/prod env variables and credentials.
- Recommended remediation boundary: final operational validation batch.
- Proposed cleanup batch: RC-J.
- Explicit non-goals: no infra activation in audit.
- Confidence: `requires_runtime_verification`.

### F-020 — Client-supplied step-up verification can bypass server challenge consumption

- Domain: security/commercial mutation trust boundary.
- Classification: `verified_defect`.
- Severity: `pre_staging_blocking`.
- Exact files: `packages/schemas/src/super-admin-commercial-controls.schema.ts`, `apps/web/app/api/admin/commercial/users/[userId]/gift-focus-plan/route.ts`, `apps/web/app/api/admin/commercial/users/[userId]/retract-focus-gift/route.ts`, `apps/web/app/api/admin/commercial/users/[userId]/restrict/route.ts`, `services/application-state/src/super-admin-commercial-controls/index.ts`.
- Exact symbols/routes/tables: `validateSuperAdminStepUpVerification()`, `/api/admin/commercial/users/[userId]/gift-focus-plan`, `/api/admin/commercial/users/[userId]/retract-focus-gift`, `/api/admin/commercial/users/[userId]/restrict`, `giftFocusPlanToUser()`, `retractFocusPlanGift()`, `restrictUserAccount()`, `assertSuperAdminStepUpFresh()`, `super_admin_step_up_challenges`.
- Current behavior: `validateSuperAdminStepUpVerification()` accepts a client object with `status: "verified"`, `challengeId: null`, and `verifiedAt: null`; commercial mutation routes pass `body.stepUpVerification` directly; the gift route performs route-level staleness logic only when `verifiedAt` is supplied; `giftFocusPlanToUser()` calls `assertSuperAdminStepUpFresh()` only when a challenge ID exists; `retractFocusPlanGift()` and `restrictUserAccount()` accept a supplied verified status without server-side challenge resolution or freshness; stored challenge actor/action/route scope/target are not bound to later commercial mutations.
- Evidence: the schema validator permits null challenge/timestamp values when enum fields are valid; the three commercial mutation routes validate body-supplied step-up and pass `step.value` to service calls; service-side assertion checks only `status === 'verified'` for retraction/restriction and conditionally checks freshness for gift only when `challengeId` exists.
- Why it matters: this defeats the intended second-factor boundary for sensitive commercial mutations.
- Reachable runtime: yes, but it requires internal-route access plus `admin.ops`; it is not an unauthenticated public bypass.
- Existing tests: route runtime tests cover representative admin paths but do not prove server-side challenge consumption for these commercial mutations.
- Missing tests: forged verified/null challenge rejection; server-side challenge lookup; actor/action/route-scope/target match; freshness; single-use consumption; cross-action and cross-target reuse rejection.
- Dependency/blocker: none; this must be the first runtime security correction before commercial-control staging activation.
- Recommended remediation boundary: commercial routes must reject client-supplied verified status unless a server-side verified, fresh, single-use challenge is resolved and bound to actor/action/route scope/target; null challenge IDs cannot pass.
- Proposed cleanup batch: RC-B1.
- Explicit non-goals: no provider activation, no payment activation, no unrelated commercial behavior changes.
- Merge/blocker scope: does not block merging this documentation-only audit PR; blocks the future runtime security implementation PR until fixed; blocks commercial-control staging activation; blocks production activation.
- Confidence: `proven`.

## 6. Historical-item disposition matrix

| ID | Item | Classification | Severity | Disposition |
|---|---|---:|---:|---|
| A1 | Asset-causality assertion naming | `stale_truth_source` | `documentation_only` | Descriptor-shape validation is present; name/contract overclaims completion. |
| A2 | Stale R2-R9 phase-state records | `partially_resolved` | `documentation_only` | Deterministic foundations exist, but phase booleans mix foundation/live/empirical meanings. |
| A3 | Stale contradiction pending fields | `stale_truth_source` | `documentation_only` | Fields remain required true despite downstream deterministic engines. |
| A4 | Issuer and metadata inference | `partially_resolved` | `correctness_risk` | Some fixes exist, but substring/provider-ID/default inference remains fragile. |
| A5 | DXY and VIX typing | `partially_resolved` | `documentation_only` | Diagnostic reasoning assets; not proven launch-tradable/provider-covered assets. |
| A6 | Provider/source context into market cognition | `environment_verification_required` | `pre_production_blocking` | Fixture/canonical paths consume context; live production context unproven. |
| A7 | Confidence-floor saturation | `verified_open_loop` | `pre_production_blocking` | 25/33 zero-confidence state preserved; future calibration requires live/empirical evidence. |
| B1 | Adapter reality | `external_activation_blocker` | `pre_production_blocking` | Registry/shell/fixture/dry-run does not equal live adapter completion. |
| B2 | Scheduling and retries | `verified_open_loop` | `operational_risk` | Linear retry helper exists; executed restart-safe worker retries not proven. |
| B3 | Operational provider protections | `verified_open_loop` | `operational_risk` | Partial shells/observability; quotas/circuit breakers/live accounting unproven. |
| B4 | Live payload verification | `environment_verification_required` | `pre_production_blocking` | Requires current official provider schemas/live payloads. |
| C1 | PostgreSQL connection lifecycle | `verified_defect` | `operational_risk` | Social identifier store creates per-query pools and lacks finally cleanup. |
| C2 | Step-up/2FA durability | `verified_open_loop` | `pre_staging_blocking` | Process-local fixture-only step-up; provider/durable state pending. |
| C3 | Commercial SQL/memory consistency | `verified_defect` | `merge_blocking` | Mandatory suspected defect confirmed. |
| C4 | Social identifier readiness | `partially_resolved` | `operational_risk` | Store exists and owner-boundary routing is present; the pool lifecycle concern is counted in F-012, while external LinkedIn/Telegram/X ownership verification remains a policy decision/open loop mapped to `partially_resolved`. |
| C5 | Billing and notification durability | `verified_open_loop` | `pre_production_blocking` | Persistence exists; live provider/outbox/dead-letter closure unproven. |
| D | Route/auth/ownership/entitlement enforcement | `verified_open_loop` | `pre_staging_blocking` | 145 routes are enumerated in the completed matrix; three step-up commercial routes are `gap_found`, and remaining `partial` rows need exact control/test proof. |
| E | Database and migrations | `verified_open_loop` | `operational_risk` | Duplicate prefixes are deterministic in current full-filename lexicographic checker; remaining risk is external-tool/operator compatibility plus staging rehearsal. |
| F | Security/infrastructure/production ops | `environment_verification_required` | `pre_production_blocking` | Gates/runbooks exist; WAF/smoke/attack/backup/monitoring need env proof. |

## 7. Newly discovered defects

- N-001/F-014: Commercial SQL/memory consistency defect is confirmed and merge-blocking for any follow-up cleanup branch that touches commercial persistence.
- N-002/F-012: Social identifier per-query pool lifecycle defect is confirmed.
- N-003/F-017: Route-enforcement documentation alone is not sufficient; the completed 145-route matrix is the current truth source, and its `partial`/`gap_found` rows require closure.
- N-004/F-018: Duplicate migration prefixes are confirmed as a compatibility/operator risk under external numeric-version tools; current repository checker uses deterministic full-filename lexicographic order.

## 8. Runtime reachability analysis

- Reasoning descriptor/assertion paths are reachable through service tests and canonical boundary methods; they do not prove live provider readiness.
- Provider context reaches reasoning when supplied by fixtures/golden scenarios and admin/inspection assembly paths. Live provider-to-frontend reachability requires credentials and activation gates.
- Commercial SQL/memory defect is reachable in current runtime when `APP_STATE_REPOSITORY=sql` and `DATABASE_URL` are present.
- Step-up process-local state is reachable through admin step-up and commercial mutation routes; non-fixture providers intentionally return pending.
- Social identifier pool lifecycle is reachable through account profile social identifier route in SQL mode.
- Scheduled-ingestion retry metadata is reachable through scheduled-ingestion services/routes; actual restart-safe retry worker claiming remains unproven.
- Migration duplicate-prefix compatibility risk is reachable if operators use an external numeric-version executor rather than the documented full-filename lexicographic order.
- Smoke/attack drills are reachable only in configured staging/production environments.

## 9. Documentation-versus-code contradictions

- Foundation completion is sometimes described near live/provider/empirical pending states without a strict taxonomy; docs should separate deterministic foundation, live provider integration, empirical validation, and production calibration.
- `assertMarketAssetCausalityMatrixComplete()` contradicts `coverageReport.complete: false` unless “complete” is read narrowly as descriptor-shape completeness.
- Route entitlement map documentation should track the completed 145-route matrix and should not claim closure for rows still marked `partial`, `gap_found`, or `environment_verification_required`.
- Provider activation docs correctly say live activation is blocked, but any code/docs equating registry presence with adapter completion should be corrected.
- Production readiness docs contain many checkboxes/open loops; foundation completion documents should not be read as production readiness.

## 10. External/environment blockers

- Provider credentials and activation approvals.
- Official provider schema/payload verification.
- Provider legal/terms review.
- Production/staging URLs for smoke and attack drills.
- Internal tokens for smoke/replay/admin checks.
- WAF/rate-limit layer verification.
- Monitoring/export vendor and alerting configuration.
- Backup/restore and rollback drill environments.
- Payment provider sandbox/live credentials and webhook raw-body verification.
- Notification provider decisions and live send smoke tests.

## 11. Production-claim boundary

The repository supports a statement that deterministic foundations, fixture/dry-run provider shells, route/security helpers, billing/notification persistence shells, and migration assets exist. It does **not** support claiming production-live provider cognition, production 2FA, production payments/notifications, exhaustive route-entitlement closure, or fully rehearsed production infrastructure.

## 12. Confirmed resolved items to remove from future registers

- Deterministic confidence calibration foundation exists and is not absent.
- Deterministic price-reaction foundation exists and is not absent.
- Deterministic provider/source reliability weighting foundation exists and is not absent.
- Deterministic golden scenario suite exists with 33 canonical scenarios and current tests.
- DXY/VIX diagnostic limitations are represented in reasoning/golden tests and should not be listed as unsupported across all contexts.

## 13. Items requiring implementation

- Commercial durable repository consistency for gifts, restrictions, snapshots, entitlement evaluation, idempotency, retraction row-count checks, overlap prevention, and transactions.
- Canonical DB pool/client lifecycle for social identifiers and any other direct SQL use.
- Durable step-up/2FA repository and real provider integrations or explicit production block.
- Closure of all route rows currently classified `partial` or `gap_found`, followed by route-map synchronization.
- Provider orchestration hardening: retry execution, worker claiming, rate-limit accounting, circuit breakers, quotas, stale-if-error, fallback, and payload limits.
- Migration clean-apply, repeat-apply, external-tool compatibility decision, staging rehearsal, backup/restore and rollback proof.

## 14. Items requiring only truth-source correction

- Asset-causality “complete” naming/contract.
- R2-R9 pending booleans and contradiction pending fields that mean live/empirical/provider pending rather than deterministic foundation absent.
- DXY/VIX diagnostic vs tradable/provider-covered labeling.
- Production status docs separating foundation from live/empirical/production readiness.

## 15. Items requiring staging/production verification

- Live provider payloads and schema variance.
- Provider rate limits/error bodies/revisions/pagination/time zones/duplicates/backfills.
- `npm run smoke:production`.
- `npm run attack-drill:staging`.
- WAF, backups, restore, rollback, alerting, tracing, deployment promotion, migration rehearsal.
- Payment and notification provider end-to-end flows.

## 16. Deferred features

The following postponed features remain explicitly out of scope until repository cleanup and full closure are complete:

1. Expectation–Reality Delta Engine.
2. Historical Market Memory / Analog Engine.
3. Contradiction-to-Action Protocol.
4. Market Cleanliness Ranking.
5. News Half-Life / Narrative Decay.
6. Crowd Pain / Positioning Stress Map.
7. Fragility Score.

No cleanup batch in this audit schedules or implements them.


## 17. Completed matrix and trace evidence

### Updated finding classification counts

- `verified_defect`: 3 (`F-012`, `F-014`, `F-020`).
- `verified_open_loop`: 7 (`F-007`, `F-009`, `F-010`, `F-013`, `F-016`, `F-017`, `F-018`).
- `stale_truth_source`: 2 (`F-001`, `F-003`).
- `partially_resolved`: 4 (`F-002`, `F-004`, `F-005`, `F-015`).
- `external_activation_blocker`: 1 (`F-008`).
- `environment_verification_required`: 3 (`F-006`, `F-011`, `F-019`).
- `duplicate_of_another_finding`: 0 as primary classification; F-015 explicitly references F-012 for the duplicated pool-lifecycle issue and does not count it again.
- Total findings after this correction: 20.

### Updated historical disposition matrix entries

| ID | Corrected disposition |
|---|---|
| C2 | Step-up/2FA durability remains `verified_open_loop`; the separate request-forgery trust-boundary defect is F-020 `verified_defect`. |
| C3 | Commercial SQL/memory consistency remains F-014 `verified_defect`; it does not block this documentation-only audit PR, but blocks future runtime implementation/staging activation until fixed. |
| C4 | Social identifier readiness is `partially_resolved`: authenticated owner-boundary read/write exists; pool lifecycle belongs to F-012; external social ownership verification is a policy/open-loop uncertainty, not a second verified defect. |
| D | Route audit is backed by the complete 145-route matrix below; the three commercial step-up mutation routes are `gap_found`. |
| E | Duplicate prefixes are deterministic under `scripts/check-db-migrations.mjs` full-filename lexicographic order; risk is external-tool/operator compatibility plus staging rehearsal. |

### Corrected social-identifier disposition

The social identifier route requires an authenticated subject, reads/writes that subject's own ID, and uses the owner-boundary subject helper. The pool lifecycle defect remains F-012 only. External proof that a LinkedIn, Telegram, or X identifier is owned by the authenticated user is a policy decision/open loop unless an approved product/security contract requires verified ownership; because `policy_decision_or_open_loop` is not an allowed primary classification, this audit maps it to `partially_resolved` under F-015 and states the uncertainty explicitly.

### Corrected duplicate-prefix conclusion

The duplicate prefixes are deterministic under the current repository checker and documented full-filename lexicographic ordering. No repository migration executor was found that keys only by numeric prefix. The remaining risk is compatibility/operator risk for external tools, plus staging rehearsal and readiness checklist reconciliation. Renumbering must not occur without a migration-state strategy.

### Complete route matrix totals

- Total routes: 145.
- `verified`: 0.
- `partial`: 140.
- `gap_found`: 3.
- `environment_verification_required`: 1.
- `not_applicable`: 1.
- Authentication-helper categories recognized: `requireAuthenticatedSubject`, `requireAppUserState`, `requireOnboardedAppUserState`, `requireFeatureAccess`, `requireInternalRouteAccess`, `guardRouteCommercialEntitlement`, `guardRoutePaymentReadiness`, framework auth handlers, and explicit public/not-applicable routes.

### Complete route matrix

| Route | Methods | Authentication helper | Internal token | Role/feature | Commercial/payment guard | Owner boundary | Target boundary | Restriction-first | Security decision | Idempotency | Validation | Audit | Live block | Exact test evidence | Status | Gap |
|---|---:|---|---:|---|---|---|---|---|---:|---:|---|---:|---|---|---|---|
| /api/account/access-check | POST | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/account/access-decisions | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/account/billing/events | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/account/billing/policy | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/account/billing/policy/transitions | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/account/billing/reconciliation-runs | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/account/billing | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/account/entitlements | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/account/profile/social-identifiers | GET,PATCH | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/account/usage | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/audit | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | internal operator | none | not_proven | no | no | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/billing/activate | POST | requireInternalRouteAccess | yes | none | no | internal operator | none | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/billing/cancel-at-period-end | POST | requireInternalRouteAccess | yes | none | no | internal operator | none | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/billing/change-plan | POST | requireInternalRouteAccess | yes | none | no | internal operator | none | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/billing/expire | POST | requireInternalRouteAccess | yes | none | no | internal operator | none | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/billing/operations/failures | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.ops | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/billing/operations/retry-candidates | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.ops | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/billing/operations/subject | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.ops | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/billing/operations/summary | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.ops | no | internal operator | none | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/billing/orchestration/latest | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.ops | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/billing/orchestration/runs | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.ops | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/billing/orchestration/subject | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.ops | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/billing/past-due | POST | requireInternalRouteAccess | yes | none | no | internal operator | none | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/billing/pause | POST | requireInternalRouteAccess | yes | none | no | internal operator | none | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/billing/policy | GET | requireInternalRouteAccess | yes | none | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/billing/policy/transitions | GET | requireInternalRouteAccess | yes | none | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/billing/provider-events | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/billing/provider-plan-mapping | POST | requireFeatureAccess+requireInternalRouteAccess | yes | admin.ops | no | internal operator | none | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/billing/provider-plan-mappings | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/billing/renew | POST | requireInternalRouteAccess | yes | none | no | internal operator | none | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/billing/resume | POST | requireInternalRouteAccess | yes | none | no | internal operator | none | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/billing/trial | POST | requireInternalRouteAccess | yes | none | no | internal operator | none | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/commercial/metrics | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | internal operator | none | not_proven | no | no | yes | no | blocked/gated | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/commercial/users/{userId}/control-snapshot | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | admin target path | path:userId | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/commercial/users/{userId}/gift-focus-plan | POST | requireFeatureAccess+requireInternalRouteAccess | yes | admin.ops | no | admin target path | path:userId | not_proven | yes | yes | yes | yes | not_applicable | not_proven | gap_found | F-020 trusts body.stepUpVerification without server-side challenge binding/consumption |
| /api/admin/commercial/users/{userId}/restrict | POST | requireFeatureAccess+requireInternalRouteAccess | yes | admin.ops | no | admin target path | path:userId | not_proven | yes | yes | yes | yes | not_applicable | not_proven | gap_found | F-020 trusts body.stepUpVerification without server-side challenge binding/consumption |
| /api/admin/commercial/users/{userId}/retract-focus-gift | POST | requireFeatureAccess+requireInternalRouteAccess | yes | admin.ops | no | admin target path | path:userId | not_proven | yes | yes | yes | yes | not_applicable | not_proven | gap_found | F-020 trusts body.stepUpVerification without server-side challenge binding/consumption |
| /api/admin/entitlements/override | POST | requireInternalRouteAccess | yes | none | no | internal operator | none | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/entitlements/plan | POST | requireInternalRouteAccess | yes | none | no | internal operator | none | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/entitlements/state | POST | requireInternalRouteAccess | yes | none | no | internal operator | none | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/freshness | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | internal operator | none | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/market-evidence/cognition | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/market-evidence/inspection | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | internal operator | none | not_proven | no | no | yes | no | blocked/gated | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/market-evidence/payload-replay | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/market-evidence/payloads | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/market-evidence/provider-request | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/market-evidence/provider-response | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/market-evidence/quality | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/market-evidence/reasoning-input | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/market-evidence/scheduled-ingestion/dry-run | POST | requireFeatureAccess+requireInternalRouteAccess | yes | admin.ops | no | internal operator | none | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/market-evidence/scheduled-ingestion/inspection | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | internal operator | none | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/market-evidence/scheduled-ingestion/policies | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/market-evidence/scheduled-ingestion/replay | GET,POST | requireFeatureAccess+requireInternalRouteAccess | yes | admin.ops | no | internal operator | none | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/market-evidence/scheduled-ingestion/runs | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/market-evidence/weighted | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/ops | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | internal operator | none | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/providers | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | internal operator | none | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/security/step-up/challenge | POST | requireFeatureAccess+requireInternalRouteAccess | yes | admin.ops | no | internal operator | none | not_proven | no | no | yes | no | blocked/gated | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/security/step-up/readiness | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | internal operator | none | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/security/step-up/verify | POST | requireFeatureAccess+requireInternalRouteAccess | yes | admin.ops | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/seo/feed | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/seo/sitemap | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/admin/system-summary | GET | requireFeatureAccess+requireInternalRouteAccess | yes | admin.read | no | internal operator | none | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/analytics/generate | POST | requireFeatureAccess | no | feature_access | no | not_proven | none | not_proven | yes | yes | not_proven | yes | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/analytics/latest | GET | requireFeatureAccess+guardRouteCommercialEntitlement | no | feature_access | yes | not_proven | none | commercial guard | no | no | not_proven | no | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/analytics/top-behaviors | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/analytics/top-setups | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/app-state/alerts | GET,PATCH | requireAppUserState | no | none | no | subject helper | subject | via app-state helper | no | no | yes | no | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/app-state/me | GET | requireAppUserState | no | none | no | subject helper | subject | via app-state helper | no | no | not_proven | no | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/app-state/onboarding | POST | requireAppUserState | no | none | no | subject helper | subject | via app-state helper | no | no | yes | no | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/app-state/settings | PATCH | requireAppUserState | no | none | no | subject helper | subject | via app-state helper | no | no | yes | no | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/app-state/watchlist | PATCH | requireAppUserState | no | none | no | subject helper | subject | via app-state helper | no | no | yes | no | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/auth/{...nextauth} | unknown | NextAuth/framework handler | no | none | no | framework | path:...nextauth | not_proven | no | no | not_proven | no | not_applicable | not_proven | not_applicable | framework authentication handler boundary, not product route |
| /api/billing/checkout | POST | requireAppUserState+guardRoutePaymentReadiness | no | none | no; payment_readiness | subject helper | subject | via app-state helper | no | no | yes | no | blocked/gated | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/billing/portal | POST | requireAppUserState | no | none | no | subject helper | subject | via app-state helper | no | no | not_proven | no | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/billing/subscription | GET | requireAppUserState | no | none | no | subject helper | subject | via app-state helper | no | no | not_proven | no | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/billing/webhook | POST | none_detected | no | none | no | not_proven | none | not_applicable | no | no | not_proven | no | not_applicable | not_proven | environment_verification_required | webhook raw-body/signature/provider behavior needs environment validation |
| /api/coaching/action-plan | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/coaching/focus | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/coaching/generate | POST | requireFeatureAccess | no | feature_access | no | not_proven | none | not_proven | yes | yes | not_proven | yes | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/coaching/latest | GET | requireFeatureAccess+guardRouteCommercialEntitlement | no | feature_access | yes | not_proven | none | commercial guard | no | no | not_proven | no | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/dashboard/{asset} | GET | requireOnboardedAppUserState | no | none | no | subject helper | path:asset | via app-state helper | no | no | not_proven | no | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/internal/billing/orchestration/retry | POST | requireFeatureAccess+requireInternalRouteAccess | yes | admin.ops | no | internal operator | none | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/internal/billing/policy/evaluate | POST | requireFeatureAccess+requireInternalRouteAccess | yes | admin.ops | no | internal operator | none | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/internal/billing/provider-events/replay | POST | requireFeatureAccess+requireInternalRouteAccess | yes | admin.ops | no | internal operator | none | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/internal/billing/provider-events | POST | requireInternalRouteAccess | yes | none | no | internal operator | none | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/internal/billing/reconcile/retry | POST | requireFeatureAccess+requireInternalRouteAccess | yes | admin.ops | no | internal operator | none | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/internal/billing/reconcile | POST | requireFeatureAccess+requireInternalRouteAccess | yes | admin.ops | no | internal operator | none | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/internal/market-evidence/tiingo/fixture-ingest | POST | requireFeatureAccess+requireInternalRouteAccess | yes | admin.ops | no | internal operator | none | not_proven | yes | yes | yes | yes | blocked/gated | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/journal/analytics | GET | requireAppUserState | no | none | no | subject helper | subject | via app-state helper | no | no | not_proven | no | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/journal/cases/{caseId}/adjust | POST | requireAuthenticatedSubject | no | none | no | subject helper | path:caseId | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/journal/cases/{caseId}/cancel | POST | requireAuthenticatedSubject | no | none | no | subject helper | path:caseId | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/journal/cases/{caseId}/close | POST | requireAuthenticatedSubject | no | none | no | subject helper | path:caseId | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/journal/cases/{caseId}/execute | POST | requireAuthenticatedSubject | no | none | no | subject helper | path:caseId | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/journal/cases/{caseId}/partial-close | POST | requireAuthenticatedSubject | no | none | no | subject helper | path:caseId | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/journal/cases/{caseId}/plan | POST | requireAuthenticatedSubject | no | none | no | subject helper | path:caseId | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/journal/cases/{caseId}/replay | GET | requireAuthenticatedSubject | no | none | no | subject helper | path:caseId | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/journal/cases/{caseId}/review | POST | requireAuthenticatedSubject | no | none | no | subject helper | path:caseId | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/journal/cases/{caseId} | GET | requireAuthenticatedSubject | no | none | no | subject helper | path:caseId | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/journal/cases | GET,POST | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/journal/entries | GET,POST | requireAppUserState | no | none | no | subject helper | subject | via app-state helper | no | no | yes | no | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/journal/influence/generate | POST | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | yes | yes | not_proven | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/journal/influence/latest | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/notifications/delivery/dispatch | POST | requireInternalRouteAccess | yes | none | no | internal operator | none | not_proven | yes | yes | not_proven | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/notifications/health | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/notifications/inbox | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/notifications/subscriptions/{subscriptionId} | PATCH | requireAuthenticatedSubject | no | none | no | subject helper | path:subscriptionId | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/notifications/subscriptions | GET,POST | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/notifications/summary | GET | requireFeatureAccess+guardRouteCommercialEntitlement | no | feature_access | yes | not_proven | none | commercial guard | no | no | not_proven | no | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/notifications/targets/{targetId}/disable | POST | requireAuthenticatedSubject | no | none | no | subject helper | path:targetId | not_proven | yes | yes | not_proven | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/notifications/targets/{targetId}/enable | POST | requireAuthenticatedSubject | no | none | no | subject helper | path:targetId | not_proven | yes | yes | not_proven | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/notifications/targets | GET,POST | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/notifications/verification/consume | POST | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/notifications/verification/issue | POST | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/ops/notifications/expire-verifications | POST | requireFeatureAccess+requireInternalRouteAccess | yes | admin.ops | no | internal operator | none | not_proven | yes | yes | not_proven | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/ops/notifications/process-feedback | POST | requireFeatureAccess+requireInternalRouteAccess | yes | admin.ops | no | internal operator | none | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/portfolio/actions/{actionId}/complete | POST | requireAuthenticatedSubject | no | none | no | subject helper | path:actionId | not_proven | yes | yes | not_proven | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/portfolio/actions/{actionId}/dismiss | POST | requireAuthenticatedSubject | no | none | no | subject helper | path:actionId | not_proven | yes | yes | not_proven | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/portfolio/actions/{actionId} | GET,PATCH | requireAuthenticatedSubject | no | none | no | subject helper | path:actionId | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/portfolio/actions | GET,POST | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/portfolio/attention | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | yes | no | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/portfolio/positions/{positionId}/cancel | POST | requireAuthenticatedSubject | no | none | no | subject helper | path:positionId | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/portfolio/positions/{positionId}/close | POST | requireAuthenticatedSubject | no | none | no | subject helper | path:positionId | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/portfolio/positions/{positionId}/open | POST | requireAuthenticatedSubject | no | none | no | subject helper | path:positionId | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/portfolio/positions/{positionId}/reduce | POST | requireAuthenticatedSubject | no | none | no | subject helper | path:positionId | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/portfolio/positions/{positionId} | GET,PATCH | requireAuthenticatedSubject | no | none | no | subject helper | path:positionId | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/portfolio/positions/{positionId}/thesis-health | POST | requireAuthenticatedSubject | no | none | no | subject helper | path:positionId | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/portfolio/positions | GET,POST | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/portfolio/replay | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/portfolio/snapshot/current | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/portfolio/snapshot/generate | POST | requireFeatureAccess | no | feature_access | no | not_proven | none | not_proven | yes | yes | not_proven | yes | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/portfolio/watchlist/{entryId}/archive | POST | requireAuthenticatedSubject | no | none | no | subject helper | path:entryId | not_proven | yes | yes | not_proven | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/portfolio/watchlist/{entryId} | GET,PATCH | requireAuthenticatedSubject | no | none | no | subject helper | path:entryId | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/portfolio/watchlist/{entryId}/status | POST | requireAuthenticatedSubject | no | none | no | subject helper | path:entryId | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/portfolio/watchlist/{entryId}/thesis-health | POST | requireAuthenticatedSubject | no | none | no | subject helper | path:entryId | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/portfolio/watchlist | GET,POST | requireFeatureAccess+guardRouteCommercialEntitlement | no | feature_access | yes | not_proven | none | commercial guard | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/refresh/freshness | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/refresh/history | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/refresh/latest | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/refresh/run | POST | requireFeatureAccess | no | feature_access | no | not_proven | none | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |
| /api/workspace/agenda | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/workspace/current | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/workspace/freshness | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/workspace/history | GET | requireAuthenticatedSubject | no | none | no | subject helper | subject | not_proven | no | no | not_proven | no | not_applicable | not_proven | partial | one or more applicable controls/test assertions not fully proven |
| /api/workspace/refresh | POST | requireFeatureAccess | no | feature_access | no | not_proven | none | not_proven | yes | yes | yes | yes | not_applicable | not_proven | partial | one or more controls/test assertions not fully proven |

### Provider matrix totals

- Total provider sources: 43.
- `direct_runtime_wired`: 2.
- `direct_fixture_test_only`: 0.
- `adapter_candidate_unwired`: 0.
- `identifier_or_capability_mismatch`: 32.
- `descriptor_only`: 9.
- `live_disabled_external_blocker`: 1 activation overlay on `tiingo_market_data`, not an additional source row.

### Complete provider-by-provider matrix

| Source ID | Provider-source descriptor capabilities | Explicit resolver/crosswalk | Adapter descriptor ID | Adapter supported capabilities | Actual adapter instantiation path | Exact test invocation | Scheduled-ingestion wiring | Fixture execution | Activation mode | Wiring status | Blocker |
|---|---|---|---|---|---|---|---|---:|---|---|---|
| tiingo_market_data | market_data / market_price_history | direct source-id descriptor | tiingo_market_data | market_price_history | ScheduledIngestionService + TiingoMarketDataAdapter | services/reasoning/src/tests/tiingo-adapter.test.ts; scheduled-ingestion.test.ts | direct policy/job | yes | fixture; live disabled by default | direct_runtime_wired | live_disabled_external_blocker; credentials/schema smoke/rate limits external |
| public_market_price_exchange | descriptor only / shell or dry-run registry | none found | none | none | none | not_proven | not directly wired | no | not enabled | descriptor_only | no exact adapter instantiation path proven |
| index_futures_shell | descriptor only / shell or dry-run registry | none found | none | none | none | not_proven | not directly wired | no | not enabled | descriptor_only | no exact adapter instantiation path proven |
| fred_macro | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| us_treasury_official | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| federal_reserve_official | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| ecb_official | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| boe_official | descriptor only / shell or dry-run registry | none found | none | none | none | not_proven | not directly wired | no | not enabled | descriptor_only | no exact adapter instantiation path proven |
| boj_official | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| eurostat_official | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| bls_official | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| bea_official | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| census_official | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| ons_official | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| destatis_official | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| ifo_shell | descriptor only / shell or dry-run registry | none found | none | none | none | not_proven | not directly wired | no | not enabled | descriptor_only | no exact adapter instantiation path proven |
| zew_shell | descriptor only / shell or dry-run registry | none found | none | none | none | not_proven | not directly wired | no | not enabled | descriptor_only | no exact adapter instantiation path proven |
| ism_shell | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| cftc_cot | positioning / cot_report | direct source-id descriptor | cftc_cot | cot_report | ScheduledIngestionService + CftcCotAdapter | services/reasoning/src/tests/cot-adapter.test.ts; scheduled-ingestion.test.ts | direct policy/job | yes | fixture only | direct_runtime_wired | direct fixture-backed; live verification external |
| marketaux_news | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| newsapi_news | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| gdelt_news | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| finnhub_news | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| firecrawl_extraction | descriptor only / shell or dry-run registry | none found | none | none | none | not_proven | not directly wired | no | not enabled | descriptor_only | no exact adapter instantiation path proven |
| sec_edgar | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| etf_flows_shell | descriptor only / shell or dry-run registry | none found | none | none | none | not_proven | not directly wired | no | not enabled | descriptor_only | no exact adapter instantiation path proven |
| earnings_filings_shell | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| crypto_exchange_public | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| crypto_onchain_public | descriptor only / shell or dry-run registry | none found | none | none | none | not_proven | not directly wired | no | not enabled | descriptor_only | no exact adapter instantiation path proven |
| crypto_derivatives_shell | descriptor only / shell or dry-run registry | none found | none | none | none | not_proven | not directly wired | no | not enabled | descriptor_only | no exact adapter instantiation path proven |
| volatility_metric_source | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| credit_stress_source | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| liquidity_condition_source | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| financial_conditions_source | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| public_equity_breadth_sources | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| calculated_internal_conditions | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| equity_index_breadth_indicator | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| imf_official | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| world_bank_official | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| oecd_official | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| bis_official | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| uk_dmo_official | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |
| japan_mof_official | provider-source descriptor capability differs or lacks explicit adapter resolver | none found | semantic adapter candidate only | candidate capability only | none proven for exact source ID | not_proven | not directly wired | no | not enabled | identifier_or_capability_mismatch | semantic adapter exists but exact source/capability translation is unproven |

### Actual representative confidence penalty traces

These traces were produced by a temporary local inspection script against exported reasoning golden-scenario output. The script was not committed. No hypothetical penalties are listed, and no calibration was changed.

| Scenario | Base confidence | Components and contributions | Boosts | Penalties | Severe flags | Provider reliability supplied / provider scores | Provider cap | Score before caps | Caps applied / score after caps | Floor/clamp | Final confidence / tier |
|---|---:|---|---|---|---|---|---:|---:|---|---|---|
| `c6r9_us_cpi_upside_nasdaq_pressure` | 20 | `evidence_quality` 0 -> 0; `usable_weight` 0 -> 0; `evidence_freshness` 100 -> 20; `evidence_coverage` 0 -> 0 | none | `missing_price_confirmation` 15; `missing_price_confirmation` 14; `provider_activation_gap` 13; `missing_provider_reliability` 8; `low_evidence_coverage` 8; `low_usable_weight` 8 | first two `missing_price_confirmation` and `provider_activation_gap` | supplied `true`; `official_fixture` score 74/cap 72 with activation/backtesting/diagnostic/dry-run warnings | 72 | -46 | `confidence_cap_applied`; capped by provider cap after already below zero | clamp to 0 | 0 / `very_low` |
| `c6r9_sp500_bullish_credit_stress_tension` | 54.97777777777778 | `evidence_quality` 70 -> 21; `usable_weight` 44.800000000000004 -> 11.200000000000001; `evidence_freshness` 100 -> 20; `evidence_coverage` 11.11111111111111 -> 2.7777777777777777 | none | `excessive_contradiction_count` 7; `missing_price_confirmation` 14; `provider_activation_gap` 13; `missing_provider_reliability` 8; `low_evidence_coverage` 8; `low_usable_weight` 8 | `missing_price_confirmation`, `provider_activation_gap` | supplied `true`; `news_fixture` score 66/cap 72 and `market_data_fixture` score 66/cap 72 | 72 | -3.0222222222222186 | none beyond provider cap metadata; score already below zero | clamp to 0 | 0 / `very_low` |
| `c6r9_fixture_only_provider_high_extraction_capped` | 60.49777777777778 | `evidence_quality` 82 -> 24.599999999999998; `usable_weight` 52.480000000000004 -> 13.120000000000001; `evidence_freshness` 100 -> 20; `evidence_coverage` 11.11111111111111 -> 2.7777777777777777 | none | `excessive_contradiction_count` 7; `missing_price_confirmation` 14; `pending_fx_relative_strength` 12; `one_sided_fx_evidence` 18; `weighted_snapshot_metadata_limited` 9; `provider_activation_gap` 13; `missing_provider_reliability` 8; `low_evidence_coverage` 8 | `missing_price_confirmation`, `one_sided_fx_evidence`, `provider_activation_gap` | supplied `true`; `fixture_only_provider` score 52/cap 64 with fixture-only/source-authority warnings | 64 | -28.502222222222223 | provider cap 64 would apply above cap; score already below zero | clamp to 0 | 0 / `very_low` |
| `c6r9_dxy_diagnostic_limited_basket_context` | 62.33777777777778 | `evidence_quality` 86 -> 25.8; `usable_weight` 55.04 -> 13.76; `evidence_freshness` 100 -> 20; `evidence_coverage` 11.11111111111111 -> 2.7777777777777777 | none | `missing_price_confirmation` 14; `pending_fx_relative_strength` 12; `diagnostic_only_dxy` 8; `provider_activation_gap` 13; `missing_provider_reliability` 8; `low_evidence_coverage` 8 | `missing_price_confirmation`, `provider_activation_gap` | supplied `true`; `official_fixture` score 66/cap 72 | 72 | -0.6622222222222192 | no diagnostic cap lowered the already-negative result | clamp to 0 | 0 / `very_low` |
| `c6r9_macro_bullish_reversed_price_reaction` | 68.83075555555556 | `evidence_quality` 86 -> 25.8; `usable_weight` 69.9008 -> 17.4752; `evidence_freshness` 100 -> 20; `evidence_coverage` 22.22222222222222 -> 5.555555555555555 | none | `high_contradiction_severity` 12; `missing_price_confirmation` 14; `pending_fx_relative_strength` 12; `one_sided_fx_evidence` 18; `weighted_snapshot_metadata_limited` 9; `provider_activation_gap` 13; `missing_provider_reliability` 8; `low_evidence_coverage` 8 | `high_contradiction_severity`, `missing_price_confirmation`, `one_sided_fx_evidence`, `provider_activation_gap` | supplied `true`; `official_fixture` score 66/cap 72 and `official_fixture` score 74/cap 72 | 72 | -25.169244444444445 | price status `reversed`; provider cap not limiting after penalties | clamp to 0 | 0 / `very_low` |

Recurring combinations across the 25 zero-confidence results include `provider_activation_gap`, missing or adverse price confirmation, low evidence coverage/usable-weight penalties, fixture/diagnostic provider caps, and contradiction/one-sided-FX penalties. Provider reliability was supplied by the golden runner in the traced scenarios; `missing_provider_reliability` appears only because the actual emitted calibration result included that penalty.


### Root migration inventory

| Pos | Filename | Actual extensions/tables/indexes | Identifiable dependencies | Duplicate prefix | Exact known consumers | Clean-apply status | Repeat-apply status | Staging-rehearsal status |
|---:|---|---|---|---:|---|---|---|---|
| 1 | 0001_init.sql | extension:pgcrypto | none external identified | no | none found by table-name scan | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 2 | 0002_auth_and_application_state.sql | table:app_user_profiles<br>table:app_auth_credentials<br>table:app_watchlists<br>table:app_notification_settings<br>table:app_sessions<br>index:idx_app_user_profiles_role<br>index:idx_app_user_profiles_plan_tier | none external identified | no | services/application-state/src/repositories/user-state-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 3 | 0003_alerts_admin_observability.sql | table:app_in_app_alerts<br>table:app_audit_logs<br>index:idx_app_in_app_alerts_user_created<br>index:idx_app_in_app_alerts_fingerprint<br>index:idx_app_audit_logs_created | app_user_profiles | no | services/application-state/src/repositories/alert-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 4 | 0004_trade_journal_analytics.sql | table:app_trade_journal_entries<br>index:idx_trade_journal_user_traded<br>index:idx_trade_journal_asset | app_user_profiles | no | services/application-state/src/repositories/trade-journal-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 5 | 0005_billing_subscription_lifecycle.sql | table:app_billing_subscriptions<br>index:idx_billing_subscription_status<br>index:idx_billing_subscription_plan | app_user_profiles | no | services/application-state/src/billing-admin/query-service.ts<br>services/application-state/src/persistence/billing-lifecycle-repository.ts<br>services/application-state/src/repositories/user-state-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 6 | 0006_ingestion_runtime_history.sql | table:app_ingestion_runs<br>table:app_ingestion_event_snapshots<br>index:idx_ingestion_runs_asset_timeframe_created<br>index:idx_ingestion_runs_status_created<br>index:idx_ingestion_runs_started_at<br>index:idx_ingestion_snapshots_run_id<br>index:idx_ingestion_snapshots_asset_timeframe_rank<br>index:idx_ingestion_snapshots_dedupe_key<br>index:idx_ingestion_snapshots_event_kind_created | none external identified | no | services/ingestion/src/persistence/sql-ingestion-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 7 | 0007_ingestion_scheduler_runtime.sql | table:app_ingestion_runtime_leases<br>index:idx_ingestion_runs_trigger_slot<br>index:idx_ingestion_runs_request_key<br>index:idx_ingestion_runtime_leases_asset_timeframe_created<br>index:idx_ingestion_runtime_leases_expires_at<br>index:idx_ingestion_runtime_leases_status_updated | app_ingestion_runs | no | services/ingestion/src/scheduler/lease-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 8 | 0008_ingestion_outbox.sql | table:app_ingestion_outbox<br>table:app_ingestion_outbox_attempts<br>index:idx_ingestion_outbox_status_available_created<br>index:idx_ingestion_outbox_run_id<br>index:idx_ingestion_outbox_asset_timeframe_created<br>index:idx_ingestion_outbox_topic_status_created<br>index:idx_ingestion_outbox_attempts_outbox_attempted<br>index:idx_ingestion_outbox_attempts_success_attempted | none external identified | no | services/ingestion/src/publish/outbox-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 9 | 0009_reasoning_snapshots.sql | table:app_reasoning_runs<br>table:app_cognition_snapshots<br>index:idx_reasoning_runs_asset_timeframe_created<br>index:idx_reasoning_runs_source_ingestion_run_id<br>index:idx_reasoning_runs_status_created<br>index:idx_cognition_snapshots_asset_timeframe_evaluated<br>index:idx_cognition_snapshots_source_ingestion_run_id<br>index:idx_cognition_snapshots_bias_created | none external identified | no | services/reasoning/src/persistence/sql-reasoning-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 10 | 0010_cognition_deltas.sql | table:app_cognition_deltas<br>index:idx_cognition_deltas_asset_timeframe_compared<br>index:idx_cognition_deltas_current_snapshot_id<br>index:idx_cognition_deltas_severity_created | none external identified | no | services/reasoning/src/persistence/sql-reasoning-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 11 | 0011_notification_decisions.sql | table:app_notification_decisions<br>index:idx_notification_decisions_asset_timeframe_created<br>index:idx_notification_decisions_notify_created<br>index:idx_notification_decisions_rule_created<br>index:idx_notification_decisions_reasoning_run<br>index:idx_notification_decisions_drift | none external identified | no | services/notifications/src/persistence/sql-notification-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 12 | 0012_notification_delivery_outbox.sql | table:app_notification_outbox<br>table:app_notification_outbox_attempts<br>index:idx_notification_outbox_status_available<br>index:idx_notification_outbox_decision_id<br>index:idx_notification_outbox_channel_status_available<br>index:idx_notification_outbox_asset_timeframe_created<br>index:idx_notification_outbox_attempts_outbox_attempted<br>index:idx_notification_outbox_attempts_channel_attempted | none external identified | no | services/notifications/src/persistence/sql-notification-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 13 | 0013_notification_targets_and_inbox.sql | table:app_notification_targets<br>table:app_notification_subscriptions<br>table:app_notification_inbox<br>index:idx_notification_targets_subject_channel_status<br>index:idx_notification_targets_channel_status<br>index:idx_notification_targets_active_unique_address<br>index:idx_notification_subscriptions_subject_channel_enabled<br>index:idx_notification_subscriptions_channel_enabled<br>index:idx_notification_subscriptions_scope<br>index:idx_notification_inbox_target_created<br>index:idx_notification_inbox_decision_id<br>index:idx_notification_inbox_target_read_archived_created | app_notification_outbox | no | services/notifications/src/persistence/sql-notification-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 14 | 0014_notification_management_keys.sql | index:idx_notification_targets_target_key_unique<br>index:idx_notification_targets_subject_channel_key<br>index:idx_notification_subscriptions_subscription_key_unique<br>index:idx_notification_subscriptions_subject_channel_key | app_notification_subscriptions<br>app_notification_targets | no | none found by table-name scan | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 15 | 0015_notification_verifications.sql | table:app_notification_verifications<br>index:idx_notification_verifications_target_status_expiry<br>index:idx_notification_verifications_subject_channel_created<br>index:idx_notification_verifications_kind_status_created | none external identified | no | services/notifications/src/persistence/sql-notification-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 16 | 0016_notification_orchestration_runs.sql | table:app_notification_orchestration_runs<br>index:idx_notification_orchestration_stage_created<br>index:idx_notification_orchestration_reasoning_run<br>index:idx_notification_orchestration_status_created | none external identified | no | services/notifications/src/persistence/sql-notification-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 17 | 0017_notification_feedback_and_receipts.sql | table:app_notification_provider_events<br>table:app_notification_delivery_receipts<br>table:app_notification_target_health<br>index:idx_notification_provider_events_provider_occurred<br>index:idx_notification_provider_events_provider_message_id<br>index:idx_notification_provider_events_outbox_id<br>index:idx_notification_provider_events_target_occurred<br>index:idx_notification_provider_events_kind_occurred<br>index:idx_notification_delivery_receipts_target_occurred<br>index:idx_notification_delivery_receipts_decision_occurred<br>index:idx_notification_delivery_receipts_outbox_occurred<br>index:idx_notification_delivery_receipts_kind_severity_occurred | app_notification_outbox_attempts | no | services/notifications/src/persistence/sql-notification-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 18 | 0018_journal_cases.sql | table:app_journal_cases<br>table:app_journal_case_revisions<br>index:idx_journal_cases_subject_created_at<br>index:idx_journal_cases_asset_timeframe_created_at<br>index:idx_journal_cases_status_created_at<br>index:idx_journal_cases_reasoning_run<br>index:idx_journal_cases_snapshot_id<br>index:idx_journal_cases_drift_id<br>index:idx_journal_case_revisions_case_changed_at<br>index:idx_journal_case_revisions_type_changed_at | none external identified | no | services/analytics/src/persistence/case-source.ts<br>services/application-state/src/persistence/journal-case-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 19 | 0019_journal_influence_snapshots.sql | table:app_journal_influence_snapshots<br>index:idx_journal_influence_subject_generated_at<br>index:idx_journal_influence_scope_generated_at<br>index:idx_journal_influence_subject_scope_generated_at | none external identified | no | services/analytics/src/coaching/persistence/repositories.ts<br>services/application-state/src/persistence/journal-influence-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 20 | 0020_analytics_snapshots.sql | table:app_analytics_snapshots<br>index:idx_analytics_snapshots_subject_generated_at<br>index:idx_analytics_snapshots_scope_generated_at<br>index:idx_analytics_snapshots_subject_scope_generated_at | none external identified | no | services/analytics/src/coaching/persistence/repositories.ts<br>services/analytics/src/persistence/snapshot-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 21 | 0021_coaching_snapshots.sql | table:app_coaching_snapshots<br>index:idx_coaching_snapshots_subject_generated_at<br>index:idx_coaching_snapshots_scope_generated_at<br>index:idx_coaching_snapshots_subject_scope_generated_at<br>index:idx_coaching_snapshots_analytics_snapshot_id<br>index:idx_coaching_snapshots_journal_influence_snapshot_id | none external identified | no | services/analytics/src/coaching/persistence/repositories.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 22 | 0022_portfolio_domain_core.sql | table:app_portfolio_watchlist_entries<br>table:app_portfolio_positions<br>table:app_portfolio_action_items<br>table:app_portfolio_revisions<br>table:app_portfolio_snapshots<br>index:idx_portfolio_watchlist_subject_updated<br>index:idx_portfolio_watchlist_asset_tf_updated<br>index:idx_portfolio_watchlist_status_updated<br>index:idx_portfolio_watchlist_thesis_health_updated<br>index:idx_portfolio_positions_subject_updated<br>index:idx_portfolio_positions_asset_tf_updated<br>index:idx_portfolio_positions_status_updated | none external identified | no | services/application-state/src/persistence/portfolio-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 23 | 0023_workspace_snapshots.sql | table:app_workspace_snapshots<br>index:idx_workspace_snapshots_subject_generated<br>index:idx_workspace_snapshots_health_attention_generated<br>index:idx_workspace_snapshots_portfolio_snapshot<br>index:idx_workspace_snapshots_coaching_snapshot<br>index:idx_workspace_snapshots_analytics_snapshot | none external identified | no | services/application-state/src/persistence/workspace-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 24 | 0024_snapshot_refresh_runtime.sql | table:app_snapshot_refresh_runs<br>table:app_snapshot_freshness<br>index:idx_snapshot_refresh_runs_subject_generated<br>index:idx_snapshot_refresh_runs_trigger_generated<br>index:idx_snapshot_refresh_runs_status_generated<br>index:uq_snapshot_freshness_scope<br>index:idx_snapshot_freshness_subject_updated<br>index:idx_snapshot_freshness_state_updated<br>index:idx_snapshot_freshness_domain_updated | none external identified | no | services/application-state/src/persistence/refresh-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 25 | 0025_ops_runtime.sql | table:app_ops_job_leases<br>table:app_ops_job_runs<br>index:idx_ops_job_leases_scope<br>index:idx_ops_job_leases_state_expires<br>index:idx_ops_job_leases_created_desc<br>index:idx_ops_job_runs_job_created<br>index:idx_ops_job_runs_status_created<br>index:idx_ops_job_runs_scope_created | none external identified | no | services/application-state/src/persistence/ops-runtime-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 26 | 0027_billing_lifecycle.sql | table:app_billing_customers<br>table:app_billing_subscriptions_lifecycle<br>table:app_billing_reconciliation_runs<br>index:ux_billing_customers_subject_provider<br>index:ux_billing_customers_provider_customer<br>index:ux_billing_subscriptions_subject_provider<br>index:ux_billing_subscriptions_provider_subscription<br>index:idx_billing_recon_runs_subject_created<br>index:idx_billing_recon_runs_provider_created<br>index:idx_billing_recon_runs_status_created | none external identified | yes | services/application-state/src/billing-admin/query-service.ts<br>services/application-state/src/persistence/billing-lifecycle-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 27 | 0027_billing_runtime.sql | table:app_billing_subscriptions<br>table:app_billing_events<br>index:idx_billing_subscriptions_subject_updated<br>index:idx_billing_subscriptions_state_updated<br>index:idx_billing_subscriptions_plan_updated<br>index:idx_billing_events_subscription_occurred<br>index:idx_billing_events_subject_occurred<br>index:idx_billing_events_kind_occurred | none external identified | yes | services/application-state/src/billing-admin/query-service.ts<br>services/application-state/src/persistence/billing-lifecycle-repository.ts<br>services/application-state/src/persistence/billing-repository.ts<br>services/application-state/src/repositories/user-state-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 28 | 0028_billing_policy_transitions.sql | table:app_billing_policy_transitions<br>index:idx_app_billing_policy_transitions_subject<br>index:idx_app_billing_policy_transitions_provider<br>index:idx_app_billing_policy_transitions_decision<br>index:idx_app_billing_policy_transitions_severity | none external identified | yes | services/application-state/src/billing-admin/query-service.ts<br>services/application-state/src/persistence/billing-policy-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 29 | 0028_payment_provider_boundary.sql | table:app_billing_external_customers<br>table:app_billing_external_subscriptions<br>table:app_billing_external_events<br>table:app_billing_provider_plan_mappings<br>index:idx_abec_subject<br>index:idx_abec_email<br>index:idx_abes_subject<br>index:idx_abes_customer<br>index:idx_abes_plan_updated<br>index:idx_abee_processed<br>index:idx_abee_provider_occurred<br>index:idx_abee_subject_occurred | none external identified | yes | services/application-state/src/persistence/payment-provider-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 30 | 0029_billing_orchestration_runs.sql | table:app_billing_orchestration_runs<br>index:app_billing_orchestration_runs_subject_idx<br>index:app_billing_orchestration_runs_provider_idx<br>index:app_billing_orchestration_runs_status_idx | none external identified | no | services/application-state/src/persistence/billing-orchestration-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 31 | 0030_security_runtime.sql | table:app_security_idempotency_records<br>table:app_security_rate_limit_counters<br>table:app_security_audit_events<br>index:idx_security_idempotency_actor<br>index:idx_security_idempotency_expires<br>index:uq_security_rate_counter_scope<br>index:idx_security_rate_actor<br>index:idx_security_rate_policy<br>index:idx_security_audit_actor<br>index:idx_security_audit_subject<br>index:idx_security_audit_action<br>index:idx_security_audit_decision | none external identified | no | services/application-state/src/persistence/security-runtime-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 32 | 0031_security_idempotency_responses.sql | table:app_security_idempotency_responses<br>index:idx_app_security_idempotency_responses_actor_action_completed<br>index:idx_app_security_idempotency_responses_expires_at | none external identified | no | services/application-state/src/persistence/security-runtime-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 33 | 0032_market_evidence_and_seo_snapshots.sql | table:app_market_evidence_registry_snapshots<br>table:app_seo_content_architecture_snapshots<br>index:idx_market_evidence_registry_snapshots_generated<br>index:idx_seo_content_architecture_snapshots_generated | none external identified | no | services/reasoning/src/persistence/registry-snapshot-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 34 | 0033_market_evidence_ingestion.sql | table:app_provider_source_requests<br>table:app_provider_source_responses<br>table:app_normalized_market_evidence_payloads<br>index:idx_provider_source_requests_provider_capability_requested<br>index:idx_provider_source_requests_asset_requested<br>index:idx_provider_source_requests_region_requested<br>index:idx_provider_source_responses_provider_capability_fetched<br>index:idx_provider_source_responses_status_fetched<br>index:idx_normalized_payloads_evidence_type_observed<br>index:idx_normalized_payloads_evidence_class_observed<br>index:idx_normalized_payloads_asset_observed<br>index:idx_normalized_payloads_provider_normalized | none external identified | no | services/reasoning/src/persistence/market-evidence-ingestion-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 35 | 0034_market_evidence_scheduled_ingestion_runs.sql | table:app_market_evidence_scheduled_ingestion_runs<br>index:idx_app_sched_ing_runs_job_started<br>index:idx_app_sched_ing_runs_provider_cap_started<br>index:idx_app_sched_ing_runs_asset_started<br>index:idx_app_sched_ing_runs_region_started<br>index:idx_app_sched_ing_runs_status_started<br>index:idx_app_sched_ing_runs_staleness_started | none external identified | no | services/reasoning/src/persistence/scheduled-ingestion-repository.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 36 | 0035_user_social_identifiers.sql | table:app_user_social_identifiers<br>index:app_user_social_identifiers_updated_at_idx | none external identified | no | apps/web/lib/server/profile/social-identifiers-store.ts<br>services/application-state/src/commercial-entitlements/user-social-identifiers.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 37 | 0036_super_admin_commercial_controls.sql | table:super_admin_focus_plan_gifts<br>table:super_admin_user_restrictions<br>index:idx_super_admin_focus_plan_gifts_target<br>index:idx_super_admin_user_restrictions_target | none external identified | no | services/application-state/src/super-admin-commercial-controls/index.ts | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |
| 38 | 0037_super_admin_step_up_challenges.sql | table:super_admin_step_up_challenges<br>index:idx_super_admin_step_up_challenges_actor_status<br>index:idx_super_admin_step_up_challenges_expires_at | none external identified | no | none found by table-name scan | not run in audit; pending clean database rehearsal | not run in audit; pending idempotency/repeat rehearsal | not run in audit; pending staging rehearsal |

## 17. Audit limitations

- Remote branch and PR-head verification was performed with explicit GitHub refs; push/metadata updates require authenticated GitHub credentials in the execution environment.
- The audit was evidence-based and static/runtime-test based; no external providers were activated.
- No production credentials, staging URLs, WAF, payment, notification, backup, or monitoring systems were available for live verification.
- The route matrix is included in this audit; rows marked `partial`, `gap_found`, or `environment_verification_required` still require implementation, exact test evidence, or external deployment verification.
- Validation command outputs are reported separately and honestly; environment-dependent commands are not counted as code failures when required variables are absent.
