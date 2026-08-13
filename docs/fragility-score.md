# IFP-7 — Fragility Score

Policy `fragility-score-v1` deterministically describes how vulnerable the current evidence structure is to contradiction, path failure, context or narrative deterioration, direct crowd amplification, weak volatility interpretability, historical disagreement, and removal of a dominant support family. It is not direction, confidence, trade quality, probability, expected return, or advice. IFP-8—not IFP-7—owns empirical calibration.

## Component ownership and weights

| Component | Weight | Exclusive source |
|---|---:|---|
| counterfactual dependency fragility | 20 | available primary IFP-7 components |
| contradiction/invalidation pressure | 15 | IFP-3 protocol state |
| path instability | 15 | IFP-1 eligible stage path |
| context coherence fragility | 15 | IFP-4 release clarity, related-market coherence, session liquidity only |
| narrative decay vulnerability | 10 | IFP-5 qualified persistence |
| crowding amplification | 10 | IFP-6 qualified direct positioning only |
| volatility sensitivity | 10 | IFP-4 volatility interpretability only |
| historical analog dispersion | 5 | outcomes attached after persisted IFP-2 ranking |

IFP-6 aggregate market-stress scores and state are never inputs. IFP-4 overall cleanliness and non-owned components are not context inputs. Provenance is a qualification gate rather than a numeric market component.

## Arithmetic, missing data, and thresholds

Protocol severities are 10/35/60/80/100 for archive, wait, review, escalate, and invalidate. Eligible IFP-1 states are 0/35/45/55/75/95 for confirmed, absorbed, delayed, ambiguous, rejected, and reversed, with the published special-case floors. Context and volatility invert their exclusively owned cleanliness scores. Narrative uses `max(100-current, 100*(1-ratio))` and state floors. Analog dispersion is `100*(1-largest family/N)` for at least three outcomes.

Structurally unavailable weight is excluded from expected weight. Other missing evidence is never zero. Coverage is `availableWeight / expectedWeight`; raw score is `sum(score*weight) / availableWeight` and is never multiplied by coverage. A numerical final requires every mandatory component available, no mandatory provenance limitation, and coverage at least 0.75.

States are low `[0,25)`, elevated `[25,50)`, high `[50,75)`, and severe `[75,100]`; null is insufficient data. These are engineering interpretation boundaries, non-predictive thresholds.

## Counterfactual dependency and limitations

For each available primary family, support is `max(0,100-score)*weight`. Each leave-one-family-out scenario reports its support share as percentage lost. Maximum loss is the component score; zero or one positive family yields 100. Scenarios sort by loss descending then component name. The audit reports `100*sum(share²)` solely as a transparent concentration diagnostic.

The engine consumes immutable stage-specific snapshots and does not reconstruct later evidence, rerank analogs, invent positioning totals, or override upstream invalidation. Optional missing evidence reduces coverage unless structurally unavailable. Historical dispersion is not current-event probability. IFP-8 is active and is not empirically complete; certified non-fixture acceptance evidence is still missing.
