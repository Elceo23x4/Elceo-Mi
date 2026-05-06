# Market Cognition Signal Builder Foundation (C5-A18)

C5-A18 adds deterministic, explainable market cognition signal assembly from weighted evidence snapshots.

## Scope
- Signal families: macro, liquidity, risk sentiment, positioning, volatility, credit stress, policy, earnings, geopolitical.
- Additional outputs: freshness warnings, contradiction flags, confidence decomposition, narrative summary.
- Explicit non-goal: no trade recommendations and no buy/sell/hold outputs.

## Logic
- Direction derives from signed weighted contributions; mixed when meaningful positive and negative pressure both exist.
- Strength is absolute contribution normalized by usable weighted evidence.
- Confidence decomposition combines quality, usable-weight share, freshness, contradiction penalty, and family coverage.
- Contradictions are deterministic pairwise divergence checks across selected families.
- Narrative summarizes dominant pressures, key drivers, and caution items from contradictions/warnings.

## Forward path
- C5-A19 may prioritize SEO content feed/programmatic page backend integration, or deepen pressure decomposition detail.
