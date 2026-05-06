# Market Evidence Architecture (C5-A1)

C5-A1 defines canonical market evidence classes, strict validation, deterministic registries, and launch-scope exclusions.

- Evidence classes: macro, inflation, labor, growth, central-bank policy/liquidity/balance sheets, rates/real yields, auctions/debt supply, positioning, volatility, credit stress, cross-market liquidity, banking health/earnings/stress tests, macro surprise history, market news and sentiment.
- Source philosophy: prioritize public/official/free-access institutions first, then paid/licensed providers as explicit contracts.
- Launch scope includes macro calendar, CPI/inflation, labor/NFP, central-bank policy/rates/minutes, GDP/PMI/retail, market news/sentiment, DXY/rates/yields/financial-conditions, COT, liquidity ops, real yields, bond auctions, debt supply, vol surface, credit stress, macro surprise, bank health/earnings/stress tests, institutional-liquidity reports.
- Excluded now: interbank/order-flow/bank-order sources due licensing complexity.
- Placeholders: Tiingo-compatible market data source contract and TradingView-compatible chart presentation source contract are modeled as provider-ready evidence types but not integrated.
- Future integration sequence: source adapters -> normalization -> persistence -> reasoning ingestion.


## C5-A2 durability/query/replay update
- Registry snapshots now persist durably via `app_market_evidence_registry_snapshots` with strict JSON serialization and schema-validated replay.
- Query helpers read persisted rows only (latest/list/by-id replay) and never recompute on read.
- Snapshot generation remains deterministic and provider-offline; live ingestion/adapters remain deferred to C5-A3.


## C5-A3 note
C5-A3 adds provider source contracts, strict normalization schemas, deterministic provider registry helpers, and runtime tests; live adapters remain disabled.


## C5-A3 coverage update
- Provider/normalization foundation now explicitly maps the full MarketEvidenceClass taxonomy to capability + normalization paths (including calculated-internal placeholders where appropriate).
- Interbank/order-flow/bank-order data remains excluded due licensing complexity and is not reintroduced.

## C5-A4 note
- Tiingo-compatible market-data adapter foundation is now implemented with fixture/no-network behavior only.
- Deterministic normalization now produces `NormalizedPriceBar` and base `NormalizedMarketEvidencePayload` records from Tiingo-like OHLCV payloads.
- Live ingestion scheduler integration remains deferred to C5-A5/C5+ scope.

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

## C5-A8 note
- CFTC COT/public positioning adapter foundation is now implemented with fixture/no-network behavior only.
- Launch proxy mappings include XAU/USD, EUR/USD, GBP/USD, USD/JPY, BTC/USD, and Nasdaq/S&P futures proxies.
- No interbank/order-flow data has been introduced. Live CFTC ingestion remains future scope.


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


## C5-A14 coverage-audit closure
- Added deterministic coverage-audit module and tests to prevent silent gaps across evidence classes, launch evidence types, launch assets, providers, normalized payload families, SEO mappings, and explicit exclusions.
- Coverage completion is contract/audit-only and does not enable live ingestion, quality scoring, or reasoning weighting integration.

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

## C5-A20 market evidence + SEO admin/internal query routes
Added protected read-only admin query surfaces under /api/admin/market-evidence/* and /api/admin/seo/* (internal token + admin.read). These routes expose persisted payload/replay/quality/reasoning-input/weighted/cognition/SEO feed/sitemap views with strict query validation, no live provider fetches, and no public SEO pages.
