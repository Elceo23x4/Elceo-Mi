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

The C6-R0 through C6-R9 deterministic reasoning foundations are present, but repository closure is not complete. The most important real defects are operational and durability defects rather than deterministic engine defects:

1. **Commercial SQL/memory split is a verified defect.** SQL gift creation returns after insert without updating the process-local gift map, gift retraction checks the map before issuing SQL, and snapshots report `durable` while reading maps. This is reachable when `APP_STATE_REPOSITORY=sql` and `DATABASE_URL` are configured.
2. **Step-up/2FA durability remains an open loop.** Challenge, replay, rate-limit, lockout, and freshness state are process-local maps/sets, and only fixture verification can succeed. This is intentionally provider-pending but is not production durable.
3. **Social identifier SQL connection lifecycle is a verified defect.** The store constructs a new `pg.Pool` per query and calls `pool.end()` only after success, with no `finally`; query failure can leak a pool and high request volume can churn connections.
4. **Route enforcement is broad but not closure-proven.** There are 145 API route handlers. Many internal routes require internal-token access, and premium product routes show commercial checks, but the current documentation map must be regenerated against all 145 route files before claiming exhaustive route closure.
5. **Provider orchestration remains fixture/dry-run/readiness-oriented.** Registries, fixture adapters, validation shells, dry-run/replay/operator routes, and persistence exist; live payload verification, live credentials, external terms/legal checks, quotas, circuit breakers, and production smoke evidence remain external/environment blockers.
6. **Migration duplicate prefixes are a deployment-order risk, not merely naming.** `0027` and `0028` are duplicated, so tooling that sorts by numeric prefix can have ambiguous execution order even if current SQL contents do not visibly duplicate table creation.
7. **Several historical reasoning items are stale truth-source/naming issues, not runtime defects.** In particular, `assertMarketAssetCausalityMatrixComplete()` validates descriptor-shape integrity while the returned coverage explicitly has `complete: false` and phase gaps; the function name overclaims completion.
8. **Confidence-floor saturation is preserved.** The 33-scenario suite and deterministic tests exist; 25 zero-confidence deterministic golden scenarios were not recalibrated in this audit. Future calibration requires live provider data, empirical backtesting, and scenario evidence review.

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

The route map documentation is useful but cannot be treated as proof of exhaustive runtime enforcement because the audit found it must be compared route-by-route against all 145 live handlers.

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

Validation commands run on `codex/post-r9-repository-closure-audit` after creating only the two audit documents:

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
- `git status --short`: only the two permitted audit documents are untracked/changed before commit.
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
- Proposed cleanup batch: RC-A or RC-F depending on whether only contract tests or live provider metadata are involved.
- Explicit non-goals: do not change confidence penalties or golden scenario anchors in this audit.
- Confidence: `strongly_indicated`.

### F-005 — DXY and VIX are diagnostic/reasoning assets, not fully launch-tradable/provider-covered assets

- Domain: asset vocabulary.
- Classification: `partially_resolved`.
- Severity: `documentation_only`.
- Exact files: `packages/types/src/*market*`, `services/reasoning/src/asset-causality-map/index.ts`, `services/reasoning/src/golden-scenarios/index.ts`, `services/reasoning/src/crypto-risk-liquidity/index.ts`, frontend asset contracts under `apps/web`.
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
- Exact files: `services/reasoning/src/golden-scenarios/index.ts`, `services/reasoning/src/provider-reliability/index.ts`, `services/reasoning/src/weighted-evidence-snapshot/*`, `apps/web/app/api/admin/market-evidence/*`, scheduled-ingestion routes.
- Current behavior: reasoning can consume supplied provider reliability and source context; fixture/golden paths prove sensitivity. Live ingestion-to-frontend payload context requires configured providers and production data.
- Evidence: golden tests mutate provider metadata and confidence changes; production status docs still block live provider activation.
- Why it matters: production cognition claims require live source provenance, not only fixture context.
- Reachable runtime: partially; fixture/admin routes reachable, live provider path gated by env/activation.
- Existing tests: provider reliability and golden scenario tests.
- Missing tests: staging/live payload replay using official provider schemas.
- Dependency/blocker: provider credentials, legal/terms approval, rate limits, staging smoke.
- Recommended remediation boundary: staging verification batch, no formula changes.
- Proposed cleanup batch: RC-F/RC-G.
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
- Proposed cleanup batch: RC-G.
- Explicit non-goals: do not recalibrate now.
- Confidence: `strongly_indicated`.

### F-008 — Adapter reality is fixture/shell-heavy and live activation remains blocked

- Domain: providers/ingestion.
- Classification: `external_activation_blocker`.
- Severity: `pre_production_blocking`.
- Exact files: `packages/providers`, `services/ingestion`, `services/reasoning/src/*provider*`, `docs/provider-live-activation-readiness.md`, `docs/backend-open-loop-register.md`.
- Current behavior: registry/source descriptors exist; many adapters are fixture-only or dry-run shells; production-live execution, credentials, legal approvals, official-schema live verification, and smoke evidence are absent.
- Evidence: open-loop docs list provider keys, smoke tests, rate limits, response schemas, retries/timeouts/circuit breakers, rollback approval, and legal/terms as unchecked.
- Why it matters: registry presence must not be counted as adapter completion.
- Reachable runtime: fixture/dry-run paths yes; live paths blocked.
- Existing tests: fixture/smoke-like unit and route tests.
- Missing tests: live staging provider smoke and schema validation.
- Dependency/blocker: credentials and provider activation.
- Recommended remediation boundary: provider activation hardening after persistence/auth route closure.
- Proposed cleanup batch: RC-E/RC-F.
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
- Proposed cleanup batch: RC-E.
- Explicit non-goals: no retry implementation in audit.
- Confidence: `proven` for linear helper, `requires_runtime_verification` for worker claim behavior.

### F-010 — Operational provider protections are partial

- Domain: providers/ops.
- Classification: `verified_open_loop`.
- Severity: `operational_risk`.
- Exact files: `services/ingestion`, `services/reasoning/src/scheduled-ingestion`, `packages/providers`, provider admin routes, docs runbooks.
- Current behavior: schema validation, dry-run/replay, duplicate decisions, payload inspection, and observability shells exist. Quotas, circuit breakers, request coalescing, stale-if-error, fallback, concurrency limits, live rate-limit accounting, and malformed live response handling are not proven.
- Evidence: open-loop docs still track provider rate limits, retries/timeouts/circuit breakers, and response schema verification.
- Why it matters: production providers can fail or rate-limit unpredictably.
- Reachable runtime: partial in dry-run/admin flows; live external protections unproven.
- Existing tests: fixture/dry-run tests.
- Missing tests: provider failure-mode integration tests.
- Dependency/blocker: provider credentials and staging instrumentation.
- Recommended remediation boundary: RC-E then RC-G.
- Proposed cleanup batch: RC-E.
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
- Recommended remediation boundary: RC-G.
- Proposed cleanup batch: RC-G.
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
- Proposed cleanup batch: RC-B.
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
- Proposed cleanup batch: RC-C.
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
- Proposed cleanup batch: RC-B.
- Explicit non-goals: do not fix in audit.
- Confidence: `proven`.

### F-015 — Social identifier readiness is partial

- Domain: profile/commercial readiness.
- Classification: `verified_defect`.
- Severity: `operational_risk`.
- Exact files: `apps/web/lib/server/profile/social-identifiers-store.ts`, `apps/web/app/api/account/profile/social-identifiers/route.ts`, `infra/db/schema/0035_user_social_identifiers.sql`.
- Current behavior: validation/normalization and SQL upsert/read exist; missing row returns blocked readiness; memory fallback exists. Pool lifecycle is defective, and payment-readiness coupling still depends on social identifier presence without proving ownership or provider verification.
- Evidence: store validates identifiers and returns `missing_social_identifier` when absent; SQL pool lifecycle defect described in F-012.
- Why it matters: checkout readiness can depend on unverified social IDs, while DB connection churn can break production reliability.
- Reachable runtime: yes.
- Existing tests: route/runtime stubs.
- Missing tests: SQL constraints, ownership verification, data exposure, failed-query behavior.
- Dependency/blocker: RC-B.
- Recommended remediation boundary: social identifier persistence and readiness hardening.
- Proposed cleanup batch: RC-B/RC-D.
- Explicit non-goals: no payment activation.
- Confidence: `proven` for pool defect; `strongly_indicated` for ownership readiness gap.

### F-016 — Billing and notification durability are partially implemented but operational closure remains open

- Domain: billing/notifications.
- Classification: `verified_open_loop`.
- Severity: `pre_production_blocking`.
- Exact files: `services/application-state/src/persistence/*billing*`, `services/notifications`, notification migrations, billing routes, internal billing routes.
- Current behavior: transactional-looking repositories, idempotency records, response storage, provider events, reconciliation, policy transitions, notification outbox/targets/inbox exist. Full outbox failure recovery, dead-letter handling, replay handling, live provider callbacks, and operator inspection are not closure-proven.
- Evidence: open-loop docs keep payment provider docs verification, webhook raw-body end-to-end, sandbox checkout, idempotency finalization, entitlement mutation after webhook, and notification provider decisions unchecked.
- Why it matters: billing/notification operations must be restart-safe and replay-safe before production claims.
- Reachable runtime: partial with internal/fixture paths; live provider operations blocked.
- Existing tests: route runtime and service tests.
- Missing tests: webhook live replay, outbox failure recovery, dead-letter inspection.
- Dependency/blocker: RC-C/RC-D, provider credentials.
- Recommended remediation boundary: commercial/auth durable closure before live provider activation.
- Proposed cleanup batch: RC-C/RC-G.
- Explicit non-goals: no external payments/notifications activation.
- Confidence: `strongly_indicated`.

### F-017 — Route entitlement map is not exhaustive proof of live enforcement

- Domain: route/auth/entitlements.
- Classification: `verified_open_loop`.
- Severity: `pre_staging_blocking`.
- Exact files: `apps/web/app/api/**/route.ts`, `apps/web/lib/server/auth`, `apps/web/lib/server/security`, `docs/route-entitlement-enforcement-map.md`.
- Current behavior: 145 route files exist; many routes use auth, internal-token, commercial entitlement, rate/idempotency/audit helpers. Exhaustive per-route method/auth/owner/commercial/rate/audit/test mapping has not been generated in this audit document, and route map docs may lag live routes.
- Evidence: route enumeration found 145 handlers; examples show internal routes using `requireInternalRouteAccess()` and premium product routes using `guardRouteCommercialEntitlement()`.
- Why it matters: production closure requires no feature-only guard gaps, no header-only ownership, no internal route token omissions, and no stale route map entries.
- Reachable runtime: yes.
- Existing tests: route runtime tests cover representative routes.
- Missing tests: generated exhaustive route matrix vs map.
- Dependency/blocker: RC-D after persistence/auth cleanup.
- Recommended remediation boundary: build route inventory tooling or static table and close enforcement gaps.
- Proposed cleanup batch: RC-D.
- Explicit non-goals: no route changes in audit.
- Confidence: `strongly_indicated`.

### F-018 — Duplicate migration prefixes create deployment-order ambiguity

- Domain: database/migrations.
- Classification: `verified_open_loop`.
- Severity: `operational_risk`.
- Exact files: `infra/db/schema/0027_billing_lifecycle.sql`, `infra/db/schema/0027_billing_runtime.sql`, `infra/db/schema/0028_billing_policy_transitions.sql`, `infra/db/schema/0028_payment_provider_boundary.sql`, `docs/backend-open-loop-register.md`.
- Current behavior: duplicate numeric prefixes `0027` and `0028` exist. Open-loop register tracks this issue.
- Evidence: `git ls-files infra/db/schema/*` shows two `0027` and two `0028` files.
- Why it matters: migration runners sorting by numeric prefix may execute ambiguous order or treat duplicates as already-applied.
- Reachable runtime: deployment-time.
- Existing tests: `check:migrations` is required; result recorded separately.
- Missing tests: migration rehearsal/rollback on clean database.
- Dependency/blocker: migration strategy decision.
- Recommended remediation boundary: migration verification/rehearsal batch; do not rename in audit.
- Proposed cleanup batch: RC-F.
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
- Proposed cleanup batch: RC-G/RC-H.
- Explicit non-goals: no infra activation in audit.
- Confidence: `requires_runtime_verification`.

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
| C4 | Social identifier readiness | `verified_defect` | `operational_risk` | Store exists but pool lifecycle and readiness/ownership concerns remain. |
| C5 | Billing and notification durability | `verified_open_loop` | `pre_production_blocking` | Persistence exists; live provider/outbox/dead-letter closure unproven. |
| D | Route/auth/ownership/entitlement enforcement | `verified_open_loop` | `pre_staging_blocking` | 145 routes require exhaustive generated closure; docs not sufficient. |
| E | Database and migrations | `verified_open_loop` | `operational_risk` | Duplicate prefixes are real deployment-order risk until rehearsed/resolved. |
| F | Security/infrastructure/production ops | `environment_verification_required` | `pre_production_blocking` | Gates/runbooks exist; WAF/smoke/attack/backup/monitoring need env proof. |

## 7. Newly discovered defects

- N-001/F-014: Commercial SQL/memory consistency defect is confirmed and merge-blocking for any follow-up cleanup branch that touches commercial persistence.
- N-002/F-012: Social identifier per-query pool lifecycle defect is confirmed.
- N-003/F-017: Route-enforcement documentation cannot be considered exhaustive against the 145 live route handlers.
- N-004/F-018: Duplicate migration prefixes are confirmed as a real deployment-order risk, not just stale documentation.

## 8. Runtime reachability analysis

- Reasoning descriptor/assertion paths are reachable through service tests and canonical boundary methods; they do not prove live provider readiness.
- Provider context reaches reasoning when supplied by fixtures/golden scenarios and admin/inspection assembly paths. Live provider-to-frontend reachability requires credentials and activation gates.
- Commercial SQL/memory defect is reachable in current runtime when `APP_STATE_REPOSITORY=sql` and `DATABASE_URL` are present.
- Step-up process-local state is reachable through admin step-up and commercial mutation routes; non-fixture providers intentionally return pending.
- Social identifier pool lifecycle is reachable through account profile social identifier route in SQL mode.
- Scheduled-ingestion retry metadata is reachable through scheduled-ingestion services/routes; actual restart-safe retry worker claiming remains unproven.
- Migration duplicate-prefix risk is reachable at deployment/migration-run time.
- Smoke/attack drills are reachable only in configured staging/production environments.

## 9. Documentation-versus-code contradictions

- Foundation completion is sometimes described near live/provider/empirical pending states without a strict taxonomy; docs should separate deterministic foundation, live provider integration, empirical validation, and production calibration.
- `assertMarketAssetCausalityMatrixComplete()` contradicts `coverageReport.complete: false` unless “complete” is read narrowly as descriptor-shape completeness.
- Route entitlement map documentation should not claim exhaustive enforcement unless generated against all 145 current route handlers.
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
- Exhaustive route enforcement matrix generation and gaps closure.
- Provider orchestration hardening: retry execution, worker claiming, rate-limit accounting, circuit breakers, quotas, stale-if-error, fallback, and payload limits.
- Migration prefix/order resolution or migration runner proof.

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

## 17. Audit limitations

- No remote `origin` was configured, so `git pull --ff-only` could not be completed; the audited local SHA matched the expected baseline.
- The audit was evidence-based and static/runtime-test based; no external providers were activated.
- No production credentials, staging URLs, WAF, payment, notification, backup, or monitoring systems were available for live verification.
- Full route closure requires generated per-route matrix artifacts beyond this audit document.
- Validation command outputs are reported separately and honestly; environment-dependent commands are not counted as code failures when required variables are absent.
