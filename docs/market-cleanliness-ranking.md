# IFP-4 — Market Cleanliness Ranking

Status: **active**. Policy: `market-cleanliness-v1`.

Market cleanliness describes coherence among persisted market observations. It is not forecast correctness, profitability, or tradability. A bullish frozen expectation can be cleanly rejected when the resolved release, primary response, current-stage path, and canonical related markets coherently resolve bearish.

## Components and fixed policy

The visible weights are release clarity 15, primary-reaction coherence 20, path continuity 15, related-market coherence 15, volatility interpretability 10, session/liquidity quality 10, analog consistency 10, and provenance quality 5. They are deterministic engineering policy, not production-calibrated claims. Unavailable evidence has a null score and zero effective weight.

For expected current-stage components, coverage is available weight divided by expected weight. Raw agreement is the available-component weighted average. The qualified score is raw agreement multiplied by coverage, so missing evidence is never renormalized into positive evidence. Values use round-half-up to two decimal places (`Math.round((value + Number.EPSILON) * 100) / 100`).

`insufficient_data` takes precedence for a missing mandatory direct component, untrusted direct evidence, coverage below 0.65, missing volatility basis, an insufficient event, or unprovable cutoff. A hard conflict or qualified score below 45 is `conflicted`. `clean` requires qualified >= 75, raw >= 80, coverage >= 0.80, no conflict, no ambiguity, and eligible provenance. Other sufficient evidence is `mixed`.

## Stage and point-in-time safety

Immediate rankings structurally exclude path and immature related-market evidence. Confirmation uses no follow-through evidence. Follow-through expects every component except a canonical `not_required` related-market decision. Context and analog records must match the exact event and asset, and all observed, available, created, and query cutoff times must be at or before the cleanliness cutoff.

Session and liquidity are read only from the immutable context repository. Unknown, closed, missing, or provenance-limited conditions remain unavailable; no asset-name shortcut exists. Historical analog similarity is never reranked. The analog component uses sufficient retrievals and transparent historical path-state concentration as context only; sparse or provenance-limited history cannot add support.

Outputs expose components, conflict and ambiguity flags, evidence references, warnings, and limitations. They contain market-context intelligence only and no execution, sizing, or trading instruction.
