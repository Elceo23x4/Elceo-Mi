# News half-life / narrative decay (IFP-5)

IFP-5 measures whether an event interpretation persists at immutable post-event checkpoints. Time measures age; observed market, revision, cognition, analog, and provenance evidence determines survival. Source age and source refreshes are audit context only.

Each evaluation binds a persisted expectation/release family and a deterministic release version. It reports `narrativeAsOf` as the end of the latest evaluated checkpoint and never extrapolates that state to generation time. Missing volatility or observations yields `insufficient_data`; unqualified direct provenance yields `provenance_limited`; neither fabricates a state.

The engineering policy weights primary close-path retention (30), structural follow-through (20), canonical related markets (15), revisions (10), persisted cognition (10), stage-safe historical analog context (10), and provenance (5). Missing expected evidence lowers coverage, and qualified persistence is raw persistence multiplied by coverage.

Half-life is the first sufficient post-peak checkpoint at or below half the observed qualified peak. It is reported as the interval between the preceding and crossing observations, never interpolated or predicted. Ordinary fade requires multiple low checkpoints for terminal expiry; direct reversal with related conflict or a trusted material reversal can terminate an epoch. A decaying epoch may recover, while an expired epoch requires a new trusted material version.

The output is descriptive market cognition. It contains no trading instruction, profitability, universal TTL, or predictive-accuracy claim.
