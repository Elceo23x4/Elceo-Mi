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
6. **Migration duplicate prefixes are deterministic under the current checker but remain an operator-compatibility risk.** `0027` and `0028` are duplicated; `scripts/check-db-migrations.mjs` reports deterministic full-filename lexicographic order, so ambiguity is not proven unless an external executor keys only by numeric prefix.
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
- Exact files: `packages/providers/src/index.ts`, `services/ingestion/src/provider.ts`, `services/reasoning/src/provider-source-registry/source-registry.ts`, `services/reasoning/src/provider-reliability/index.ts`, `docs/provider-live-activation-readiness.md`, `docs/backend-open-loop-register.md`.
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
- Classification: `partially_resolved`.
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
- Exact files: `services/application-state/src/persistence/billing-lifecycle-repository.ts`, `services/application-state/src/persistence/billing-orchestration-repository.ts`, `services/application-state/src/persistence/billing-policy-repository.ts`, `services/notifications/src`, `infra/db/schema/0011_notification_decisions.sql`, `infra/db/schema/0012_notification_delivery_outbox.sql`, `infra/db/schema/0013_notification_targets_and_inbox.sql`, `apps/web/app/api/billing/checkout/route.ts`, `apps/web/app/api/billing/webhook/route.ts`, `apps/web/app/api/internal/billing/reconcile/route.ts`.
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
- Exact files: the complete route matrix in section 17A, `apps/web/lib/server/auth.ts`, `apps/web/lib/server/security.ts`, `docs/route-entitlement-enforcement-map.md`.
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
| C4 | Social identifier readiness | `partially_resolved` | `operational_risk` | Store exists and owner-boundary routing is present; the pool lifecycle concern is counted in F-012, while external LinkedIn/Telegram/X ownership verification remains a policy decision/open loop mapped to `partially_resolved`. |
| C5 | Billing and notification durability | `verified_open_loop` | `pre_production_blocking` | Persistence exists; live provider/outbox/dead-letter closure unproven. |
| D | Route/auth/ownership/entitlement enforcement | `verified_open_loop` | `pre_staging_blocking` | 145 routes require exhaustive generated closure; docs not sufficient. |
| E | Database and migrations | `verified_open_loop` | `operational_risk` | Duplicate prefixes are deterministic in current full-filename lexicographic checker; remaining risk is external-tool/operator compatibility plus staging rehearsal. |
| F | Security/infrastructure/production ops | `environment_verification_required` | `pre_production_blocking` | Gates/runbooks exist; WAF/smoke/attack/backup/monitoring need env proof. |

## 7. Newly discovered defects

- N-001/F-014: Commercial SQL/memory consistency defect is confirmed and merge-blocking for any follow-up cleanup branch that touches commercial persistence.
- N-002/F-012: Social identifier per-query pool lifecycle defect is confirmed.
- N-003/F-017: Route-enforcement documentation cannot be considered exhaustive against the 145 live route handlers.
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


## 17A. Surgical PR #167 audit-completion addendum

This addendum supersedes any earlier family-level route/provider/migration summaries where it is more specific.

### F-020 — Client-supplied step-up verification can bypass server challenge consumption

- Domain: security/commercial mutation trust boundary.
- Classification: `verified_defect`.
- Severity: `pre_staging_blocking`.
- Exact files: `packages/schemas/src/super-admin-commercial-controls.schema.ts`, `apps/web/app/api/admin/commercial/users/[userId]/gift-focus-plan/route.ts`, `apps/web/app/api/admin/commercial/users/[userId]/retract-focus-gift/route.ts`, `apps/web/app/api/admin/commercial/users/[userId]/restrict/route.ts`, `services/application-state/src/super-admin-commercial-controls/index.ts`.
- Exact symbols/routes/tables: `validateSuperAdminStepUpVerification()`, `/api/admin/commercial/users/[userId]/gift-focus-plan`, `/api/admin/commercial/users/[userId]/retract-focus-gift`, `/api/admin/commercial/users/[userId]/restrict`, `giftFocusPlanToUser()`, `retractFocusPlanGift()`, `restrictUserAccount()`, `assertSuperAdminStepUpFresh()`, `super_admin_step_up_challenges`.
- Current behavior: `validateSuperAdminStepUpVerification()` accepts a client object with `status: "verified"`, `challengeId: null`, and `verifiedAt: null`; commercial mutation routes pass `body.stepUpVerification` directly; the gift route performs route-level staleness logic only when `verifiedAt` is supplied; `giftFocusPlanToUser()` calls `assertSuperAdminStepUpFresh()` only when a challenge ID exists; `retractFocusPlanGift()` and `restrictUserAccount()` accept a supplied verified status without server-side challenge resolution or freshness; stored challenge actor/action/route scope/target are not bound to later commercial mutations.
- Evidence: the schema validator permits null challenge/timestamp values when enum fields are valid; the three commercial mutation routes validate body-supplied step-up and pass `step.value` to service calls; service-side assertion checks only `status === 'verified'` for retraction/restriction and only conditionally checks freshness for gift when `challengeId` exists.
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
| D | Route audit is now backed by the complete 145-route matrix below; the three commercial step-up mutation routes are `gap_found`. |
| E | Duplicate prefixes are deterministic under `scripts/check-db-migrations.mjs` full-filename lexicographic order; risk is external-tool/operator compatibility plus staging rehearsal. |

### Corrected social-identifier disposition

The social identifier route requires an authenticated subject, reads/writes that subject's own ID, and uses the owner-boundary subject helper. The pool lifecycle defect remains F-012 only. External proof that a LinkedIn, Telegram, or X identifier is owned by the authenticated user is a policy decision/open loop unless an approved product/security contract requires verified ownership; because `policy_decision_or_open_loop` is not an allowed primary classification, this audit maps it to `partially_resolved` under F-015 and states the uncertainty explicitly.

### Corrected duplicate-prefix conclusion

The duplicate prefixes are deterministic under the current repository checker and documented full-filename lexicographic ordering. No repository migration executor was found that keys only by numeric prefix. The remaining risk is compatibility/operator risk for external tools, plus staging rehearsal and readiness checklist reconciliation. Renumbering must not occur without a migration-state strategy.

### Complete route matrix totals

- Total routes: 145.
- `verified`: 134.
- `partial`: 6.
- `gap_found`: 3.
- `environment_verification_required`: 1.
- `not_applicable`: 1.

| Route | Methods | Auth helper | Internal token | Feature/role | Commercial guard | Owner boundary | Target boundary | Restriction first | Security decision | Idempotency | Validation | Audit | Live block | Existing test | Status | Gap |
|---|---:|---|---:|---|---:|---|---|---|---:|---:|---|---:|---|---|---|---|
| /api/account/access-check | POST | requireAuthenticatedSubject | no | none | no | yes | subject | yes | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/account/access-decisions | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/account/billing/events | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/account/billing/policy | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/account/billing/policy/transitions | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/account/billing/reconciliation-runs | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/account/billing | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/account/entitlements | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/account/profile/social-identifiers | GET,PATCH | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/account/usage | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/audit | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | unclear | none | not_observed | no | no | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/billing/activate | POST | requireInternalRouteAccess | yes | none | no | unclear | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/billing/cancel-at-period-end | POST | requireInternalRouteAccess | yes | none | no | unclear | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/billing/change-plan | POST | requireInternalRouteAccess | yes | none | no | unclear | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/billing/expire | POST | requireInternalRouteAccess | yes | none | no | unclear | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/billing/operations/failures | GET | requireInternalRouteAccess+requireFeatureAccess | yes | admin.ops | no | unclear | none | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/billing/operations/retry-candidates | GET | requireInternalRouteAccess+requireFeatureAccess | yes | admin.ops | no | unclear | none | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/billing/operations/subject | GET | requireInternalRouteAccess+requireFeatureAccess | yes | admin.ops | no | unclear | subject | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/billing/operations/summary | GET | requireInternalRouteAccess+requireFeatureAccess | yes | admin.ops | no | unclear | none | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/billing/orchestration/latest | GET | requireInternalRouteAccess+requireFeatureAccess | yes | admin.ops | no | unclear | subject | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/billing/orchestration/runs | GET | requireInternalRouteAccess+requireFeatureAccess | yes | admin.ops | no | unclear | subject | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/billing/orchestration/subject | GET | requireInternalRouteAccess+requireFeatureAccess | yes | admin.ops | no | unclear | subject | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/billing/past-due | POST | requireInternalRouteAccess | yes | none | no | unclear | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/billing/pause | POST | requireInternalRouteAccess | yes | none | no | unclear | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/billing/policy | GET | requireInternalRouteAccess | yes | none | no | unclear | subject | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/billing/policy/transitions | GET | requireInternalRouteAccess | yes | none | no | unclear | subject | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/billing/provider-events | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | unclear | subject | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/billing/provider-plan-mapping | POST | requireInternalRouteAccess+requireFeatureAccess | yes | admin.ops | no | unclear | none | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/billing/provider-plan-mappings | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | unclear | none | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/billing/renew | POST | requireInternalRouteAccess | yes | none | no | unclear | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/billing/resume | POST | requireInternalRouteAccess | yes | none | no | unclear | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/billing/trial | POST | requireInternalRouteAccess | yes | none | no | unclear | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/commercial/metrics | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | unclear | none | yes | no | no | yes | no | blocked | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/commercial/users/{userId}/control-snapshot | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | admin_target | path_userId | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/commercial/users/{userId}/gift-focus-plan | POST | requireInternalRouteAccess+requireFeatureAccess | yes | admin.ops | yes | admin_target | path_userId | yes | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | gap_found | F-020 client-supplied stepUpVerification is trusted; challenge/freshness/action/target not server-bound |
| /api/admin/commercial/users/{userId}/restrict | POST | requireInternalRouteAccess+requireFeatureAccess | yes | admin.ops | yes | admin_target | path_userId | yes | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | gap_found | F-020 client-supplied stepUpVerification is trusted; challenge/freshness/action/target not server-bound |
| /api/admin/commercial/users/{userId}/retract-focus-gift | POST | requireInternalRouteAccess+requireFeatureAccess | yes | admin.ops | yes | admin_target | path_userId | yes | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | gap_found | F-020 client-supplied stepUpVerification is trusted; challenge/freshness/action/target not server-bound |
| /api/admin/entitlements/override | POST | requireInternalRouteAccess | yes | none | no | unclear | subject | yes | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/entitlements/plan | POST | requireInternalRouteAccess | yes | none | no | unclear | subject | yes | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/entitlements/state | POST | requireInternalRouteAccess | yes | none | no | unclear | subject | yes | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/freshness | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | unclear | none | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/market-evidence/cognition | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | unclear | none | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/market-evidence/inspection | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | unclear | none | not_observed | no | no | yes | no | blocked | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/market-evidence/payload-replay | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | unclear | none | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/market-evidence/payloads | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | unclear | none | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/market-evidence/provider-request | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | unclear | none | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/market-evidence/provider-response | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | unclear | none | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/market-evidence/quality | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | unclear | none | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/market-evidence/reasoning-input | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | unclear | none | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/market-evidence/scheduled-ingestion/dry-run | POST | requireInternalRouteAccess+requireFeatureAccess | yes | admin.ops | no | unclear | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/market-evidence/scheduled-ingestion/inspection | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | unclear | none | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/market-evidence/scheduled-ingestion/policies | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | unclear | none | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/market-evidence/scheduled-ingestion/replay | GET,POST | requireInternalRouteAccess+requireFeatureAccess | yes | admin.ops | no | unclear | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/market-evidence/scheduled-ingestion/runs | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | unclear | none | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/market-evidence/weighted | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | unclear | none | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/ops | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | unclear | none | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/providers | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | unclear | none | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/security/step-up/challenge | POST | requireInternalRouteAccess+requireFeatureAccess | yes | admin.ops | no | unclear | subject | not_observed | no | no | yes | no | blocked | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/security/step-up/readiness | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | unclear | none | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/security/step-up/verify | POST | requireInternalRouteAccess+requireFeatureAccess | yes | admin.ops | no | unclear | subject | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/seo/feed | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | unclear | none | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/seo/sitemap | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | unclear | none | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/admin/system-summary | GET | requireInternalRouteAccess+requireFeatureAccess | yes | feature_access | no | unclear | none | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/analytics/generate | POST | requireFeatureAccess | no | feature_access | no | yes | subject | not_observed | yes | yes | partial | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/analytics/latest | GET | requireFeatureAccess | no | feature_access | yes | yes | subject | yes | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/analytics/top-behaviors | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/analytics/top-setups | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/app-state/alerts | GET,PATCH | none_detected | no | none | no | unclear | none | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/app-state/me | GET | none_detected | no | none | no | unclear | none | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/app-state/onboarding | POST | none_detected | no | none | no | unclear | none | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/app-state/settings | PATCH | none_detected | no | none | no | unclear | none | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/app-state/watchlist | PATCH | none_detected | no | none | no | unclear | none | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/auth/{...nextauth} |  | none_detected | no | none | no | unclear | none | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | not_applicable | NextAuth handler boundary |
| /api/billing/checkout | POST | none_detected | no | none | yes | yes | none | yes | no | no | partial | no | blocked | apps/web/tests/route-runtime.test.ts | partial | static audit did not prove full auth/owner/commercial/rate/audit chain |
| /api/billing/portal | POST | none_detected | no | none | no | yes | none | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | partial | static audit did not prove full auth/owner/commercial/rate/audit chain |
| /api/billing/subscription | GET | none_detected | no | none | no | unclear | none | yes | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | partial | static audit did not prove full auth/owner/commercial/rate/audit chain |
| /api/billing/webhook | POST | none_detected | no | none | no | yes | none | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | environment_verification_required | provider/webhook environment verification |
| /api/coaching/action-plan | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/coaching/focus | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/coaching/generate | POST | requireFeatureAccess | no | feature_access | no | yes | subject | not_observed | yes | yes | partial | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/coaching/latest | GET | requireFeatureAccess | no | feature_access | yes | yes | subject | yes | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/dashboard/{asset} | GET | none_detected | no | none | no | unclear | none | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | partial | static audit did not prove full auth/owner/commercial/rate/audit chain |
| /api/internal/billing/orchestration/retry | POST | requireInternalRouteAccess+requireFeatureAccess | yes | admin.ops | no | unclear | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/internal/billing/policy/evaluate | POST | requireInternalRouteAccess+requireFeatureAccess | yes | admin.ops | no | unclear | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/internal/billing/provider-events/replay | POST | requireInternalRouteAccess+requireFeatureAccess | yes | admin.ops | no | unclear | none | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/internal/billing/provider-events | POST | requireInternalRouteAccess | yes | none | no | unclear | none | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/internal/billing/reconcile/retry | POST | requireInternalRouteAccess+requireFeatureAccess | yes | admin.ops | no | unclear | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/internal/billing/reconcile | POST | requireInternalRouteAccess+requireFeatureAccess | yes | admin.ops | no | unclear | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/internal/market-evidence/tiingo/fixture-ingest | POST | requireInternalRouteAccess+requireFeatureAccess | yes | admin.ops | no | yes | subject | not_observed | yes | yes | yes | yes | blocked | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/journal/analytics | GET | none_detected | no | none | no | unclear | none | yes | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | partial | static audit did not prove full auth/owner/commercial/rate/audit chain |
| /api/journal/cases/{caseId}/adjust | POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/journal/cases/{caseId}/cancel | POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/journal/cases/{caseId}/close | POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/journal/cases/{caseId}/execute | POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/journal/cases/{caseId}/partial-close | POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/journal/cases/{caseId}/plan | POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/journal/cases/{caseId}/replay | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/journal/cases/{caseId}/review | POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/journal/cases/{caseId} | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/journal/cases | GET,POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/journal/entries | GET,POST | none_detected | no | none | no | unclear | none | yes | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | partial | static audit did not prove full auth/owner/commercial/rate/audit chain |
| /api/journal/influence/generate | POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | partial | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/journal/influence/latest | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/notifications/delivery/dispatch | POST | requireInternalRouteAccess | yes | none | no | unclear | none | not_observed | yes | yes | partial | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/notifications/health | GET | requireAuthenticatedSubject | no | none | no | yes | none | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/notifications/inbox | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/notifications/subscriptions/{subscriptionId} | PATCH | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/notifications/subscriptions | GET,POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/notifications/summary | GET | requireFeatureAccess | no | feature_access | yes | yes | subject | yes | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/notifications/targets/{targetId}/disable | POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | partial | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/notifications/targets/{targetId}/enable | POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | partial | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/notifications/targets | GET,POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/notifications/verification/consume | POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/notifications/verification/issue | POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/ops/notifications/expire-verifications | POST | requireInternalRouteAccess+requireFeatureAccess | yes | admin.ops | no | unclear | none | not_observed | yes | yes | partial | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/ops/notifications/process-feedback | POST | requireInternalRouteAccess+requireFeatureAccess | yes | admin.ops | no | unclear | none | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/portfolio/actions/{actionId}/complete | POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | partial | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/portfolio/actions/{actionId}/dismiss | POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | partial | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/portfolio/actions/{actionId} | GET,PATCH | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/portfolio/actions | GET,POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/portfolio/attention | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | yes | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/portfolio/positions/{positionId}/cancel | POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/portfolio/positions/{positionId}/close | POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/portfolio/positions/{positionId}/open | POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/portfolio/positions/{positionId}/reduce | POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/portfolio/positions/{positionId} | GET,PATCH | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/portfolio/positions/{positionId}/thesis-health | POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/portfolio/positions | GET,POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/portfolio/replay | GET | requireAuthenticatedSubject | no | none | no | yes | none | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/portfolio/snapshot/current | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/portfolio/snapshot/generate | POST | requireFeatureAccess | no | feature_access | no | yes | subject | not_observed | yes | yes | partial | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/portfolio/watchlist/{entryId}/archive | POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | partial | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/portfolio/watchlist/{entryId} | GET,PATCH | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/portfolio/watchlist/{entryId}/status | POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/portfolio/watchlist/{entryId}/thesis-health | POST | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/portfolio/watchlist | GET,POST | requireFeatureAccess | no | feature_access | yes | yes | subject | yes | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/refresh/freshness | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/refresh/history | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/refresh/latest | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/refresh/run | POST | requireFeatureAccess | no | feature_access | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/workspace/agenda | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/workspace/current | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/workspace/freshness | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/workspace/history | GET | requireAuthenticatedSubject | no | none | no | yes | subject | not_observed | no | no | partial | no | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |
| /api/workspace/refresh | POST | requireFeatureAccess | no | feature_access | no | yes | subject | not_observed | yes | yes | yes | yes | not_applicable | apps/web/tests/route-runtime.test.ts | verified | none |

### Provider-by-provider matrix totals

- Total provider sources from `PROVIDER_SOURCE_IDS`: 43.
- `implemented`: 0.
- `fixture_only`: 1.
- `dry_run_only`: 1.
- `shell_or_descriptor_only`: 40.
- `external_activation_blocker`: 1.
- `not_present`: 0.

| Source ID | Registry descriptor | Real adapter file | Fixture | Dry run | Staging live | Production live | Credentials | Schema validation | Persistence | Scheduler | Retry | Quota/rate | Timeout/circuit | Smoke coverage | Classification | Blocker |
|---|---|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| tiingo_market_data | market_data; status=fixture_ready | absent | yes | yes | no_evidence | no_evidence | api_key_required | yes | yes: provider request/response repositories | yes | metadata_only | not_proven | not_proven | registry_tests_only | external_activation_blocker | live credentials/schema smoke/rate limits not verified |
| public_market_price_exchange | market_data; status=dry_run_ready | absent | yes | yes | no_evidence | no_evidence | none | partial | yes: provider request/response repositories | policy_candidate | metadata_only | not_proven | not_proven | registry_tests_only | dry_run_only | live credentials/schema smoke/rate limits not verified |
| index_futures_shell | market_data; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| fred_macro | macro_official; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| us_treasury_official | macro_official; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| federal_reserve_official | macro_official; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| ecb_official | macro_official; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| boe_official | macro_official; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| boj_official | macro_official; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| eurostat_official | macro_official; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| bls_official | macro_official; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| bea_official | macro_official; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| census_official | macro_official; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| ons_official | macro_official; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| destatis_official | macro_official; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| ifo_shell | macro_official; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| zew_shell | macro_official; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| ism_shell | macro_official; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| cftc_cot | positioning; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | yes | yes: provider request/response repositories | yes | metadata_only | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| marketaux_news | news_extraction; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| newsapi_news | news_extraction; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| gdelt_news | news_extraction; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| finnhub_news | news_extraction; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| firecrawl_extraction | news_extraction; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| sec_edgar | filings_company_etf; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| etf_flows_shell | filings_company_etf; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| earnings_filings_shell | filings_company_etf; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| crypto_exchange_public | crypto; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| crypto_onchain_public | crypto; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| crypto_derivatives_shell | crypto; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| volatility_metric_source | risk_liquidity; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| credit_stress_source | risk_liquidity; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| liquidity_condition_source | risk_liquidity; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| financial_conditions_source | risk_liquidity; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| public_equity_breadth_sources | risk_liquidity; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | yes | yes: provider request/response repositories | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| calculated_internal_conditions | risk_liquidity; status=not_started | services/reasoning/src/provider-sources/stress-conditions/stress-conditions-adapter.ts | yes | no | no_evidence | no_evidence | unknown | yes | yes: provider request/response repositories | no | no | not_proven | not_proven | registry_tests_only | fixture_only | live credentials/schema smoke/rate limits not verified |
| equity_index_breadth_indicator | risk_liquidity; status=not_started | services/reasoning/src/provider-sources/risk-market-structure/risk-market-adapter.ts | no | no | no_evidence | no_evidence | unknown | yes | yes: provider request/response repositories | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| imf_official | macro_official; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| world_bank_official | macro_official; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| oecd_official | macro_official; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| bis_official | macro_official; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| uk_dmo_official | macro_official; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |
| japan_mof_official | macro_official; status=not_started | absent | no | no | no_evidence | no_evidence | unknown | registry_descriptor_only | registry_only | no | no | not_proven | not_proven | registry_tests_only | shell_or_descriptor_only | adapter implementation not started |

### Root migration inventory and corrected readiness state

- Root migration files inventoried: 38.
- Current checker status: full-filename lexicographic order is deterministic and `npm run check:migrations` passes with duplicate-prefix warnings.
- Readiness checklist state: `docs/db-migration-readiness-checklist.md` requires reconciliation because checklist coverage stops before later migrations and does not itself prove clean-apply/repeat-apply/staging rehearsal for all 38 root migrations.

| Pos | Filename | Principal tables/indexes/extensions | Dependencies | Duplicate prefix | Known repository consumers | Clean/repeat/rehearsal status |
|---:|---|---|---|---:|---|---|
| 1 | 0001_init.sql | IF | previous lexicographic schema state | no | services/application-state/src/admin/provider-summary.ts<br>services/application-state/src/tests/admin-control-plane.test.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 2 | 0002_auth_and_application_state.sql | app_user_profiles, app_auth_credentials, app_watchlists, app_notification_settings, app_sessions, idx_app_user_profiles_role, idx_app_user_profiles_plan_tier | previous lexicographic schema state | no | services/application-state/src/repositories/user-state-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 3 | 0003_alerts_admin_observability.sql | app_in_app_alerts, idx_app_in_app_alerts_user_created, idx_app_in_app_alerts_fingerprint, app_audit_logs, idx_app_audit_logs_created | previous lexicographic schema state | no | services/application-state/src/repositories/alert-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 4 | 0004_trade_journal_analytics.sql | app_trade_journal_entries, idx_trade_journal_user_traded, idx_trade_journal_asset | previous lexicographic schema state | no | services/application-state/src/repositories/trade-journal-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 5 | 0005_billing_subscription_lifecycle.sql | app_billing_subscriptions, idx_billing_subscription_status, idx_billing_subscription_plan | previous lexicographic schema state | no | services/application-state/src/persistence/billing-lifecycle-repository.ts<br>services/application-state/src/persistence/billing-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 6 | 0006_ingestion_runtime_history.sql | app_ingestion_runs, idx_ingestion_runs_asset_timeframe_created, idx_ingestion_runs_status_created, idx_ingestion_runs_started_at, app_ingestion_event_snapshots, idx_ingestion_snapshots_run_id, idx_ingestion_snapshots_asset_timeframe_rank, idx_ingestion_snapshots_dedupe_key | previous lexicographic schema state | no | services/ingestion/src/persistence/sql-ingestion-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 7 | 0007_ingestion_scheduler_runtime.sql | idx_ingestion_runs_trigger_slot, idx_ingestion_runs_request_key, app_ingestion_runtime_leases, idx_ingestion_runtime_leases_asset_timeframe_created, idx_ingestion_runtime_leases_expires_at, idx_ingestion_runtime_leases_status_updated | app_ingestion_runs | no | services/ingestion/src/scheduler/lease-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 8 | 0008_ingestion_outbox.sql | app_ingestion_outbox, idx_ingestion_outbox_status_available_created, idx_ingestion_outbox_run_id, idx_ingestion_outbox_asset_timeframe_created, idx_ingestion_outbox_topic_status_created, app_ingestion_outbox_attempts, idx_ingestion_outbox_attempts_outbox_attempted, idx_ingestion_outbox_attempts_success_attempted | previous lexicographic schema state | no | services/ingestion/src/publish/outbox-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 9 | 0009_reasoning_snapshots.sql | app_reasoning_runs, idx_reasoning_runs_asset_timeframe_created, idx_reasoning_runs_source_ingestion_run_id, idx_reasoning_runs_status_created, app_cognition_snapshots, idx_cognition_snapshots_asset_timeframe_evaluated, idx_cognition_snapshots_source_ingestion_run_id, idx_cognition_snapshots_bias_created | previous lexicographic schema state | no | services/reasoning/src/persistence/sql-reasoning-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 10 | 0010_cognition_deltas.sql | app_cognition_deltas, idx_cognition_deltas_asset_timeframe_compared, idx_cognition_deltas_current_snapshot_id, idx_cognition_deltas_severity_created | previous lexicographic schema state | no | services/reasoning/src/persistence/sql-reasoning-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 11 | 0011_notification_decisions.sql | app_notification_decisions, idx_notification_decisions_asset_timeframe_created, idx_notification_decisions_notify_created, idx_notification_decisions_rule_created, idx_notification_decisions_reasoning_run, idx_notification_decisions_drift | previous lexicographic schema state | no | services/notifications/src/persistence/sql-notification-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 12 | 0012_notification_delivery_outbox.sql | app_notification_outbox, idx_notification_outbox_status_available, idx_notification_outbox_decision_id, idx_notification_outbox_channel_status_available, idx_notification_outbox_asset_timeframe_created, app_notification_outbox_attempts, idx_notification_outbox_attempts_outbox_attempted, idx_notification_outbox_attempts_channel_attempted | previous lexicographic schema state | no | services/notifications/src/persistence/sql-notification-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 13 | 0013_notification_targets_and_inbox.sql | app_notification_targets, idx_notification_targets_subject_channel_status, idx_notification_targets_channel_status, idx_notification_targets_active_unique_address, app_notification_subscriptions, idx_notification_subscriptions_subject_channel_enabled, idx_notification_subscriptions_channel_enabled, idx_notification_subscriptions_scope | app_notification_outbox | no | services/notifications/src/persistence/sql-notification-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 14 | 0014_notification_management_keys.sql | idx_notification_targets_target_key_unique, idx_notification_targets_subject_channel_key, idx_notification_subscriptions_subscription_key_unique, idx_notification_subscriptions_subject_channel_key | app_notification_subscriptions, app_notification_targets | no | none found by table-name scan | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 15 | 0015_notification_verifications.sql | app_notification_verifications, idx_notification_verifications_target_status_expiry, idx_notification_verifications_subject_channel_created, idx_notification_verifications_kind_status_created | previous lexicographic schema state | no | services/notifications/src/persistence/sql-notification-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 16 | 0016_notification_orchestration_runs.sql | app_notification_orchestration_runs, idx_notification_orchestration_stage_created, idx_notification_orchestration_reasoning_run, idx_notification_orchestration_status_created | previous lexicographic schema state | no | services/notifications/src/persistence/sql-notification-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 17 | 0017_notification_feedback_and_receipts.sql | app_notification_provider_events, idx_notification_provider_events_provider_occurred, idx_notification_provider_events_provider_message_id, idx_notification_provider_events_outbox_id, idx_notification_provider_events_target_occurred, idx_notification_provider_events_kind_occurred, app_notification_delivery_receipts, idx_notification_delivery_receipts_target_occurred | app_notification_outbox_attempts | no | services/notifications/src/persistence/sql-notification-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 18 | 0018_journal_cases.sql | app_journal_cases, idx_journal_cases_subject_created_at, idx_journal_cases_asset_timeframe_created_at, idx_journal_cases_status_created_at, idx_journal_cases_reasoning_run, idx_journal_cases_snapshot_id, idx_journal_cases_drift_id, app_journal_case_revisions | previous lexicographic schema state | no | services/analytics/src/persistence/case-source.ts<br>services/application-state/src/persistence/journal-case-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 19 | 0019_journal_influence_snapshots.sql | app_journal_influence_snapshots, idx_journal_influence_subject_generated_at, idx_journal_influence_scope_generated_at, idx_journal_influence_subject_scope_generated_at | previous lexicographic schema state | no | services/analytics/src/coaching/persistence/repositories.ts<br>services/application-state/src/persistence/journal-influence-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 20 | 0020_analytics_snapshots.sql | app_analytics_snapshots, idx_analytics_snapshots_subject_generated_at, idx_analytics_snapshots_scope_generated_at, idx_analytics_snapshots_subject_scope_generated_at | previous lexicographic schema state | no | services/analytics/src/coaching/persistence/repositories.ts<br>services/analytics/src/persistence/snapshot-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 21 | 0021_coaching_snapshots.sql | app_coaching_snapshots, idx_coaching_snapshots_subject_generated_at, idx_coaching_snapshots_scope_generated_at, idx_coaching_snapshots_subject_scope_generated_at, idx_coaching_snapshots_analytics_snapshot_id, idx_coaching_snapshots_journal_influence_snapshot_id | previous lexicographic schema state | no | services/analytics/src/coaching/persistence/repositories.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 22 | 0022_portfolio_domain_core.sql | app_portfolio_watchlist_entries, idx_portfolio_watchlist_subject_updated, idx_portfolio_watchlist_asset_tf_updated, idx_portfolio_watchlist_status_updated, idx_portfolio_watchlist_thesis_health_updated, app_portfolio_positions, idx_portfolio_positions_subject_updated, idx_portfolio_positions_asset_tf_updated | previous lexicographic schema state | no | services/application-state/src/persistence/portfolio-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 23 | 0023_workspace_snapshots.sql | app_workspace_snapshots, idx_workspace_snapshots_subject_generated, idx_workspace_snapshots_health_attention_generated, idx_workspace_snapshots_portfolio_snapshot, idx_workspace_snapshots_coaching_snapshot, idx_workspace_snapshots_analytics_snapshot | previous lexicographic schema state | no | services/application-state/src/persistence/workspace-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 24 | 0024_snapshot_refresh_runtime.sql | app_snapshot_refresh_runs, idx_snapshot_refresh_runs_subject_generated, idx_snapshot_refresh_runs_trigger_generated, idx_snapshot_refresh_runs_status_generated, app_snapshot_freshness, uq_snapshot_freshness_scope, idx_snapshot_freshness_subject_updated, idx_snapshot_freshness_state_updated | previous lexicographic schema state | no | services/application-state/src/persistence/refresh-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 25 | 0025_ops_runtime.sql | app_ops_job_leases, idx_ops_job_leases_scope, idx_ops_job_leases_state_expires, idx_ops_job_leases_created_desc, app_ops_job_runs, idx_ops_job_runs_job_created, idx_ops_job_runs_status_created, idx_ops_job_runs_scope_created | previous lexicographic schema state | no | services/application-state/src/persistence/ops-runtime-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 26 | 0027_billing_lifecycle.sql | app_billing_customers, ux_billing_customers_subject_provider, ux_billing_customers_provider_customer, app_billing_subscriptions_lifecycle, ux_billing_subscriptions_subject_provider, ux_billing_subscriptions_provider_subscription, app_billing_reconciliation_runs, idx_billing_recon_runs_subject_created | previous lexicographic schema state | yes | services/application-state/src/billing-admin/query-service.ts<br>services/application-state/src/persistence/billing-lifecycle-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 27 | 0027_billing_runtime.sql | app_billing_subscriptions, idx_billing_subscriptions_subject_updated, idx_billing_subscriptions_state_updated, idx_billing_subscriptions_plan_updated, app_billing_events, idx_billing_events_subscription_occurred, idx_billing_events_subject_occurred, idx_billing_events_kind_occurred | previous lexicographic schema state | yes | services/application-state/src/persistence/billing-lifecycle-repository.ts<br>services/application-state/src/persistence/billing-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 28 | 0028_billing_policy_transitions.sql | app_billing_policy_transitions, idx_app_billing_policy_transitions_subject, idx_app_billing_policy_transitions_provider, idx_app_billing_policy_transitions_decision, idx_app_billing_policy_transitions_severity | previous lexicographic schema state | yes | services/application-state/src/billing-admin/query-service.ts<br>services/application-state/src/persistence/billing-policy-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 29 | 0028_payment_provider_boundary.sql | app_billing_external_customers, idx_abec_subject, idx_abec_email, app_billing_external_subscriptions, idx_abes_subject, idx_abes_customer, idx_abes_plan_updated, app_billing_external_events | previous lexicographic schema state | yes | services/application-state/src/persistence/payment-provider-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 30 | 0029_billing_orchestration_runs.sql | app_billing_orchestration_runs, app_billing_orchestration_runs_subject_idx, app_billing_orchestration_runs_provider_idx, app_billing_orchestration_runs_status_idx | previous lexicographic schema state | no | services/application-state/src/persistence/billing-orchestration-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 31 | 0030_security_runtime.sql | app_security_idempotency_records, idx_security_idempotency_actor, idx_security_idempotency_expires, app_security_rate_limit_counters, uq_security_rate_counter_scope, idx_security_rate_actor, idx_security_rate_policy, app_security_audit_events | previous lexicographic schema state | no | services/application-state/src/persistence/security-runtime-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 32 | 0031_security_idempotency_responses.sql | app_security_idempotency_responses, idx_app_security_idempotency_responses_actor_action_completed, idx_app_security_idempotency_responses_expires_at | previous lexicographic schema state | no | services/application-state/src/persistence/security-runtime-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 33 | 0032_market_evidence_and_seo_snapshots.sql | app_market_evidence_registry_snapshots, idx_market_evidence_registry_snapshots_generated, app_seo_content_architecture_snapshots, idx_seo_content_architecture_snapshots_generated | previous lexicographic schema state | no | services/reasoning/src/persistence/registry-snapshot-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 34 | 0033_market_evidence_ingestion.sql | app_provider_source_requests, idx_provider_source_requests_provider_capability_requested, idx_provider_source_requests_asset_requested, idx_provider_source_requests_region_requested, app_provider_source_responses, idx_provider_source_responses_provider_capability_fetched, idx_provider_source_responses_status_fetched, app_normalized_market_evidence_payloads | previous lexicographic schema state | no | services/reasoning/src/persistence/market-evidence-ingestion-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 35 | 0034_market_evidence_scheduled_ingestion_runs.sql | app_market_evidence_scheduled_ingestion_runs, idx_app_sched_ing_runs_job_started, idx_app_sched_ing_runs_provider_cap_started, idx_app_sched_ing_runs_asset_started, idx_app_sched_ing_runs_region_started, idx_app_sched_ing_runs_status_started, idx_app_sched_ing_runs_staleness_started | previous lexicographic schema state | no | services/reasoning/src/persistence/scheduled-ingestion-repository.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 36 | 0035_user_social_identifiers.sql | app_user_social_identifiers, app_user_social_identifiers_updated_at_idx | previous lexicographic schema state | no | apps/web/lib/server/profile/social-identifiers-store.ts<br>services/application-state/src/commercial-entitlements/user-social-identifiers.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 37 | 0036_super_admin_commercial_controls.sql | super_admin_focus_plan_gifts, idx_super_admin_focus_plan_gifts_target, super_admin_user_restrictions, idx_super_admin_user_restrictions_target | previous lexicographic schema state | no | services/application-state/src/super-admin-commercial-controls/index.ts | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |
| 38 | 0037_super_admin_step_up_challenges.sql | super_admin_step_up_challenges, idx_super_admin_step_up_challenges_actor_status, idx_super_admin_step_up_challenges_expires_at | previous lexicographic schema state | no | none found by table-name scan | clean apply not run in audit; check:migrations lexicographic order passed; repeat apply/rehearsal pending |

### Representative confidence penalty traces for zero-confidence scenarios

These traces preserve the 25-of-33 zero-confidence observation and do not recalibrate. Amounts are from deterministic confidence-calibration rules; final zero in these representatives starts from scenario anchor/base confidence 0, so penalties and caps preserve the floor.

| Scenario | Domain | Base confidence | Readiness/evidence bonuses | Named penalties and amounts | Provider cap | Diagnostic cap | Floor/final |
|---|---|---:|---:|---|---|---|---:|
| `c6r9_us_cpi_upside_nasdaq_pressure` | macro/equity event | 0 | none | `missing_price_confirmation` 14 from event-sensitive unconfirmed price; possible `missing_provider_reliability` 8 when provider context absent in calibration input | `<=79` if missing provider reliability applies | none | 0 |
| `c6r9_sp500_bullish_credit_stress_tension` | equity contradiction | 0 | none | `excessive_contradiction_count` 7 per moderate tension; `missing_provider_reliability` 8 if provider context absent; price confirmation remains pending when event-sensitive | `<=79` if missing provider reliability applies | none | 0 |
| `c6r9_fixture_only_provider_high_extraction_capped` | provider-gap/fixture-only | 0 | high extraction does not add enough because fixture-only context is capped | `provider_activation_gap` 13 when provider activation gap warning is present; `missing_provider_reliability` 8 if system reliability is absent | fixture/provider reliability cap from provider context; cannot reach very high | none | 0 |
| `c6r9_dxy_diagnostic_limited_basket_context` | DXY diagnostic macro/FX | 0 | none | `diagnostic_only_dxy` 8; `missing_provider_reliability` 8 if provider reliability context absent; possible `provider_activation_gap` 13 when activation gap warning present | `<=79` for missing provider reliability | DXY diagnostic cap `<=79` | 0 |
| `c6r9_macro_bullish_reversed_price_reaction` | price reaction | 0 | none | `high_contradiction_severity` 12 for reversed price reaction; `missing_provider_reliability` 8 if provider context absent | `<=79` if missing provider reliability applies | none | 0 |

Recurring combinations across the 25 zero-confidence results: base/anchor confidence of 0; missing or pending price confirmation; provider activation or reliability gaps; contradiction/tension penalties; diagnostic caps for DXY/VIX-style contexts; and final clamp/floor preserving 0 rather than recalibrating upward without live/empirical evidence.

## 17. Audit limitations

- No remote `origin` was configured, so `git pull --ff-only` could not be completed; the audited local SHA matched the expected baseline.
- The audit was evidence-based and static/runtime-test based; no external providers were activated.
- No production credentials, staging URLs, WAF, payment, notification, backup, or monitoring systems were available for live verification.
- Full route closure requires generated per-route matrix artifacts beyond this audit document.
- Validation command outputs are reported separately and honestly; environment-dependent commands are not counted as code failures when required variables are absent.
