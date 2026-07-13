# Expectation-Reality Delta Engine

The Expectation-Reality Delta Engine freezes ELCEO's cognition-derived expectation before outcome data is available, waits for completed market-observation bars, and compares that frozen expectation with realised price path behaviour. It is not cognition drift: cognition drift compares two cognition snapshots, while this engine compares expectation at time T with market behaviour after time T.

An expectation contains the asset, timeframe, issued/data-cutoff timestamps, reasoning run, cognition snapshot, versions, base price, pre-issuance recent range percent, bias, confidence anatomy, contradiction state, invalidation state, evidence links, thesis, and what-would-change-state text. It intentionally contains no future candle, return, reaction, or outcome field.

The expectation is persisted before evaluation so later reality cannot rewrite the original decision-time state. The base price and recent range are taken from the reasoning input available at issuance. If data cutoff is later than issued time, expectation creation is rejected.

The versioned horizon policy is `expectation-reality-v1`: immediate uses one completed bar, confirmation uses three completed bars, and follow-through uses six completed bars. Window completion depends on completed bars, not wall-clock time, so weekends and market closures are gaps rather than zero-movement candles.

Reality is volatility-normalised with the pre-issuance `recentRangePct`. Material movement is 0.50 volatility units, confirmation movement is 1.00 volatility unit, and strong movement is 1.50 volatility units. Missing or zero volatility context returns `insufficient_data` with `volatility_context_unavailable`; outcome candles are never used to estimate volatility.

Path-order logic records whether confirmation, contradiction, or explicit invalidation happened first. Bullish expectations treat upward movement as favourable and downward movement as adverse; bearish expectations invert that logic. Neutral expectations are confirmed only when terminal movement stays below material magnitude and neither side reaches confirmation magnitude. Mixed or unsupported expectations are not directionally scored, though realised path metrics remain preserved.

Invalidation is read from the frozen cognition invalidation state. The engine does not infer invalidation from arbitrary drawdown.

Insufficient or invalid observations produce `insufficient_data`, including incomplete windows, duplicate candles, out-of-order candles, future-data leakage, and invalid OHLC relationships. This avoids guessed conclusions.

Persistence is append-only: expectations are unique by expectation ID and cognition snapshot; evaluations are unique by expectation, horizon, and observation version. Repeated evaluation with the same observation version is idempotent. Immediate, confirmation, and follow-through results remain separately auditable.

Limitations: the engine measures expectation-reality divergence, not profitability, predictive probability, or trade accuracy. It does not output buy, sell, or hold instructions.

Later IFP phases can consume these immutable deltas as evidence for Historical Market Memory, Contradiction-to-Action, Market Cleanliness, and Fragility Score without changing the frozen expectation or its original outcome audit.
