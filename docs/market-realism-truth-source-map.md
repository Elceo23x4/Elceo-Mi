# C6-R0 Market Realism Truth-Source Map

Status: **audit/truth-source foundation only**. This document defines the launch-scope market-realism standard for later R1-R9 reasoning upgrades. It does not claim that the current reasoning engine implements these rules yet.

## 1. Core market operating principles

1. Markets reprice on **relative changes in expected cash flows, policy paths, discount rates, liquidity, positioning, and risk tolerance**, not on raw sentiment labels alone.
2. Evidence must be interpreted through **asset context**. The same datapoint can be supportive for one asset, adverse for another, and ambiguous for a third.
3. Direction must be resolved from a **driver stack**: primary drivers, secondary drivers, regime modifiers, evidence freshness, independence, source reliability, and price confirmation.
4. Confidence must fall when evidence is stale, duplicated, one-sided, fixture-only, unsupported by price reaction, or contradicted by higher-quality drivers.
5. FX pairs are **two-sided relative instruments**. A pair outcome depends on base-currency pressure minus quote-currency pressure, not on USD-only or generic risk sentiment logic.
6. Macro surprises require **indicator-specific normalization**. A higher number is not always risk positive; CPI, payrolls, unemployment, PMIs, retail sales, rate decisions, revisions, and central-bank language all map differently by regime.
7. Event impact decays by event class and confirmation state. A CPI surprise, central-bank decision, war headline, ETF-flow day, and credit-stress break cannot share a single decay clock.
8. Source independence matters. Ten article rewrites of one wire story are not ten independent confirmations.
9. Crypto derivatives and scraped/news extraction are useful context but must be discounted when provenance, venue coverage, liquidation mechanics, or duplicate extraction confidence is weak.
10. ELCEO must not output direct financial-advice instructions. Market cognition should describe pressures, tension, confidence, uncertainty, and invalidation context.

## 2. Cross-asset transmission channels

| Channel | Transmission | Launch assets most sensitive | Notes for later implementation |
| --- | --- | --- | --- |
| Real yields | Higher real yields raise opportunity cost of non-yielding assets and discount long-duration equities. | XAU/USD, Nasdaq 100, S&P 500, DXY, USD/JPY, BTC/USD | Must distinguish nominal-yield moves driven by growth optimism from inflation/fiscal stress. |
| Policy-rate expectations | Central-bank path reprices yield differentials and discount rates. | All FX pairs, DXY, XAU/USD, indices | Needs central-bank-specific reaction functions and terminal-rate/repricing language. |
| Dollar liquidity | USD funding stress and broad liquidity affect risk assets and USD demand. | BTC/USD, Nasdaq 100, S&P 500, XAU/USD, DXY, FX pairs | Must separate USD strength from global risk aversion and from US growth outperformance. |
| Risk regime | Risk-on/risk-off changes demand for equities, high beta FX, havens, volatility, and crypto. | VIX, S&P 500, Nasdaq 100, AUD/USD, NZD/USD, USD/CHF, USD/JPY, BTC/USD | Safe-haven responses differ by pair construction and rate backdrop. |
| Credit stress | Credit widening can precede equity drawdowns and volatility expansion. | S&P 500, Nasdaq 100, VIX, DXY, BTC/USD | Needs freshness controls; stale credit metrics should not dominate intraday cognition. |
| Equity breadth | Breadth confirms or contradicts index level moves. | S&P 500, Nasdaq 100, DE30, VIX | Breadth must be fresh and index-specific; weak breadth contradicts headline index strength. |
| Volatility surface | Vol demand/skew/term structure informs stress and hedging demand. | VIX, S&P 500, Nasdaq 100, BTC/USD | Requires high freshness and should not be inferred from a single spot VIX print alone. |
| Positioning/COT | Crowding can amplify or cap directional moves. | FX pairs, XAU/USD, BTC/USD proxies | CFTC COT is lagged; treat as context/regime, not real-time confirmation. |
| ETF/fund flows | Flow demand can support underlying assets or sectors. | BTC/USD, XAU/USD, Nasdaq 100, S&P 500 | Fund issuer data can lag and should not override macro/liquidity contradictions by itself. |
| News/geopolitics | Shocks can override normal driver hierarchy temporarily. | XAU/USD, VIX, DXY, USD/CHF, USD/JPY, indices, BTC/USD | Duplicate-burst filtering and extraction confidence are mandatory. |

## 3. Asset-specific causality map

| Asset | Primary causality | Secondary causality | Regime modifiers |
| --- | --- | --- | --- |
| XAU/USD | Real yields, USD pressure, Fed path, safe-haven demand | Inflation surprises, central-bank reserves/ETF flows, geopolitical risk, COT | Real-yield dominance can be overridden by acute safe-haven shock; USD direction must be separated from real-rate direction. |
| EUR/USD | ECB-vs-Fed policy differential, euro-area vs US macro surprises, rate spreads | Energy/geopolitical risk, COT, euro-area political risk | Risk-off can support USD even if US macro weakens. |
| GBP/USD | BoE-vs-Fed differential, UK inflation/wage/growth mix, gilt risk | Fiscal credibility, COT, UK political/news risk | Stagflation evidence may be two-sided: rate support vs growth drag. |
| USD/JPY | US-Japan yield differential, Fed/BoJ policy gap, intervention risk | Risk regime, real yields, Japanese inflation/wage data | Risk-off can strengthen JPY despite USD yield support; intervention headlines should create caution. |
| USD/CHF | USD policy/yields vs CHF safe-haven/SNB pressure | European risk, geopolitical stress, dollar liquidity | CHF haven demand can offset USD risk-off bid. |
| AUD/USD | Fed-vs-RBA differential, global growth/China proxy, commodities, risk sentiment | Iron ore/energy, COT, liquidity | AUD can weaken on global demand deterioration even with hawkish RBA evidence. |
| NZD/USD | Fed-vs-RBNZ differential, global growth/risk, dairy/commodity context | Domestic growth/inflation, COT | Similar to AUD but less direct China/iron ore sensitivity; liquidity/risk regime often dominates. |
| USD/CAD | Fed-vs-BoC differential, oil/energy terms of trade, US/Canada macro spread | Risk sentiment, COT | Oil support can strengthen CAD while broad USD strength supports the pair; must net two sides. |
| BTC/USD | Global liquidity, real yields, risk appetite, crypto market structure, ETF/flow demand | Regulation/news, on-chain context, funding/OI/liquidations | Derivatives data can signal fragility but venue/provenance reliability must be discounted. |
| Nasdaq 100 | Real yields/discount-rate pressure, mega-cap earnings, AI/semiconductor cycle, liquidity | Breadth, volatility, credit stress, macro growth | More duration-sensitive than S&P 500; good growth can be supportive until rates shock dominates. |
| S&P 500 | Earnings breadth, financial conditions, real yields, growth/risk regime | Breadth, credit stress, volatility surface, macro surprises | Broad index needs breadth confirmation; mega-cap concentration can mask deterioration. |
| DE30 | ECB/rates, German/euro-area growth, global risk, export/energy sensitivity | EUR context, China/global demand, credit/vol | Domestic weakness can conflict with global risk-on; energy shocks are especially important. |
| DXY | Fed path, US-vs-rest growth/rates, USD liquidity, risk-off demand | Euro/Japan/UK weakness, positioning | DXY is basket-weighted; not equivalent to USD pressure against every currency. |
| VIX | Equity drawdown stress, event uncertainty, volatility surface/hedging demand | Credit stress, liquidity stress, macro-event risk | Spot VIX direction must be validated against equity move, term structure, and event window. |

## 4. FX pair relative-pressure model

Later R2 implementation should represent each currency as a pressure vector, then resolve the pair as:

`pair_pressure = base_currency_total_pressure - quote_currency_total_pressure`

Currency pressure components required:

- policy path repricing
- nominal and real yield differentials
- growth surprise and revision pressure
- inflation surprise pressure filtered through central-bank reaction function
- external-balance/commodity proxy where relevant
- safe-haven or funding status
- positioning/crowding
- risk-regime beta
- source freshness and confidence

Rules:

1. USD/JPY, USD/CHF, and USD/CAD cannot be treated the same as EUR/USD or AUD/USD just because USD is present.
2. For USD-base pairs, bullish pair pressure means USD pressure exceeds quote pressure; for USD-quote pairs, bullish pair pressure means non-USD pressure exceeds USD pressure.
3. Risk-off is not automatically USD-positive for all pairs. CHF and JPY can outperform USD in stress depending on rates/intervention conditions.
4. High inflation can be currency-positive when it reprices hawkish policy and currency-negative when it signals stagflation, credibility risk, or real-income damage.
5. Commodity-linked pairs need commodity terms-of-trade pressure, not generic risk sentiment only.

## 5. Macro surprise interpretation model

Macro surprise must be normalized by indicator class, unit, volatility, and reaction function.

| Indicator class | Raw inputs | Direction interpretation must include | Common failure mode |
| --- | --- | --- | --- |
| Inflation | actual, forecast, previous, core/headline, revisions | Hot inflation can lift yields/USD and hurt duration assets; in stagflation regimes it can hurt growth-sensitive assets. | Treating hot CPI as generically positive/negative. |
| Labor | payrolls, unemployment, wages, participation, revisions | Strong payrolls may support growth and hawkish policy; unemployment rise can be risk-off or disinflationary depending on context. | Ignoring revisions and unemployment/wage mix. |
| Growth/PMI | level, change, forecast, subcomponents | Above-50 vs below-50 and new orders/employment matter; weak growth can lower yields but hurt cyclicals. | Mapping PMI surprise directly to all assets. |
| Central-bank decisions | rate delta vs expected, statement, dots/projections, press conference | Surprise is relative to priced path and guidance; language can dominate the rate decision. | Treating all hikes as currency-positive or equity-negative. |
| Retail/consumption | actual vs expected, control group, revisions | Strong demand can support growth but lift rate expectations. | Ignoring inflation/rate regime. |
| Fiscal/debt supply | auction tails, issuance, deficits | Can pressure yields/term premium and affect USD/risk assets. | Treating as normal macro growth evidence. |

Required normalized fields for later R3:

- `indicatorCategory`
- `region`
- `actual`, `forecast`, `previous`, `revision`
- `standardizedSurpriseMagnitude`
- `signedSurpriseByCategory`
- `policyReactionScore`
- `growthImplicationScore`
- `inflationImplicationScore`
- `assetImpactVector`
- `confidenceAndRevisionRisk`

## 6. Event decay model

| Event family | Initial window | Decay behavior | Confirmation needed |
| --- | --- | --- | --- |
| CPI/inflation | minutes to several sessions | Fast first impulse, slower policy-path digestion | Rates/DXY/equity/gold reaction within event window. |
| Central bank | minutes to weeks | Statement and press-conference phases; repricing persists if yields confirm | Yield differentials, FX reaction, volatility response. |
| Labor | minutes to days | Revisions and wage/unemployment mix affect persistence | Rates and risk response. |
| Geopolitical shock | immediate to indefinite | Decays only when threat path de-escalates or markets fade | Haven/volatility/oil/gold confirmation. |
| ETF/fund flow | daily to weekly | Decays with next flow prints and price absorption | Flow persistence and price follow-through. |
| COT/positioning | weekly to multi-week | Lagged context; do not use as intraday confirmation | Crowding plus reversal/continuation evidence. |
| Credit/vol stress | intraday to weekly | Remains important while spreads/vol stay elevated | Breadth, equity, funding, and vol surface confirmation. |

## 7. Evidence independence and duplicate-burst rules

1. Cluster news by canonical event, timestamp window, source lineage, named entities, and extracted fact pattern.
2. Count a duplicate burst as **one event with multiple references**, not multiple independent drivers.
3. Boost reliability only when sources are independent by origin and the extracted facts agree.
4. Penalize low-confidence extraction, missing primary source, ambiguous event target, and conflicting timestamps.
5. Treat official releases as authoritative for the released datapoint, but still track revision risk and market reaction separately.
6. Treat fixture-only provider data as deterministic test coverage, not live market confirmation.
7. Treat dry-run providers as integration readiness, not market intelligence strength.

## 8. Contradiction/tension map

| Tension | Example | Later contradiction rule needed |
| --- | --- | --- |
| Macro vs policy | Weak growth but hawkish central bank | Distinguish short-term currency support from medium-term growth drag. |
| Rates vs risk | Rising real yields while equities rally | Flag unconfirmed rally unless earnings/liquidity breadth validates. |
| Price vs breadth | Index higher but breadth deteriorating | Raise tension and lower confidence until breadth repairs. |
| Safe haven vs yields | XAU/USD or JPY bid while yields rise | Identify acute risk shock or suspect move. |
| USD vs commodity FX | Strong USD and strong oil both active in USD/CAD | Net USD pressure against CAD/oil terms-of-trade pressure. |
| ETF flows vs macro tightening | BTC ETF inflows while liquidity tightens | Avoid overweighting flows without price/funding confirmation. |
| VIX vs equities | Equities rise while VIX/vol surface remains elevated | Flag hedging demand/event-risk tension. |
| COT vs price | Crowded long positioning into weakening price | Flag reversal/fragility risk; COT is lagged. |
| News burst vs primary data | Many headlines without official confirmation | Treat as low independence until primary source confirms. |

## 9. Confidence realism model

Required confidence anatomy for R5:

- source credibility and activation state
- evidence quality and normalization validity
- evidence freshness by driver type
- driver relevance to the specific asset
- independence/duplicate-burst adjustment
- macro-surprise normalization confidence
- FX relative-pressure completeness where applicable
- contradiction/tension penalty
- price reaction/confirmation score
- regime fit and historical scenario support
- provider coverage gap penalty

Confidence must not be high when:

- only fixtures or dry-run shells support critical drivers
- macro evidence lacks actual/forecast/previous/revision normalization
- FX pair pressure is one-sided
- strong driver evidence is contradicted by price action or breadth
- news is a duplicate burst
- crypto derivatives source quality is uncertain
- COT is used as real-time evidence

## 10. Price reaction / confirmation model

Later R6 should evaluate whether markets actually confirm the interpreted event.

Required components:

- pre-event baseline price and volatility
- event timestamp and valid reaction window
- ATR-normalized move
- direction of first impulse
- retracement/fade amount
- follow-through after the first window
- volume/liquidity context where available
- related-market confirmation, e.g. yields/DXY for XAU/USD or breadth/vol for indices
- invalidation when price rejects the expected path near important zones

Price confirmation should raise confidence only when it aligns with the asset-specific driver. Price non-confirmation should lower confidence or raise tension; it should not automatically reverse the driver.

## 11. Launch asset driver matrix

| Asset | Primary drivers | Secondary drivers | Regime modifiers | Contradiction triggers | Freshness sensitivity | Price-confirmation needs | Macro-event sensitivity | Source/provider dependencies | Direction-resolution rules needed later | Current code covers | Current code does not cover |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| XAU/USD | Real yields, USD, Fed path, haven demand | Inflation, ETF/central-bank flows, COT, geopolitics | Safe-haven shocks can override rate drag | Gold up with real yields/USD up; ETF flow vs macro tightening | High for rates/USD/news; lower for COT | Gold move plus yields/DXY confirmation | CPI, Fed, payrolls, geopolitical shocks | Tiingo fixture; macro registry shells; COT shell; ETF shell; news shells | Separate real-yield, USD, and haven pressures | Weight policy and fixtures mention real_yields, inflation, dollar liquidity, COT | No true event impulse, no real-yield live normalization, no haven-vs-rate resolver |
| EUR/USD | ECB-Fed differential, euro vs US surprises | German/euro growth, politics, COT | USD haven bid in risk-off | Weak US data but stronger USD on risk-off; hawkish ECB with growth collapse | High for policy/macro/rates | Pair price plus rate spread/DXY/EUR crosses | CPI/PMI/ECB/Fed/NFP | Tiingo fixture; ECB/Eurostat/Destatis/Fed shells; COT/news shells | Base EUR pressure minus quote USD pressure | Asset weights and registry coverage exist | No two-sided currency engine, no ECB/Fed reaction functions |
| GBP/USD | BoE-Fed differential, UK inflation/wages/growth | Gilt/fiscal credibility, politics, COT | Stagflation can split rate/growth effects | Hot wages supporting BoE but weak growth hurting GBP | High for UK macro/policy | Pair reaction plus gilt/UST spread | CPI, wages, BoE, GDP/PMI | Tiingo fixture; BoE/ONS/Fed shells; COT/news shells | Net GBP domestic pressure against USD pressure | Weights/fixtures include inflation/growth conflict | No wage/inflation/growth normalization or fiscal stress model |
| USD/JPY | UST-JGB differential, Fed-BoJ, intervention risk | Risk regime, real yields, Japan wages/inflation | JPY haven can dominate in stress | USD yields up but JPY strengthens on risk-off/intervention | Very high for yields/intervention headlines | Pair reaction plus UST/JGB and DXY/JPY crosses | Fed/BoJ/CPI/payrolls | Tiingo fixture; Fed/BoJ/Treasury shells; COT/news shells | USD pressure minus JPY pressure with intervention modifier | Weights emphasize rates/policy | No intervention state, no two-sided JPY haven/rates resolver |
| USD/CHF | USD yields/Fed vs CHF haven/SNB | Europe risk, geopolitics, liquidity | CHF haven offset to USD haven | Risk-off supports both USD and CHF | High for risk/geopolitics/policy | Pair reaction plus CHF crosses/DXY | Fed/SNB-adjacent data, risk shocks | Tiingo fixture; macro/news shells; COT shell | USD pressure minus CHF haven/SNB pressure | Fixture coverage and weights exist | No CHF-specific haven netting or SNB source depth |
| AUD/USD | RBA-Fed, global/China growth, risk sentiment, commodities | COT, liquidity, Australia macro | China/global demand can dominate rates | Hawkish RBA but weak China/risk-off | High for China/risk/rates; medium for COT | Pair reaction plus commodities/equity risk | RBA/Fed/CPI/China PMIs/proxies | Tiingo fixture; generic macro shells; COT/news shells; missing direct RBA/China adapters | AUD pressure minus USD pressure with commodity/growth beta | Weights include risk/growth/commodities | No direct China/RBA terms-of-trade engine |
| NZD/USD | RBNZ-Fed, global risk/growth, commodities | Domestic inflation/growth, COT | Liquidity/risk often dominates | Hawkish RBNZ but broad risk-off | High for risk/policy | Pair reaction plus risk/commodity context | RBNZ/Fed/CPI/GDP/PMI | Tiingo fixture; generic macro shells; COT/news shells; missing direct RBNZ/NZ data | NZD pressure minus USD pressure | Weights/fixtures exist | No NZ-specific provider depth or risk-beta resolver |
| USD/CAD | Fed-BoC, oil, US/Canada macro | Risk sentiment, COT | Oil terms-of-trade can oppose USD strength | Strong oil vs strong USD/Fed | High for oil and policy | Pair reaction plus oil and yield spreads | Fed/BoC/jobs/CPI/oil shocks | Tiingo fixture; generic macro/COT/news shells; missing direct BoC/Canada/oil depth | USD pressure minus CAD/oil pressure | Weights include energy commodities | No BoC/Canada/oil normalized pressure engine |
| BTC/USD | Liquidity, real yields, risk sentiment, crypto structure, ETF flows | Regulation, on-chain, funding/OI/liquidations | Derivatives overheating can invert flow optimism | ETF inflows vs tight liquidity; price down despite positive news | Very high for price/derivatives/news | BTC impulse plus funding/OI/liquidation/ETF confirmation | Fed/liquidity/risk events | Tiingo fixture; crypto public shells; derivatives shell; ETF/news shells | Net liquidity/risk/structure with reliability discounts | Crypto registry and fixtures exist | No live derivatives reliability scoring or ETF absorption model |
| Nasdaq 100 | Real yields, earnings, liquidity, risk sentiment | Breadth, vol surface, credit, labor/growth | Duration sensitivity; mega-cap concentration | Index up while breadth/vol/credit deteriorate | High for rates/breadth/vol | Index reaction plus yields/breadth/VIX | CPI/Fed/NFP/earnings | Tiingo fixture; index futures shell not started; breadth/vol/credit shells | Rates/earnings/liquidity/breadth hierarchy | Asset weights and scenarios exist | No sector/mega-cap or breadth freshness confirmation engine |
| S&P 500 | Earnings breadth, financial conditions, real yields, growth | Breadth, credit, vol surface | Broad breadth matters more than single mega-cap support | Price strength vs weak breadth/credit stress | High for breadth/vol/credit | Index reaction plus breadth/credit/vol | CPI/Fed/NFP/PMI/earnings | Tiingo fixture; index futures shell not started; breadth/vol/credit shells | Broad risk/earnings/rates resolver | Weights/fixtures exist | No breadth-vs-price tension engine beyond narrow flags |
| DE30 | ECB/rates, German/euro growth, global risk, exports/energy | EUR, China demand, credit/vol | Domestic weakness vs global beta conflict | German data weak while global risk-on | High for euro macro/ECB/risk | DE30 reaction plus EUR/stoxx/rates confirmation | ECB/PMI/IFO/ZEW/CPI/energy shocks | Tiingo fixture; Destatis/ECB shells; IFO/ZEW shells not started | Domestic euro pressure vs global risk resolver | Registry/fixtures exist | No German industrial/export/energy-specific engine |
| DXY | Fed path, US vs rest rates/growth, USD liquidity, risk-off | Euro/Japan/UK weakness, positioning | Basket composition; broad USD not pair-specific | Weak US data but DXY rises on global stress | High for Fed/rates/risk | DXY reaction plus yields and major FX legs | Fed/CPI/NFP/PMI/global risk | Index futures shell not started; macro shells; Tiingo lacks DXY in initial asset list | Basket-weighted USD pressure resolver | Weights/fixtures cover DXY scenarios | No basket decomposition or live DXY price shell |
| VIX | Equity stress, event uncertainty, vol surface | Credit/liquidity stress, macro-event risk | Vol can stay elevated despite rising equities | Equity rally with elevated/skewed vol | Very high for intraday/daily vol data | VIX/term structure plus equity drawdown confirmation | CPI/Fed/NFP/geopolitical/credit shocks | Index futures shell not started; volatility source shell; credit/liquidity shells | Vol surface/event window resolver | VIX fixtures and weights exist | No actual vol-surface term structure or event-window engine |

## 12. Provider/source relevance map

| Source family | Current readiness meaning | Must-have before strong confidence | Over-weight risk |
| --- | --- | --- | --- |
| Tiingo market data | Fixture-ready, live blocked | Fresh price history for supported assets after live activation | Fixture prices must not be treated as live confirmation. |
| Public exchange prices | Dry-run-ready/partial | Independent fresh FX/crypto/index pricing | Dry-run orchestration is not evidence strength. |
| Index/futures shell | Not started | DXY, VIX, index futures/spot proxies | Missing live index data blocks strong price confirmation. |
| Official macro | Mostly registry/shell or fixture foundations | Actual/forecast/previous/revision, release timestamps, revisions | Official datapoint is strong, but revision and release lag still matter. |
| CFTC COT | Registered/fixture shell | Weekly positioning ingestion with lag metadata | COT is lagged and should never be intraday confirmation. |
| News extraction | Registered fixture/dry-run only | Duplicate clustering, primary-source linkage, extraction confidence | Duplicate news bursts and scraped extraction errors can inflate false conviction. |
| ETF/filings | Registered fixture/dry-run shell | Issuer flow timestamps, filings normalization, stale-flow flags | ETF/fund flows lag and can be absorbed by price without directional follow-through. |
| Crypto risk/liquidity | Fixture/dry-run shells | Venue coverage, liquidation/funding/OI provenance, stale flags | Derivatives data is fragmented and venue-biased. |
| Risk/liquidity/breadth/vol/credit | Fixture/dry-run/shell foundations | Fresh breadth, vol surface, credit spreads, financial conditions | Stale breadth/vol/credit should sharply reduce confidence. |

## 13. Reasoning failure modes to avoid

- Reducing all evidence to `bullish`/`bearish` using generic metadata labels.
- Treating hawkish/dovish as always positive/negative for an asset.
- Treating FX pairs as USD-only.
- Ignoring revisions and previous values in macro releases.
- Allowing duplicate news bursts to masquerade as independent confirmation.
- Treating COT, ETF flows, or crypto derivatives as fresh and authoritative without lag/provenance discounts.
- Raising confidence when price action contradicts the expected reaction.
- Applying the same event decay profile to every event.
- Treating DXY as the same as every USD pair.
- Claiming production-grade market intelligence before R1-R9 are implemented and tested.

## 14. R1-R9 implementation roadmap

| Release | Required upgrade | Outcome required before marking complete |
| --- | --- | --- |
| R1 | Asset-contextual direction resolver | Direction derived from asset-specific driver rules, not generic metadata sentiment. |
| R2 | FX relative currency strength engine | Base and quote currency pressure vectors tested for all launch FX pairs. |
| R3 | Macro surprise normalization engine | Indicator-category normalization with actual/forecast/previous/revision and reaction-function mapping. |
| R4 | Expanded contradiction matrix | Asset-family tension map including price/breadth/rates/haven/ETF/news/COT contradictions. |
| R5 | Confidence calibration upgrade | Confidence anatomy includes source activation, independence, macro validity, FX completeness, provider gaps, and price confirmation. |
| R6 | Price reaction / event impulse engine | ATR/event-window/follow-through logic wired into confidence and contradiction. |
| R7 | Provider reliability and data-gap weighting | Fixture/dry-run/not-started states reduce driver confidence; weak crypto/news/COT/ETF reliability cannot dominate. |
| R8 | Golden scenario expansion | Historical/realistic scenarios cover macro surprises, FX divergence, liquidity, price reaction, duplicate news, and contradictions. |
| R9 | Integrated market-realism acceptance gate | Deterministic tests prove launch-scope market cognition is market-realistic enough without overclaiming. |

## 15. Acceptance criteria for “market-realistic enough”

ELCEO may only claim launch-scope market-realistic reasoning after all of the following are true:

- Every launch asset has tested primary/secondary driver rules.
- FX pairs use tested two-sided relative pressure.
- Macro surprises are normalized by category and include actual/forecast/previous/revision where applicable.
- Duplicate-burst and source-independence rules affect confidence.
- Contradiction detection covers cross-asset, asset-family, price-reaction, and provider-reliability tensions.
- Confidence anatomy explicitly exposes price confirmation, provider gaps, data freshness, and driver coverage.
- Price reaction/impulse confirmation is ATR/event-window aware.
- Provider registry status prevents fixture-only or dry-run-only evidence from producing strong live-confidence claims.
- Golden scenarios include realistic successes, contradictions, stale evidence, duplicate news, FX divergence, macro surprise, crypto derivatives, and price-reaction failures.
- Guardrails continue to avoid direct financial-advice output language.

## C6-R1 — Asset causality map contract note (2026-06-03)

C6-R1 adds the typed, tested asset causality map foundation in `packages/types/src/market-asset-causality.ts`, `packages/schemas/src/market-asset-causality.schema.ts`, and `services/reasoning/src/asset-causality-map/index.ts`.

Current causality-code audit summary:

- C6-R0 docs already identify the required launch-asset truth-source drivers and seven realism gaps, but those docs were not executable contracts.
- The provider source registry covers all launch assets in fixture, dry-run, live-blocked, or not-started form; it does not decide asset-specific causality or confidence.
- Evidence weighting policy provides asset/evidence-class weights and base weights; it does not resolve FX base-vs-quote pressure or macro surprise interpretation.
- Cognition calibration includes freshness, contradiction, confidence, and fixture scenario foundations; it does not implement asset-complete direction resolution, price reaction confirmation, or provider-gap confidence penalties.
- Market cognition signal taxonomy names pressure, contradiction, and confidence concepts; it remains a generic taxonomy rather than an authoritative 14-asset causality matrix.

C6-R1 status:

- Asset causality mapping is now typed and schema validated for XAU/USD, EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, NZD/USD, USD/CAD, BTC/USD, Nasdaq 100, S&P 500, DE30, DXY, and VIX.
- This batch does **not** implement the downstream direction resolver, FX relative strength engine, macro surprise normalization engine, expanded contradiction matrix, confidence calibration upgrade, price reaction/event impulse engine, provider reliability weighting, or golden scenario expansion.
- R2-R9 remain required before final market-intelligence realism can be claimed.
- No UI, live provider activation, payment activation, notification activation, commercial entitlement behavior, Super Admin behavior, or 2FA behavior changed.

## C6-R2 — Asset-contextual direction resolver foundation (2026-06-03)

- C6-R2 adds the first reasoning upgrade after the causality-map foundation: generic metadata direction mapping is no longer the primary weighted-evidence contribution path.
- The same event can now resolve differently by asset: hawkish Fed evidence can support DXY, pressure EUR/USD through USD quote strength, pressure gold/equity/BTC through rates/liquidity context, and carry JPY/CHF haven caveats where applicable.
- The resolver is deterministic and code-backed through types, schemas, tests, canonical boundary read methods, and weighted-evidence integration.
- FX relative-strength remains R3; macro surprise normalization remains R4; expanded contradiction matrix remains R5; confidence calibration foundation is complete in C6-R6; price reaction/impulse remains R7; provider reliability and golden scenario expansion remain pending.
- No UI, live provider activation, payment activation, notification activation, commercial entitlement behavior, Super Admin behavior, affiliate behavior, or 2FA behavior changed.

## C6-R3 — FX relative currency strength engine foundation (2026-06-03)

- C6-R3 adds a deterministic FX relative currency strength foundation for EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, NZD/USD, and USD/CAD.
- FX pair reasoning now models base-currency pressure versus quote-currency pressure, with net pair pressure calculated as base pressure minus quote pressure.
- Missing base-side or quote-side evidence is explicit and lowers confidence instead of being silently inferred from USD-side evidence.
- Non-Fed issuer side handling is improved for Fed/USD, ECB/EUR, BoE/GBP, BoJ/JPY, SNB/CHF, RBA/AUD, RBNZ/NZD, and BoC/CAD metadata.
- DXY support is read-only and limited to broad USD diagnostic coverage; no full basket-weight model is claimed.
- Macro surprise normalization remains R4; expanded contradiction matrix remains R5; confidence calibration foundation is complete in C6-R6; price reaction/impulse remains R7; provider reliability and golden scenarios remain pending.
- No UI, live provider activation, payment activation, notification activation, commercial entitlement behavior, Super Admin behavior, affiliate behavior, route entitlement behavior, or 2FA behavior changed.

## C6-R4 update — macro surprise normalization foundation (2026-06-03)

- Added a deterministic macro surprise normalization foundation before downstream asset direction, FX relative-strength, confidence, contradiction, or price-reaction systems consume macro releases.
- Actual-vs-forecast is now the primary comparison when consensus/forecast exists; actual-vs-previous is only a lower-confidence fallback and is explicitly warned.
- Indicator-specific meaning is now represented for inflation, wages, payrolls, unemployment, jobless claims, GDP/activity, PMI/ISM, retail sales, policy-rate decisions, confidence, and oil inventories.
- Unemployment and jobless claims are inverted so higher-than-forecast values express weaker labor rather than generic positive pressure.
- Revisions, missing previous values, missing consensus dispersion, missing historical distribution, ambiguous units, provider activation gaps, asset-direction pending state, FX relative-strength pending state, and price-confirmation pending state remain visible warnings.
- C6-R4 does not complete C6-R5 expanded contradiction matrices, C6-R6 confidence calibration, C6-R7 price reaction/impulse, or provider reliability/live activation.

## C6-R5 — Expanded contradiction matrix foundation (2026-06-04)

- C6-R5 adds a deterministic, read-only expanded contradiction matrix foundation for market-cognition evidence tension. Contradiction means tension, uncertainty, partial support, stale/fresh disagreement, or pending confirmation; it is not automatic reversal logic and is not a prediction layer.
- Current contradiction-code audit: before C6-R5, `services/reasoning/src/market-cognition/contradiction-signals.ts` only covered four broad signal pairs: macro-vs-policy, liquidity-vs-sentiment, volatility-vs-sentiment, and credit-stress-vs-earnings. It missed cross-asset and driver-specific tensions for policy-vs-risk assets, rates-vs-gold, FX base/quote pressure, equity breadth, crypto derivatives/liquidity, commodity terms-of-trade versus margin effects, safe-haven conflicts, macro surprise without price reaction, stale/fresh evidence, duplicate source bursts, and source independence uncertainty.
- C6-R5 rule families now include policy-vs-risk, rates-vs-gold, FX base/quote, risk-vs-volatility, risk-vs-credit, equities-vs-breadth, crypto-vs-derivatives/liquidity, commodity cross-asset, safe-haven conflict, macro-vs-price-confirmation, stale/fresh conflict, and source disagreement.
- R6 confidence calibration foundation is complete in C6-R6; empirical backtesting remains pending; the matrix can feed contradiction count/severity into existing penalty inputs only and does not claim empirical calibration.
- R7 price reaction/impulse remains pending; macro surprise without price reaction is marked pending confirmation rather than full certainty.
- Provider reliability/golden scenario expansion remains pending; source independence and provider reliability gaps remain visible warnings unless explicit reliability data is supplied.
- No UI, live provider, payment, notification, commercial, billing, Super Admin, affiliate, route-entitlement, or 2FA behavior changed.

## C6-R6 — Confidence calibration foundation (2026-06-04)

- C6-R6 adds a deterministic confidence calibration foundation so final confidence reflects market-readiness quality rather than only evidence weight, freshness, coverage, and raw contradiction count.
- Confidence now accounts for contradiction severity/count/status, source independence caveats, duplicate/source-disagreement risk, FX base/quote completeness, weighted-snapshot diagnostic limitations, macro forecast/actual/fallback completeness, normalized macro caveats, pending price confirmation, provider activation/reliability gaps, stale evidence, stale/fresh conflict, and diagnostic-only paths such as DXY.
- This is not empirically backtested calibration and does not claim statistical production calibration.
- C6-R7 price reaction/impulse, provider reliability weighting, golden scenario expansion, and live provider activation remain pending.
- No UI, live provider, payment, notification, commercial, billing, Super Admin, affiliate, route-entitlement, or 2FA behavior changed.

## C6-R7 — Price reaction / event impulse foundation (2026-06-04)

- C6-R7 adds a deterministic price reaction and event impulse foundation through typed candles, event windows, volatility-adjusted movement, wick rejection, absorption, reversal, delayed follow-through, and canonical boundary diagnostics.
- ELCEO can now classify supplied/input-driven event-window price reactions as confirmed, rejected, absorbed, reversed, delayed, ambiguous, or insufficient data.
- Price confirmation is deterministic and fixture/input driven; it does not activate live chart feeds or live market-data providers.
- The contradiction matrix can use supplied price reaction context to remove pending price-confirmation warnings for confirmed reactions and to surface macro-vs-price tension when reactions are rejected, reversed, absorbed, delayed, or ambiguous.
- Confidence calibration can avoid the severe missing-price-confirmation penalty when confirmed price reaction context is supplied, while rejected/reversed reactions reduce confidence and absorbed/ambiguous/delayed reactions stay cautious.
- Provider reliability weighting remains pending. Golden scenario expansion remains pending. Empirical backtesting remains pending.
- No UI, live provider, payment, notification, commercial, billing, Super Admin, affiliate, route-entitlement, or 2FA behavior changed.

## C6-R8 — Provider reliability and data-gap weighting foundation (2026-06-05)

- C6-R8 added a deterministic provider/source reliability and data-gap weighting foundation across typed contracts, schema validation, reasoning services, evidence weighting, confidence calibration, contradiction diagnostics, canonical boundary methods, and tests.
- Current provider readiness state remains conservative: the provider source registry is readiness/status metadata only. Registry rows are fixture-ready, dry-run-ready, live-blocked, or not-started; C6-R8 treats providers as `live_verified` only when explicitly supplied and does not infer live activation from registry presence.
- Current source reliability assumptions are now explicit: official macro, central bank, and primary/exchange-grade sources score above reputable aggregators; scraped, unknown, duplicated, fixture-only, stale, disabled, or dry-run contexts receive warnings, lower weight multipliers, and lower confidence caps.
- Current evidence-quality inputs used by C6-R8 are source authority, provider kind, activation state, freshness tier, source independence, extraction quality, evidence-class/provider fit, and C6-R1 asset dependency coverage.
- Current provider gaps by asset/evidence class remain visible: XAU/USD depends on real-yields/USD/inflation-policy/haven context, FX pairs require both base and quote macro/policy context, BTC/USD needs crypto derivatives/on-chain/ETF/liquidity/regulatory context, equity indices need rates/breadth/volatility/credit/liquidity context, DXY remains basket-diagnostic limited, and VIX needs volatility/equity/risk/credit context.
- C6-R8 changes evidence strength before confidence can overstate certainty: provider reliability reasons are appended to weighted evidence, weak providers reduce `qualityAdjustedWeight`, and low reliability or confidence caps are consumed by confidence calibration when provider context is supplied.
- C6-R8 does **not** activate live providers, call external APIs, implement empirical backtesting, expand golden scenarios, add UI, or change payments, notifications, commercial behavior, Super Admin behavior, affiliates, route entitlements, or 2FA.
- Remaining pending work for C6-R9 and later: live provider activation, empirical reliability backtesting, expanded golden scenarios, live payload verification, and production-provider smoke tests.

## C6-R9 golden scenario acceptance suite — deterministic fixture layer

- C6-R9 adds a fixture-driven market-realism acceptance suite under `services/reasoning/src/golden-scenarios/index.ts` with 33 deterministic golden scenarios.
- Current golden-scenario audit: the repository already had a narrower `golden-scenario-reasoning` pack for launch fixtures; C6-R9 expands coverage into a market-realism suite spanning all 14 launch/diagnostic assets: XAU/USD, EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, NZD/USD, USD/CAD, BTC/USD, Nasdaq 100, S&P 500, DE30, DXY, and VIX.
- C6-R9 scenarios verify asset-contextual direction, macro actual-vs-forecast surprise handling, inverted labor indicators, FX base/quote relative strength, cross-asset contradictions, confidence caps, price-reaction confirmation/rejection/absorption/reversal, provider reliability, source independence, duplicate-source risk, missing critical dependencies, and DXY/VIX diagnostic limits.
- This is deterministic acceptance, not live provider activation, not empirical backtesting, and not production data calibration.
- Live provider activation remains pending.
- Empirical reliability/backtesting remains pending.
- Production data calibration remains pending.
- No UI, live provider, payment, notification, commercial, Super Admin, affiliate, route entitlement, or 2FA behavior changed in C6-R9.

## C6-R9B golden scenario real-engine execution cleanup

- C6-R9B converts the golden scenario runner from a fixture self-check into a real-engine acceptance harness.
- Scenario observed outputs are now derived from actual reasoning modules: evidence weighting, asset-direction resolution, macro surprise normalization, FX relative strength, contradiction matrix, confidence calibration, price reaction, and provider reliability.
- Expected fixture values are used only as acceptance criteria; observed direction, confidence, contradiction families, price-reaction status, provider warnings, and reason codes are not copied from expected outcomes.
- The suite remains fixture-driven and deterministic; it is not empirical backtesting, live provider activation, or production data calibration.
- Live provider activation and production data calibration remain pending.
- No UI/live provider/payment/notification/commercial/Super Admin/affiliate/2FA behavior changed.

## C6-R9C golden scenario acceptance purity cleanup

- C6-R9C removes fixture-derived warnings and manually injected contradiction families from golden-scenario acceptance logic.
- Required warnings and expected contradiction families are now satisfied only by actual engine outputs, with fixture metadata limited to deterministic input construction and expected criteria.
- Confidence expectations now use meaningful deterministic bounds/tier/cap checks instead of universal 0–100 acceptance ranges.
- Golden scenarios remain deterministic fixture-driven real-engine acceptance, not live provider activation, empirical backtesting, or production data calibration.
- Live provider activation and production data calibration remain pending.
- No UI/live provider/payment/notification/commercial/Super Admin/affiliate/route-entitlement/2FA behavior changed.

## C6-R9D golden scenario confidence acceptance tightening

- C6-R9D tightens golden scenario confidence acceptance so the suite fails when actual engine confidence is materially too low, materially too high, or outside the allowed confidence tier.
- Default scenario confidence bands are now meaningful deterministic bands instead of broad 0–100-like ranges, and tier/cap expectations are enforced for diagnostic, fixture-only, and price-reaction scenarios.
- Golden scenarios remain deterministic fixture-driven real-engine acceptance, not live provider activation, empirical backtesting, or production data calibration.
- Live provider activation, empirical reliability/backtesting, and production data calibration remain pending.
- No UI/live provider/payment/notification/commercial/Super Admin/affiliate/route-entitlement/2FA behavior changed.

## C6-R9E golden scenario expectation completeness closure

- C6-R9E closes expectation completeness for deterministic golden scenarios: expected reason codes, provider warnings, price-reaction status/warnings, severity expectations, and confidence expectations now participate in pass/fail.
- Severity vocabulary now reuses the canonical contradiction severity contract (`none`, `low`, `moderate`, `high`, `critical`) rather than a separate fixture-only vocabulary.
- Golden scenarios remain deterministic fixture-driven real-engine acceptance; live provider activation, empirical backtesting, and production-data calibration remain pending.
- No adaptive confidence or drift engine was introduced.
- No UI/live provider/payment/notification/commercial/Super Admin/affiliate/route-entitlement/2FA behaviour changed.
