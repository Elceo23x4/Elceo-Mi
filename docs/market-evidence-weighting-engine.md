# Market Evidence Weighting Engine (C5-A17)

C5-A17 adds deterministic asset/horizon evidence weighting foundation only.

- Horizons: intraday, short_term, swing, medium_term.
- Roles: primary_driver, secondary_driver, context, caution, excluded.
- Formula: `qualityAdjustedWeight = baseWeight * finalQualityScore / 100`.
- Contribution score is signed by deterministic direction inference from metadata direction/sentiment fields.
- Missing direction metadata does not invent directional conviction and stays `unknown` (or neutral fallback for market-news context).

Default policy matrix now exists for launch assets:
`xau_usd, eur_usd, gbp_usd, usd_jpy, usd_chf, aud_usd, nzd_usd, usd_cad, btc_usd, nasdaq_100, sp500, de30`
across all four horizons and all evidence classes.

Illustrative emphasis:
- XAU/USD: high real_yields, interest_rates, central_bank_policy, dollar_liquidity, inflation; medium precious_metals_flows/COT.
- FX majors: high rates/policy/inflation/cross-market-rates; medium-high labor/growth.
- USD/JPY: very high rates + policy; high real yields; medium-high risk sentiment.
- BTC/USD: high crypto structure, dollar liquidity, risk sentiment; medium rates/real yields.
- Indices (Nasdaq/S&P/DE30): high risk sentiment, rates/real yields, earnings_macro, financial_conditions, breadth, vol surface.

This batch does **not** generate buy/sell/hold recommendations. C5-A18 should build market cognition/narrative signals using this weighted evidence layer.
