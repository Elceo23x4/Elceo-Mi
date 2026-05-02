# Market Evidence Architecture (C5-A1)

C5-A1 defines canonical market evidence classes, strict validation, deterministic registries, and launch-scope exclusions.

- Evidence classes: macro, inflation, labor, growth, central-bank policy/liquidity/balance sheets, rates/real yields, auctions/debt supply, positioning, volatility, credit stress, cross-market liquidity, banking health/earnings/stress tests, macro surprise history, market news and sentiment.
- Source philosophy: prioritize public/official/free-access institutions first, then paid/licensed providers as explicit contracts.
- Launch scope includes macro calendar, CPI/inflation, labor/NFP, central-bank policy/rates/minutes, GDP/PMI/retail, market news/sentiment, DXY/rates/yields/financial-conditions, COT, liquidity ops, real yields, bond auctions, debt supply, vol surface, credit stress, macro surprise, bank health/earnings/stress tests, institutional-liquidity reports.
- Excluded now: interbank/order-flow/bank-order sources due licensing complexity.
- Placeholders: Tiingo-compatible market data source contract and TradingView-compatible chart presentation source contract are modeled as provider-ready evidence types but not integrated.
- Future integration sequence: source adapters -> normalization -> persistence -> reasoning ingestion.
