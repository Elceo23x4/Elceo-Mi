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

