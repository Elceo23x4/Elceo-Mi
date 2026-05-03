# Provider Source and Normalization Architecture (C5-A3)

C5-A3 defines source-contract and normalization foundations for public market evidence ingestion with no live fetching.

## Evidence-class coverage table
All `MarketEvidenceClass` values now map to at least one provider capability and normalized payload path (or explicit placeholder), with interbank/order-flow remaining excluded from this batch.

- macro_calendar/economic_indicator/inflation/labor_market/growth_activity -> `economic_calendar`, `macro_surprise_series` + base/macro-surprise payloads
- central_bank_policy/liquidity/balance_sheet -> central-bank capability set + central-bank payloads
- interest_rates/real_yields/bond_auctions/government_debt_supply -> rate/yield/auction/debt capabilities + cross-rate/real-yield/auction payloads
- cot_positioning/futures_positioning/positioning_sentiment -> positioning capabilities + COT/futures/sentiment payloads
- volatility_surface/credit_stress/cross_market_rates/dollar_liquidity/equity_index_breadth/crypto_market_structure -> dedicated capabilities + specialized payloads
- bank_health/bank_earnings/stress_tests/institutional_liquidity -> bank/reporting capabilities + bank health / earnings-macro / liquidity payloads
- macro_surprise_history/market_news/geopolitical_risk/energy_commodities/precious_metals_flows/risk_sentiment/earnings_macro/liquidity_conditions/financial_conditions -> dedicated capabilities + specialized payloads

## Provider capability registry foundation
Registry includes prior providers plus placeholders:
`calculated_internal_conditions`, `public_market_cross_rates`, `public_equity_breadth_sources`, `crypto_public_market_structure`, `energy_public_market_data`, `precious_metals_public_flows`, `geopolitical_public_news`, `macro_earnings_public_reports`.
All remain `launchEnabled=false`.

## Explicit constraints in C5-A3
- No external API calls.
- No scraping.
- No secrets.
- No interbank/order-flow/bank-order data (licensing exclusion remains).

## C5-A4 recommended next
Implement first live/mock adapters and ingestion persistence on top of these contracts after coverage completeness is locked.

## C5-A4 Tiingo-compatible adapter foundation
- Added `services/reasoning/src/provider-sources/tiingo/*` adapter contracts + fixture-only adapter path.
- `TiingoMarketDataAdapter` returns deterministic fixture responses for supported market-price capabilities and never performs live network calls.
- Added strict OHLCV normalization guards (`finite` and `high >= low`) with deterministic errors for malformed payloads.
- Live activation remains future scope and will require `TIINGO_API_KEY` plus explicit runtime enablement in C5-A5/C5+.

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

## C5-A8 COT/public positioning adapter foundation
- Added `services/reasoning/src/provider-sources/cot/*` with fixture-only/no-network CFTC COT adapter contracts and deterministic normalization.
- Adapter supports `cot_report`, returns deterministic fixture `ProviderSourceResponse`, and never calls live CFTC URLs in default path.
- Normalization emits `NormalizedMarketEvidencePayload` (`evidenceTypeId=cot_positioning`) with `cot_positioning` or `futures_positioning` evidence class by report kind.
- Non-commercial net derivation uses `nonCommercialLong - nonCommercialShort` when present; leveraged/asset-manager fallback is metadata-only and does not invent non-commercial values.
- Live CFTC ingestion/scheduler wiring remains future scope (C5-A9/C5+).


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
