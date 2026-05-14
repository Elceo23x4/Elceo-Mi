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


## C5-A2 persistence readiness note
- [ ] Market evidence registry snapshot migration applied (`0032_market_evidence_and_seo_snapshots.sql`).
- [ ] SEO architecture snapshot migration applied (`0032_market_evidence_and_seo_snapshots.sql`).
- [ ] Replay/query checks validated against persisted snapshot records only.

- [ ] C5-A3 provider source + normalization foundation contracts validated (types/schemas/tests).
- [ ] Provider capability registry snapshot contract verified with launchEnabled=false descriptors until live integration batch.


## C5-A4 readiness note
- [ ] Tiingo-compatible adapter foundation validated in fixture/no-network mode only.
- [ ] `TIINGO_API_KEY` is **not required** for current tests/build because live adapter activation is deferred.
- [ ] Future live activation must add explicit env + scheduler integration checks (C5-A5/C5+).

## C5-A5 note
- Provider source requests/responses and normalized market evidence payloads are now durably persisted with memory+SQL repositories, strict serialization/replay helpers, and adapter-agnostic ingestion persistence services.
- Tiingo fixture adapter persistence is covered in runtime tests with no external API calls and no secret storage.
- Live provider scheduling and route exposure remain out of scope for future batches.

## C5-A6 note
- Added internal-only fixture ingestion trigger: `POST /api/internal/market-evidence/tiingo/fixture-ingest` (internal token + `admin.ops` + runtime security `internal_mutation`).
- Trigger executes `runTiingoFixtureIngestion` through canonical market intelligence runtime using fixture-only Tiingo adapter (no live network calls, no `TIINGO_API_KEY`).
- Ingestion persists provider request/response/normalized payload lifecycle and supports payload query/replay.
- Future C5-A7 live activation requirements remain: `TIINGO_API_KEY`, provider health checks, scheduler integration, production rate-limit policy, staging smoke validation.


## C5-A7 Live Tiingo activation readiness

- C5-A7 live-readiness update: Tiingo remains fixture-first by default; runtime live adapter defaults to `live_disabled` unless `TIINGO_LIVE_ENABLED=true`.
- Live mode now requires `TIINGO_API_KEY`; optional `TIINGO_BASE_URL` (default `https://api.tiingo.com`) and `TIINGO_TIMEOUT_MS` are supported.
- Added provider-health semantics (`configured | disabled | missing_api_key | invalid_config`) via reasoning boundary/service; health never exposes API key values.
- Tests/build remain no-network by default: live paths are exercised only with injected fake fetch implementations.
- Staging activation only: set `TIINGO_LIVE_ENABLED=true` + `TIINGO_API_KEY`, verify provider health=`configured`, run internal fixture ingest regression, then execute constrained live smoke manually.
- Production activation deferred; risks remain provider quota/billing, schema drift, and stale-data monitoring/alerting.

## C5-A8 readiness note
- [ ] CFTC COT adapter foundation validated in fixture/no-network mode only (`services/reasoning/src/provider-sources/cot/*`).
- [ ] Confirm no live CFTC URL calls in default test/build paths.
- [ ] Future live ingestion/scheduler activation remains deferred to C5-A9/C5+ and is not required for current release gate.


## C5-A9 note
- Added fixture-only/no-network central-bank adapter foundation () for balance sheet, liquidity operations, and policy rate evidence classes.
- Added fixture-only/no-network treasury adapter foundation () for real yield series, bond auctions, and debt supply calendar evidence classes.
- Added strict normalized payload contracts/schemas for central-bank balance sheet points, policy-rate points, and debt-supply calendar items.
- No live Fed/ECB/BoJ/U.S. Treasury/FRED ingestion, no scraping, and no scheduler activation in this batch.
- Future live ingestion risks: source revisions, publication lag, and upstream schema/format drift.

## C5-A9 note
- Added fixture-only/no-network central-bank adapter foundation (services/reasoning/src/provider-sources/central-bank/*) for balance sheet, liquidity operations, and policy rate evidence classes.
- Added fixture-only/no-network treasury adapter foundation (services/reasoning/src/provider-sources/treasury/*) for real yield series, bond auctions, and debt supply calendar evidence classes.
- Added strict normalized payload contracts/schemas for central-bank balance sheet points, policy-rate points, and debt-supply calendar items.
- No live Fed/ECB/BoJ/U.S. Treasury/FRED ingestion, no scraping, and no scheduler activation in this batch.
- Future live ingestion risks: source revisions, publication lag, and upstream schema/format drift.


## C5-A10 note
- Added fixture-only/no-network stress/conditions adapter foundation (`services/reasoning/src/provider-sources/stress-conditions/*`) covering credit stress, financial conditions, liquidity conditions, and dollar liquidity proxies.
- Added fixture-only/no-network risk/market-structure adapter foundation (`services/reasoning/src/provider-sources/risk-market-structure/*`) covering volatility surface, risk sentiment, equity breadth, and cross-market rates proxies.
- Added strict normalization + deterministic payload IDs + finite-number guards with runtime tests and no scraping/live calls.
- Live scheduler/provider activation remains deferred; operational risks remain stale proxy data, source revisions, and format drift.


## C5-A11 Macro Adapter Foundation
- Added fixture-only macro calendar adapter (`services/reasoning/src/provider-sources/macro-calendar`) for economic calendar events; no live API calls or scraping.
- Added fixture-only macro indicators/surprise adapter (`services/reasoning/src/provider-sources/macro-indicators`) for inflation, labor, growth/activity, retail sales/PMI/GDP-style series and macro surprise history.
- Normalization maps indicator categories to evidenceType/evidenceClass: inflation_data/inflation, labor_market_data/labor_market, growth_activity_data/growth_activity, economic_indicator/economic_indicator, macro_surprise_history/macro_surprise_history.
- Operational risks documented: revision lag, delayed releases, consensus quality drift, event-calendar source drift.
- Future work: wire live official ingestion and scheduler with release revisions and provenance scoring.


## C5-A12 Bank/Regulatory/Liquidity adapter foundation
- Added fixture-only/no-network bank reports adapter (`services/reasoning/src/provider-sources/bank-reports/*`) for bank health + bank earnings metrics.
- Added fixture-only/no-network regulatory/liquidity adapter (`services/reasoning/src/provider-sources/regulatory-liquidity/*`) for stress tests, regulatory filing references, and institutional liquidity metrics.
- Added strict normalized payload contracts/schemas for bank earnings, stress test results, regulatory filing references (nullable http(s) URL), and institutional liquidity metrics.
- No live bank/regulator calls, no scraping, no private/non-public order-flow data, and no scheduler activation in this batch.
- Risks: filing format drift, reporting lag/revisions/restatements, and institution naming normalization mismatches until live ingestion harmonization.


## C5-A13 note
- Added fixture-only/no-network commodities+metals adapter foundation (`services/reasoning/src/provider-sources/commodities-metals/*`) covering `energy_commodity_series` and `precious_metals_flow_indicator`.
- Added fixture-only/no-network crypto+earnings+geopolitical adapter foundation (`services/reasoning/src/provider-sources/crypto-earnings-geopolitical/*`) covering `crypto_market_structure_indicator`, `earnings_macro_indicator`, and `geopolitical_risk_event`.
- Normalization enforces finite numeric values, ISO timestamps, deterministic payload IDs, and explicit geopolitical sourceUrl http(s)-or-null validation.
- No live external calls, scraping, scheduler activation, secrets, or private/non-public datasets were introduced in this batch.
- Future live-ingestion/scheduler risks: source drift, proxy quality limits, benchmark revisions, news/event classification risk, and crypto market-data integrity variance.


## C5-A14 checklist note
- [ ] Run deterministic market-evidence coverage audit tests to confirm no silent evidence/provider/payload/asset/SEO gaps.

## C5-A15 note
- Added deterministic evidence quality/provenance/freshness/conflict scoring contracts, schemas, runtime scoring service, boundary query-with-quality helpers, and tests.
- Scoring is pre-weighting quality gating only; trading/reasoning weights are unchanged and remain future C5-A16 scope.
- Fixture/malformed/partial/stale/failed evidence is downgraded deterministically with explicit reasons.


## C5-A16 note
- Added scored reasoning evidence input boundary integration from persisted normalized payloads + quality scores.
- Default filter policy excludes blocked, expired, fixture, and below-threshold evidence; deterministic ordering by quality desc, observedAt desc, payloadId asc.
- Added boundary assembly methods by asset and evidence class with no live/external calls.
- This batch does not change trading formulas/asset weights; C5-A17 will add weighting engine.

## C5-A17 note
- Added deterministic asset evidence weighting foundation (contracts/schemas/policies/helpers/boundary/tests) with quality-adjusted weights and no buy/sell/hold outputs.


## C5-A18 note
- Added deterministic market cognition signal builder foundation from weighted evidence snapshots (pressure families, contradiction flags, freshness warnings, confidence decomposition, narrative summary).
- Explicit non-goal remains trade recommendations/buy/sell/hold outputs.
- Next step C5-A19 can prioritize SEO content data feed/programmatic page backend or deeper cognition decomposition.


## C5-A19 note
- Added backend-only SEO content feed contracts/schemas/builders (canonical metadata, sitemap-ready records, JSON-LD-ready payloads, internal linking graph) with runtime tests.
- No frontend/public SEO routes are live yet; no article-body generation; keyword stuffing remains disallowed.
- C5-A20 can prioritize internal/admin feed query routes or market-evidence internal APIs based on launch priority.

## C5-A20 market evidence + SEO admin/internal query routes
Added protected read-only admin query surfaces under /api/admin/market-evidence/* and /api/admin/seo/* (internal token + admin.read). These routes expose persisted payload/replay/quality/reasoning-input/weighted/cognition/SEO feed/sitemap views with strict query validation, no live provider fetches, and no public SEO pages.

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

## 13) Security CI gate (S1)
- [ ] `npm run security:gate`
- [ ] CI workflow permissions restricted to `contents: read`.
- [ ] No unresolved high/critical `npm audit` findings.
- [ ] No `SECURITY_GATE_ALLOW_AUDIT_UNAVAILABLE` usage in CI or release sign-off.

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

## 14) S4 supply-chain and CI/CD hardening
- [ ] `docs/supply-chain-cicd-hardening.md` reviewed and accepted.
- [ ] Branch protection enabled: PR review required, CI required, `security:gate` required, force-push disabled.
- [ ] `security:gate` passes without audit-unavailable override for release sign-off.
- [ ] CI workflow retains read-only permissions and no production smoke/provider live calls.
- [ ] S5 infra/WAF hardening and S6 staging attack drill remain tracked as release prerequisites.


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

## C6-A0 linkage
- See `docs/backend-foundation-completion-map.md` for backend foundation gap closure sequencing before API-key connection and hosting/live activation.
\n## C6-A1 update (2026-05-14)\n- Added canonical provider/source registry snapshot + validators + boundary methods.\n- Registry is fixture/dry-run readiness only; no live calls and no API keys.\n- Live activation remains blocked-by-default for every source.\n- C6-A2 remains the next step for launch-asset fixture expansion.\n

## C6-A2 fixture scenario library
C6-A2 adds deterministic launch-asset fixture scenarios only, with no live provider calls and no API keys. These scenarios are used for reasoning tests and mock contracts. C6-A3 will expand official macro adapter/schema shells.

## C6-A3 official macro shell update (2026-05-14)
- Added official macro source types/schemas + adapter shells for US, Eurozone/Germany, UK, Japan, and global institutions.
- Fixture/dry-run only; no live provider calls and no API keys.
- Live activation remains blocked-by-default for all official macro sources.
- C6-A4 remains next for news/extraction/filings shell expansion.

## C6-A3B Tier 1B FX expansion update (2026-05-14)
- Tier 1A core launch assets remain first priority and unchanged.
- Added fixture/source coverage for Tier 1B major FX expansion assets: AUD/USD, USD/CHF, NZD/USD, USD/CAD.
- Coverage remains fixture/dry-run only; no live API calls and no API keys connected.
- Live activation remains blocked by default; C6-A4 continues with news/extraction/filings shells.

- C6-A4: added fixture/dry-run news/extraction/filings shells (no live calls, no API keys, live-blocked by default; C6-A5 handles next expansion).

- C6-A5: Added crypto/risk/liquidity fixture shells (dry-run only, no live calls, no API keys; C6-A6 reserved for golden scenario tests).
\n## C6-A6 update\nGolden scenario reasoning tests are fixture-driven and deterministic only (no live provider calls, no API keys). They prohibit recommendations and profit-language and serve backend reasoning validation (not financial advice). C6-A7 remains pending for calibration hardening.
