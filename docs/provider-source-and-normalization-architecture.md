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

