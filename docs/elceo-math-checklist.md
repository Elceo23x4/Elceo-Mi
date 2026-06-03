# ELCEO Mathematical Logic Checklist

This document is a guardrail for ELCEO’s deterministic reasoning layer.

Its purpose is to ensure ELCEO never degrades into a beautiful interface with weak internal truth. Every meaningful market state must be grounded in deterministic logic, structured scoring, and explainable internal state assembly before any AI explanation is layered on top.

## Core rule

Every meaningful ELCEO market state must come from these layers, in this order:

1. deterministic market logic
2. structured scoring and thresholds
3. internal state assembly
4. AI explanation on top

AI must never replace the scoring layer.

---

## 1. Non-negotiable mathematical modules

These are not optional.

### Risk and sizing
- [ ] Account-risk-based position sizing exists
- [ ] Supports forex sizing
- [ ] Supports gold sizing
- [ ] Supports index CFD-style sizing
- [ ] Supports crypto sizing
- [ ] Supports account-currency conversion
- [ ] Returns risk amount
- [ ] Returns stop distance
- [ ] Returns position size
- [ ] Returns reward amount when target is present
- [ ] Returns risk-reward ratio
- [ ] Returns exposure
- [ ] Returns caution flags
- [ ] Handles zero stop-distance safely
- [ ] Handles invalid instrument metadata safely
- [ ] Handles missing conversion-rate cases safely
- [ ] Has unit tests

### Zone significance
- [ ] H4 zone model exists
- [ ] Uses zones, not simple lines
- [ ] Uses touch count
- [ ] Uses reaction magnitude
- [ ] Uses recency weighting
- [ ] Counts wick touches
- [ ] Supports breakout-retest bonus or weighting
- [ ] Produces normalized significance score
- [ ] Preserves component breakdown
- [ ] Has synthetic pattern tests

### Confidence decomposition
- [ ] Confidence is not a single opaque number
- [ ] Includes source confidence
- [ ] Includes event strength confidence
- [ ] Includes model agreement confidence
- [ ] Includes price confirmation confidence
- [ ] Includes historical-pattern confidence where available
- [ ] Includes contradiction penalty
- [ ] Produces total confidence on a clear scale
- [ ] Exposes anatomy to UI and admin
- [ ] Has tests

### Contradiction / tension
- [ ] Contradiction is not binary only
- [ ] Uses expected direction
- [ ] Uses realized price direction
- [ ] Uses magnitude of deviation
- [ ] Uses elapsed time
- [ ] Uses zone proximity
- [ ] Produces tension score
- [ ] Produces contradiction state
- [ ] Supports escalation ranges
- [ ] Has tests

### Freshness / decay
- [ ] Intelligence objects decay over time
- [ ] Different event types have different decay profiles
- [ ] Freshness expires are stored
- [ ] Stale signals visibly degrade in ranking/state
- [ ] Has tests

### Ranking / prioritization
- [ ] Ranking logic exists for dashboard modules
- [ ] Ranking logic exists for evidence cards
- [ ] Ranking logic exists for alerts
- [ ] Uses relevance to user
- [ ] Uses recency
- [ ] Uses significance
- [ ] Uses confidence
- [ ] Uses volatility where relevant
- [ ] Uses contradiction where relevant
- [ ] Has tests

---

## 2. Asset-specific mathematical logic checklist

### Gold (XAU/USD)
- [ ] Real-yield pressure exists
- [ ] Dollar pressure exists
- [ ] Safe-haven pressure exists
- [ ] Policy pressure exists
- [ ] Event-shock pressure exists
- [ ] Contradiction pressure exists
- [ ] Gold weighting is not copied from indices or forex
- [ ] Gold has dedicated tests

### Equity indices
For Nasdaq 100, S&P 500, and DE30:
- [ ] Rates pressure exists
- [ ] Growth pressure exists
- [ ] Liquidity pressure exists
- [ ] Sentiment pressure exists
- [ ] Event-shock pressure exists
- [ ] Index-family differences can be tuned
- [ ] Index logic has dedicated tests

### BTC/USD
- [ ] Liquidity pressure exists
- [ ] Dollar pressure exists
- [ ] Risk-sentiment pressure exists
- [ ] Event-shock pressure exists
- [ ] BTC weighting is independent from gold and indices
- [ ] BTC logic has dedicated tests

### USD pairs
For EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, NZD/USD, USD/CAD:
- [ ] Macro divergence pressure exists
- [ ] Policy divergence pressure exists
- [ ] Yields pressure exists
- [ ] Event-surprise pressure exists
- [ ] Pair-specific logic is tunable
- [ ] USD/JPY can reflect BOJ sensitivity
- [ ] USD/CHF can reflect safe-haven behavior
- [ ] AUD/USD and NZD/USD can reflect risk-growth context
- [ ] USD/CAD can later absorb oil-linked logic
- [ ] Forex-family logic has dedicated tests

---

## 3. Event and surprise logic checklist

### Macro surprise
- [ ] Surprise is not one-size-fits-all
- [ ] Actual vs forecast is computed
- [ ] Actual vs previous can be included where useful
- [ ] Surprise is normalized by indicator type
- [ ] Signed surprise is preserved
- [ ] Magnitude of surprise is preserved
- [ ] Surprise maps into asset impact logic
- [ ] CPI, NFP, rate decisions, PMI, etc. are not treated identically
- [ ] Has tests by indicator category

### Event decay
- [ ] CPI decay profile exists
- [ ] Rate-decision decay profile exists
- [ ] Geopolitical-shock decay profile exists
- [ ] Earnings/policy decay profiles can be extended later
- [ ] Event relevance falls predictably, not arbitrarily

### Evidence scoring
- [ ] Sources have trust weighting
- [ ] Weak single-source events are penalized
- [ ] Multi-source agreement boosts confidence
- [ ] Official-source events receive appropriate weight
- [ ] Duplicate article bursts do not overcount significance

---

## 4. Chart-intelligence logic checklist

### Impulse logic
- [ ] Impulse detection exists
- [ ] Uses move distance
- [ ] Uses ATR-relative logic where useful
- [ ] Uses candle expansion where useful
- [ ] Uses follow-through behavior
- [ ] Produces normalized impulse score
- [ ] Has tests

### Annotation logic
- [ ] Annotation objects have priority score
- [ ] Annotation density cap exists
- [ ] Annotation ranking logic exists
- [ ] Evidence-linked note logic exists
- [ ] Contradiction markers have rules
- [ ] Key-level markers have significance gating
- [ ] Impulse-origin markers have deterministic threshold
- [ ] Annotation collision handling is planned or partially implemented
- [ ] Has tests

### Zone rendering logic
- [ ] Chart zones use significance threshold
- [ ] Low-value zones are filtered out
- [ ] Confidence/evidence can influence what gets shown
- [ ] Chart is not over-cluttered by default

---

## 5. Alert mathematics checklist

### Trigger logic
- [ ] Bias-change threshold exists
- [ ] Contradiction-spike threshold exists
- [ ] Key-level interaction threshold exists
- [ ] Macro-event incoming threshold exists
- [ ] Regime-shift threshold exists
- [ ] Trigger conditions are deterministic

### Alert suppression logic
- [ ] Cooldown exists
- [ ] Dedupe exists
- [ ] Re-trigger rules are defined
- [ ] Alert severity is ranked
- [ ] Preferences can suppress alert categories
- [ ] Has tests

---

## 6. Journal and trader-development mathematics checklist

This area is still largely pending and must be protected.

### Journal metrics
- [ ] Total trades
- [ ] Win rate
- [ ] Expectancy
- [ ] Average gain
- [ ] Average loss
- [ ] Average risk-reward
- [ ] Profit factor
- [ ] Best month
- [ ] Worst month
- [ ] Best asset
- [ ] Worst asset
- [ ] Highest gains
- [ ] Highest losses
- [ ] Effective trading time windows
- [ ] Session performance
- [ ] Setup-type performance
- [ ] ELCEO-bias-follow correlation

### Behavioral detection
- [ ] Overtrading detection
- [ ] Repeated mistake-category detection
- [ ] Poor time-window detection
- [ ] Confidence mismatch detection
- [ ] ELCEO-bias violation detection
- [ ] Emotion-performance correlation where useful
- [ ] Has tests

### Coaching shaping
- [ ] Coaching outputs are evidence-based
- [ ] Coaching outputs cite measurable patterns
- [ ] Coaching outputs avoid generic motivational language
- [ ] Coaching outputs can generate practical next-trade guidance
- [ ] Coaching outputs can generate 5-trade or 10-trade improvement challenges

---

## 7. Database and persistence checklist for mathematics

- [ ] Score components are persisted where needed
- [ ] Final totals are persisted where needed
- [ ] Supporting event IDs are persisted
- [ ] Freshness expiry is persisted
- [ ] Contradiction history is persisted where useful
- [ ] Confidence anatomy is persisted
- [ ] Ranking inputs or outputs are persisted where useful
- [ ] Journal analytics snapshots are planned
- [ ] Alert trigger history is persisted
- [ ] Auditability of key computations is possible

---

## 8. Testing checklist

No major formula family should exist without tests.

### Required test families
- [ ] Risk sizing tests
- [ ] Zone significance tests
- [ ] Confidence tests
- [ ] Contradiction tests
- [ ] Freshness tests
- [ ] Ranking tests
- [ ] Directional pressure tests by asset family
- [ ] Macro surprise tests
- [ ] Impulse scoring tests
- [ ] Annotation ranking tests
- [ ] Alert trigger tests
- [ ] Alert cooldown/dedupe tests
- [ ] Journal analytics tests
- [ ] Behavior detection tests
- [ ] Cognition object shaping tests
- [ ] Dashboard view-model mapping tests

---

## 9. Shipping rules

These modules must not ship without deterministic logic behind them:

- [ ] risk calculator
- [ ] directional bias
- [ ] confidence anatomy
- [ ] contradiction state
- [ ] H4 zone significance
- [ ] dashboard ranking
- [ ] alerts
- [ ] journal analytics
- [ ] coaching outputs

---

## 10. Protection rules for Codex and future development

- [ ] No AI-only replacements for scoring modules
- [ ] No UI component should contain hidden scoring logic
- [ ] No provider adapter should own market-state logic
- [ ] No dashboard module should invent numbers at render time
- [ ] No alert should be triggered from raw provider data directly
- [ ] No coaching copy should be generated without deterministic evidence
- [ ] All major thresholds should be tunable by config
- [ ] All score outputs should have clear ranges and meanings

---

## 11. Current status summary

### Strongly underway
- [x] risk sizing
- [x] zone significance
- [x] confidence decomposition
- [x] contradiction
- [x] freshness
- [x] ranking
- [x] asset-family directional pressure
- [x] cognition state assembly

### Needs strengthening
- [ ] macro surprise normalization depth
- [ ] impulse scoring depth
- [ ] annotation ranking depth
- [ ] alert threshold calibration
- [ ] persistence of more score history
- [ ] richer formula test coverage

### Still pending in a major way
- [ ] journal analytics formulas
- [ ] behavior detection formulas
- [ ] coaching evidence engine
- [ ] advanced calibration layer
- [ ] final threshold tuning process

---

## 12. Final rule

ELCEO must always be able to answer:

**Why did the system say this?**

with:
- scores
- thresholds
- evidence
- freshness
- contradiction state
- asset-specific logic

and not just narrative text.

---

## C6-R0 Market Realism Audit Findings

Status: **audit completed; implementation pending for R1-R9**. The existing checklist items above remain unchecked where deterministic implementation and tests are not yet present. Existing checked summary items indicate structural foundations only, not final market-realistic reasoning completeness.

- [ ] Direction inference requires an asset-contextual resolver. Current direction inference still relies on generic evidence metadata labels and must be upgraded so XAU/USD, FX pairs, BTC/USD, indices, DXY, and VIX resolve pressure through asset-specific driver rules.
- [ ] FX pairs require two-sided relative pressure. EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, NZD/USD, and USD/CAD must resolve base-currency pressure minus quote-currency pressure with safe-haven, commodity, policy, and yield-differential modifiers.
- [ ] Macro surprise engine required. CPI, labor, PMI/growth, central-bank, retail/consumption, fiscal, and liquidity events need indicator-specific actual/forecast/previous/revision normalization before market impact is trusted.
- [ ] Contradiction matrix expansion required. The current contradiction foundation must expand to price-vs-driver, price-vs-breadth, safe-haven-vs-yields, ETF-flow-vs-liquidity, COT-lag, duplicate-news, FX divergence, volatility-surface, and provider-gap contradictions.
- [ ] Confidence calibration upgrade required. Confidence must include provider activation state, source independence, duplicate-burst adjustment, macro-normalization validity, FX completeness, price confirmation, provider-data gaps, COT lag, crypto derivatives reliability, and ETF-flow freshness.
- [ ] Price reaction / impulse confirmation required. Reasoning needs ATR-normalized event-window impulse, fade, follow-through, related-market confirmation, and zone rejection/acceptance before price reaction can strengthen confidence.
- [ ] Golden scenario expansion required. R8 must add deeper historical and realistic market regimes, macro surprises, FX divergence, crypto derivatives/liquidity, duplicate news, stale source, and price-reaction confirmation/failure scenarios.

## C6-R1 — Asset causality contract foundation (2026-06-03)

- Added typed and tested asset causality contracts for all 14 ELCEO launch assets.
- Added schema validation rules that require driver coverage, regime modifiers, contradiction triggers, provider dependencies, FX base/quote pressure requirements, and non-complete coverage status while R2-R9 remain pending.
- Added deterministic reasoning helpers and canonical boundary read methods so later engines consume the same source of truth.
- No checklist item for final realism is checked by this batch: direction resolution, FX relative strength, macro surprise normalization, expanded contradiction detection, confidence calibration upgrade, price reaction/event impulse logic, provider reliability weighting, and golden scenario expansion remain pending.
- No UI, live providers, payment, notification, commercial entitlement, Super Admin, or 2FA behavior changed.
