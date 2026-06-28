# C6-R0 Market Realism Code Gap Audit

Status: **completed audit, implementation pending**. This document records what the current reasoning layer does, what is scaffold/fixture-only, and which R1-R9 upgrades are required before ELCEO can claim final market-realistic market intelligence.

## Current reasoning code audit summary

### What exists

- `services/reasoning/src/runtime/canonical-market-intelligence-boundary.ts` exposes registry, evidence-quality, evidence-weighting, market-cognition, provider readiness, official macro, crypto/risk/liquidity, news/filings, launch fixtures, and golden-scenario helpers through the canonical market-intelligence boundary.
- `services/reasoning/src/evidence-weighting/weight-policies.ts` defines asset-specific evidence-class weights for launch assets. This is a useful driver-priority scaffold.
- `services/reasoning/src/evidence-weighting/weight-calculation.ts` builds weighted evidence and infers direction from `metadataJson.direction`, `metadataJson.sentiment`, or `metadataJson.bias`.
- `services/reasoning/src/evidence-quality/` contains quality, conflict, credibility, and freshness scoring foundations.
- `services/reasoning/src/reasoning-input/` assembles evidence inputs with filtering policy and quality scoring.
- `services/reasoning/src/market-cognition/pressure-signals.ts` groups weighted evidence by signal kind and creates pressure signals from contribution scores.
- `services/reasoning/src/market-cognition/contradiction-signals.ts` detects a narrow set of pairwise signal contradictions.
- `services/reasoning/src/market-cognition/confidence-decomposition.ts` decomposes confidence into quality, weight, freshness, coverage, and contradiction penalty.
- `services/reasoning/src/provider-source-registry/source-registry.ts` registers launch provider/source coverage and explicit activation stages.
- `services/reasoning/src/official-macro-sources/`, `services/reasoning/src/crypto-risk-liquidity/`, and `services/reasoning/src/news-extraction-filings/` provide source registries, fixture payloads, readiness reports, and normalization shells.
- `services/reasoning/src/golden-scenario-reasoning/golden-scenario-definitions.ts` contains 18 deterministic golden scenarios with tier/cross-asset/freshness coverage.
- `services/reasoning/src/launch-asset-fixtures/fixture-library.ts` contains broader launch-asset fixture scenarios for all 14 launch assets.

### What is scaffold/fixture/dry-run only

- Tiingo market data is fixture-ready and live blocked.
- Public market prices are dry-run-ready with partial fixture readiness.
- Index/futures source shell is not started, affecting DXY, VIX, Nasdaq 100, and S&P 500 price confirmation.
- Official macro sources are mostly registry/shell/fixture foundations. They do not yet provide a live macro surprise engine.
- CFTC COT, ETF flows, filings, crypto derivatives, market breadth, volatility, credit stress, and liquidity sources are registered or fixture/dry-run foundations, not live activated truth sources.
- News extraction/filings foundations are fixture/dry-run only and require duplicate-burst/source-independence logic before they can safely strengthen confidence.

### What is incomplete or missing

- Direction inference is generic and metadata-label driven; it is not asset-contextual.
- FX pair reasoning is not a formal two-sided base-vs-quote currency pressure engine.
- Macro surprise normalization does not yet compute indicator-specific actual/forecast/previous/revision surprise and asset impact vectors.
- Contradiction detection covers only four signal-pair families and does not include price reaction, breadth, COT lag, ETF-flow absorption, FX two-sided tension, duplicate news, or provider activation gaps.
- Confidence lacks provider activation state, evidence independence, macro-normalization validity, FX-completeness, price confirmation, and data-gap penalties.
- Price reaction and event impulse confirmation are underdeveloped for ATR/event windows/follow-through.
- Golden scenarios are useful but too shallow for historical/realistic regime coverage.

## GAP 1 — Asset-contextual direction resolver

- Current code path: `inferWeightedEvidenceDirection` in `services/reasoning/src/evidence-weighting/weight-calculation.ts`; pressure construction in `services/reasoning/src/market-cognition/pressure-signals.ts`; weights in `services/reasoning/src/evidence-weighting/weight-policies.ts`.
- Exact weakness: direction is inferred from metadata labels such as `bullish`, `bearish`, `positive`, `negative`, `hawkish`, `dovish`, `risk_on`, and `risk_off`, then translated into a contribution score. The same label is treated similarly across assets once weight is applied.
- Affected files: `weight-calculation.ts`, `pressure-signals.ts`, `market-cognition-builder.ts`, `signal-taxonomy.ts`, golden scenario definitions, launch fixtures, and market-cognition types.
- Affected assets: all launch assets; highest risk for XAU/USD, BTC/USD, indices, VIX, and all FX pairs.
- Risk severity: **critical**.
- Required future implementation: R1 must add an asset-contextual direction resolver that maps evidence classes and normalized facts into asset-specific pressure vectors before contribution scoring.
- Tests needed: asset-by-asset direction cases for hot CPI, hawkish central bank, rising real yields, risk-off, ETF inflow, weak breadth, credit stress, and commodity shocks.

## GAP 2 — FX relative currency strength engine

- Current code path: asset weights in `weight-policies.ts`; generic direction inference in `weight-calculation.ts`; launch FX fixtures in `fixture-library.ts` and golden scenarios.
- Exact weakness: FX pairs have weights by asset, but no explicit base-currency and quote-currency pressure vectors. USD/JPY, USD/CHF, USD/CAD, EUR/USD, GBP/USD, AUD/USD, and NZD/USD are not resolved through a formal two-sided model.
- Affected pairs: EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, NZD/USD, USD/CAD, plus DXY as a basket context source.
- Required future implementation: R2 must calculate per-currency pressure from policy path, yield differential, growth/inflation surprise, risk beta, haven/funding status, commodity exposure, and positioning, then net base minus quote.
- Tests needed: USD-base and USD-quote polarity tests; JPY/CHF haven offset tests; AUD/NZD risk-off despite hawkish domestic policy; USD/CAD oil-vs-Fed conflict; DXY basket-vs-pair divergence tests.

## GAP 3 — Macro surprise normalization engine

- Current code path: official macro source registry/foundations in `official-macro-sources/index.ts`; evidence classes and payload contracts; generic evidence metadata direction.
- Exact weakness: macro evidence is not normalized by indicator category with actual/forecast/previous/revision, standard deviation, release lag, revision risk, and reaction function. Hawkish/dovish or positive/negative labels are insufficient.
- Indicator categories needed: CPI/inflation, labor/payrolls/wages/unemployment, growth/PMI/GDP/retail, central-bank rate decisions/statements/projections, fiscal/debt supply/auctions, financial conditions, liquidity operations.
- Required future implementation: R3 must add standardized surprise objects and asset-impact mapping by indicator class, region, regime, and central-bank reaction function.
- Tests needed: hot CPI with rising real yields; strong payrolls with wage acceleration; weak payrolls with unemployment rise; hawkish hold vs dovish hike; PMI contraction vs disinflation relief; revisions changing the signal.

## GAP 4 — Expanded contradiction matrix

- Current contradiction rules: `services/reasoning/src/market-cognition/contradiction-signals.ts` checks macro vs policy, liquidity vs risk sentiment, volatility vs risk sentiment, and credit stress vs earnings.
- Missing contradictions: price vs expected driver, price vs breadth, real yields vs gold, ETF flows vs macro liquidity, COT crowding vs price reversal, VIX/vol surface vs equity rally, duplicate news burst vs primary data, FX base-vs-quote divergence, USD risk-off vs CHF/JPY haven, oil vs USD/CAD, and provider activation/data gaps vs high confidence.
- Asset-family contradiction map: metals need rates/USD/haven tensions; FX needs two-sided currency pressure conflicts; equities need rates/earnings/breadth/vol/credit conflicts; BTC needs liquidity/ETF/derivatives/price conflicts; VIX needs equity/vol/event-window conflicts; DXY needs basket-vs-pair and risk-off-vs-US-data conflicts.
- Tests needed: one contradiction suite per asset family plus launch-asset matrix cases for each high-severity contradiction.

## GAP 5 — Confidence calibration upgrade

- Current confidence formula: `services/reasoning/src/market-cognition/confidence-decomposition.ts` combines average evidence quality, usable/total weight, freshness, signal coverage, and contradiction penalty.
- Missing components: source activation state, provider reliability, fixture/dry-run penalty, evidence independence, duplicate-burst adjustment, macro normalization validity, FX relative-pressure completeness, price confirmation, provider data gaps, source family freshness, COT lag, crypto derivatives venue confidence, and ETF-flow lag/absorption.
- Required confidence anatomy: source credibility, evidence quality, freshness, driver relevance, independence, macro validity, FX completeness, contradiction, price confirmation, regime fit, and data-gap penalty.
- Tests needed: confidence must fall for fixture-only critical drivers, duplicate news bursts, stale COT, no price confirmation, unnormalized macro surprise, one-sided FX pressure, and crypto derivatives-only evidence.

## GAP 6 — Price reaction / event impulse engine

- Current chart/price reaction state: chart projection, price-level projection, and zone anchoring foundations exist in `services/reasoning/src/engine/`, but market-cognition confidence does not yet include ATR-normalized event reaction, follow-through, or event-window confirmation.
- Required ATR/event-window/follow-through logic: pre-event baseline, ATR/volatility normalization, initial impulse, retracement/fade, follow-through, related-market confirmation, zone rejection/acceptance, and invalidation state.
- Tests needed: CPI expected direction confirmed/faded; gold driver contradicted by yields/DXY; equity rally without breadth; VIX spike with equity selloff; BTC ETF inflow without price absorption; DE30 domestic data ignored during global risk-on.

## GAP 7 — Golden scenario expansion

- Current scenario coverage: `GOLDEN_SCENARIOS` has 18 scenarios: 15 asset-specific launch/tier scenarios, 2 cross-asset scenarios, and 1 freshness scenario. Launch fixtures provide broader 14-asset fixture scenarios but are not sufficient as final market-realism acceptance tests.
- Missing historical/realistic scenarios: 2022 inflation/rates shock analogs, 2023 bank stress/credit episodes, CPI/NFP revision reversals, Fed/ECB/BoJ communication mismatches, yen intervention risk, CHF safe-haven episodes, oil-vs-CAD conflicts, ETF-flow absorption failures, crypto funding/OI liquidations, breadth divergence, vol-surface stress, duplicate news burst, and price-reaction fade cases.
- Tests needed: R8 should build deterministic scenario packs for macro surprise, FX divergence, cross-asset contagion, crypto liquidity/derivatives, stale provider data, duplicate news, COT lag, ETF flow lag, and price-reaction confirmation/failure.

## Provider/data gap audit by launch asset

| Asset | Providers ready now | Fixture-only | Dry-run only | Not started / insufficient | Drivers not reliably reasoned today | Must-have before strong confidence | Nice-to-have | Should not be over-weighted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| XAU/USD | Registry coverage and fixture evidence | Tiingo, macro/treasury/fed shells, COT, ETF/news fixtures | Some source orchestration | Live real yields, ETF holdings, official macro live | Real yields, live USD pressure, safe-haven confirmation | Fresh XAU price, real yields, DXY/rates, official macro, duplicate-filtered news | central-bank reserves | COT lag, ETF lag, duplicate safe-haven headlines |
| EUR/USD | Registry coverage | Tiingo, ECB/Eurostat/Destatis/Fed/COT/news fixtures | Public price partial | Live rate differentials and euro data | ECB-Fed reaction functions and revisions | Fresh pair price, ECB/Fed macro, rates spreads | COT, political risk feeds | COT lag, duplicated political headlines |
| GBP/USD | Registry coverage | Tiingo, BoE/ONS/Fed/COT/news fixtures | Public price partial | Live UK surprise engine/gilt stress | UK wage/inflation/growth mix | Fresh pair price, ONS/BoE/Fed releases, gilt/UST spreads | fiscal credibility feed | COT lag, generic UK sentiment |
| USD/JPY | Registry coverage | Tiingo, BoJ/Fed/Treasury/COT/news fixtures | Public price partial | Intervention and JGB/UST live differential depth | JPY haven/intervention risk | Fresh pair price, UST/JGB context, Fed/BoJ releases | MoF/intervention monitoring | Intervention rumor bursts, COT lag |
| USD/CHF | Registry coverage | Tiingo, macro/news/COT fixtures | None meaningful | SNB/Swiss macro depth | CHF haven/SNB pressure | Fresh pair price, SNB/Swiss data, Europe risk, DXY | geopolitical primary sources | generic risk-off headlines |
| AUD/USD | Registry coverage | Tiingo, generic macro/COT/news fixtures | None meaningful | Direct RBA/Australia/China/commodity live sources | China/global demand and commodity terms of trade | Fresh pair price, RBA/Australia data, China/global growth proxies, USD rates | iron ore/commodity feeds | generic risk sentiment only |
| NZD/USD | Registry coverage | Tiingo, generic macro/COT/news fixtures | None meaningful | Direct RBNZ/NZ data | NZ-specific policy/growth pressure | Fresh pair price, RBNZ/NZ data, USD rates, risk regime | dairy/commodity proxies | generic AUD-like assumptions |
| USD/CAD | Registry coverage | Tiingo, generic macro/COT/news fixtures | None meaningful | Direct BoC/Canada/oil depth | Oil-vs-CAD pressure, BoC reaction | Fresh pair price, oil, BoC/Canada macro, Fed/US macro | Canadian credit/housing context | generic oil headlines, COT lag |
| BTC/USD | Registry coverage | Tiingo, crypto, ETF/news/liquidity fixtures | public exchange partial | Live exchange/derivatives/on-chain reliability | Funding/OI/liquidations, ETF absorption | Fresh BTC price, venue-qualified derivatives, ETF flows, liquidity/rates | on-chain metrics | fragmented derivatives, social/news bursts |
| Nasdaq 100 | Registry coverage | Tiingo, breadth/vol/credit/risk fixtures | None meaningful | Index/futures shell not started | Sector/mega-cap breadth, vol surface | Fresh index/futures price, real yields, breadth, earnings, vol/credit | sector/semiconductor feeds | stale breadth/credit, generic AI headlines |
| S&P 500 | Registry coverage | Tiingo, breadth/vol/credit/risk fixtures | None meaningful | Index/futures shell not started | Breadth and credit confirmation | Fresh index price, breadth, earnings, vol, credit, rates | sector breadth | stale breadth, headline index-only confirmation |
| DE30 | Registry coverage | Tiingo, ECB/Destatis/risk fixtures | None meaningful | IFO/ZEW shells not started; energy/export depth | German growth/export/energy effects | Fresh DE30 price, ECB/German macro, euro rates, global risk | China/export proxies | generic Europe news bursts |
| DXY | Registry coverage | Macro/risk fixtures | None meaningful | Index/futures shell not started; no robust basket decomposition | DXY live price and basket-leg pressure | Fresh DXY/basket prices, Fed/US macro, non-US central bank data | positioning | treating DXY as every USD pair |
| VIX | Registry coverage | Vol/credit/risk fixtures | None meaningful | Index/futures/vol surface shell not started | Term structure/skew/event risk | Fresh VIX/vol surface, S&P reaction, event calendar, credit | options positioning | stale spot VIX, isolated headline fear |

## Golden scenario audit

- Current scenario count: 18 in `GOLDEN_SCENARIOS`.
- Assets covered: XAU/USD, EUR/USD, GBP/USD, USD/JPY, BTC/USD, Nasdaq 100, S&P 500, DE30, DXY, VIX, AUD/USD, USD/CHF, NZD/USD, USD/CAD, plus cross-asset coverage for VIX/DXY-led regimes.
- Evidence classes covered: real yield, risk regime, Fed policy, inflation, macro growth, ETF flow, liquidity, earnings, market breadth, market price history, commodities, volatility, credit stress, and DXY liquidity appear in fixtures.
- Missing market regimes: sustained inflation/rates shock, disinflation growth scare, fiscal/debt supply stress, bank/credit stress, yen intervention, CHF haven shock, oil shock, China demand shock, vol surface inversion, liquidity squeeze.
- Missing contradiction scenarios: price-vs-driver, price-vs-breadth, duplicate news, COT lag/crowding, ETF inflow absorbed by price, crypto derivatives fragility, DXY basket-vs-pair divergence, safe haven vs yields.
- Missing macro surprise scenarios: CPI/NFP/PMI/rate decision surprises with actual/forecast/previous/revision and indicator-specific direction.
- Missing FX divergence scenarios: USD-base vs USD-quote polarity, JPY/CHF haven outperformance, AUD/NZD/commodity beta, USD/CAD oil-vs-Fed, EUR/GBP domestic weakness vs USD risk-off.
- Missing crypto liquidity/derivatives scenarios: funding/OI overheating, liquidation cascade, ETF flow without spot follow-through, venue-data conflict, regulatory news duplicate burst.
- Missing price-reaction scenarios: first impulse/fade/follow-through, ATR-normalized move, related-market confirmation, zone rejection after macro event.

## C6-R0 acceptance statement

C6-R0 is complete only as an audit/truth-source foundation. It intentionally does not implement broad reasoning changes, activate live providers, modify UI, activate payments, activate notifications, add secrets, or alter commercial/Super Admin/2FA behavior. R1-R9 remain required before ELCEO can claim final market-intelligence realism.

## C6-R1 — Code-backed causality contract added (2026-06-03)

C6-R1 converts the C6-R0 audit into an executable asset causality contract, without closing the R2-R9 implementation gaps.

Exact current overlaps and inconsistencies now documented by code:

- C6-R0 truth-source docs overlap with the new map on launch assets, major driver categories, provider activation caveats, contradiction needs, and downstream phase dependencies.
- Provider registry coverage overlaps with provider dependency IDs in the new map, but registry status is source-readiness only; the new map marks dependency tier and current coverage without claiming live availability.
- Weighting policy overlaps on evidence class weighting and base relevance, but it is not an asset-contextual driver interpreter.
- Cognition calibration overlaps on confidence decomposition, freshness, and contradiction foundations, but lacks source activation penalties, price confirmation, FX completeness, and macro validity components required by the map.
- Signal taxonomy overlaps on pressure, direction, contradiction, sentiment, and confidence vocabulary, but it does not define two-sided FX requirements or asset-family causality.

C6-R1 adds typed descriptors, validators, deterministic reasoning helpers, canonical boundary read methods, and tests. The following remain pending: asset-contextual direction resolution, FX relative strength, macro surprise normalization, expanded contradictions, confidence overhaul, price reaction/event impulse logic, provider reliability weighting, and golden scenario expansion.

No UI, live provider, payment, notification, commercial, Super Admin, or 2FA behavior was changed.

## C6-R2 — Asset-contextual direction resolver audit update (2026-06-03)

- Current generic direction path audited: prior weighted evidence used `inferWeightedEvidenceDirection` in `services/reasoning/src/evidence-weighting/weight-calculation.ts` to read `metadataJson.direction`, `metadataJson.sentiment`, or `metadataJson.bias`; generic labels such as `hawkish`, `dovish`, `risk_on`, `risk_off`, `positive`, and `negative` could become bullish/bearish before asset context.
- Exact weakness: the old path treated policy tone, risk regime, and sentiment as one-sided labels, so the same event could contribute in the same direction for assets that should differ by base/quote orientation, rates sensitivity, haven behavior, commodity linkage, or crypto-native context.
- Affected assets: XAU/USD, EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, NZD/USD, USD/CAD, BTC/USD, Nasdaq 100, S&P 500, DE30, DXY, and VIX.
- Affected files corrected in C6-R2: `services/reasoning/src/evidence-weighting/weight-calculation.ts` now routes direction through `services/reasoning/src/asset-direction-resolution/index.ts`; new contracts live in `packages/types/src/market-asset-direction-resolution.ts`; new validation lives in `packages/schemas/src/market-asset-direction-resolution.schema.ts`; canonical read methods were added under the market-intelligence boundary.
- How C6-R2 corrects it: direction is now resolved through deterministic asset-contextual rules that consume the 14-asset causality map, asset family, evidence class, raw hint, driver kind, policy tone, risk regime, FX base/quote orientation, commodity/crypto/equity context, and explicit caveat flags for pending surprise normalization, FX relative strength, and price confirmation.
- Remaining pending: R3 FX relative-strength engine, R4 macro surprise normalization, R5 expanded contradiction matrix, R6 confidence calibration, R7 price reaction/impulse, R8 provider reliability/golden scenario expansion, and R9 integrated acceptance remain open. C6-R2 does not claim final market-intelligence realism.
- No UI, live provider, payment, notification, commercial entitlement, Super Admin, affiliate, or 2FA behavior changed.

## C6-R2B — Direction resolver issuer-ambiguity cleanup (2026-06-03)

- Corrected policy issuer ambiguity in the asset-direction resolver: missing hawkish/dovish policy issuer metadata no longer defaults to Fed/U.S. pressure.
- Explicit Fed/U.S. metadata still resolves asset-contextually across DXY, FX pairs, gold, U.S. equity indices, BTC/USD, and VIX with the existing C6-R2 caveats.
- Non-Fed issuer-side handling remains intentionally limited until later issuer-side expansion and R3 FX relative-strength work; R3/R4/R5/R6/R7 remain pending.
- No UI, live provider, payment, notification, commercial, Super Admin, route entitlement, or 2FA behavior changed.

## C6-R3 — FX relative currency strength engine foundation (2026-06-03)

- Added code-backed FX relative strength foundation so launch FX pairs are no longer treated as one-sided USD-only instruments.
- The remaining limitation is now narrower: base-vs-quote pressure exists and is tested, but macro surprise normalization, expanded contradiction logic, confidence calibration, price reaction/impulse confirmation, provider reliability weighting, and golden scenario expansion remain open.
- Missing base or quote evidence now produces explicit low-confidence warnings rather than a strong pair direction.
- Non-Fed issuer metadata is side-aware for ECB/EUR, BoE/GBP, BoJ/JPY, SNB/CHF, RBA/AUD, RBNZ/NZD, and BoC/CAD, while issuer-less policy metadata remains ambiguous.
- DXY is exposed only as limited broad-USD diagnostic support until a real basket-weight model exists.
- C6-R3B safety cleanup: unsupported/non-FX weighted snapshots no longer default to EUR/USD; weighted-snapshot FX relative-strength reconstruction is diagnostic/limited because original issuer/currency metadata may be reduced, so evidence-item inputs remain preferred for full FX side attribution.
- No UI, live provider, payment, notification, commercial, Super Admin, affiliate, route entitlement, or 2FA behavior changed.

## C6-R4 audit update — Macro Surprise Normalization Engine (2026-06-03)

- Macro-like evidence currently enters through reasoning evidence metadata, official macro fixtures, macro calendar/indicator payloads, asset direction resolution, FX relative strength, and weighted evidence reason propagation.
- C6-R2 flagged surprise-like macro evidence with `pending_macro_surprise_normalization` in the asset direction resolver; C6-R3 carried the same warning into FX relative strength when macro surprise pressure was still unnormalized.
- C6-R4 adds `services/reasoning/src/macro-surprise-normalization/index.ts`, `packages/types/src/market-macro-surprise.ts`, and `packages/schemas/src/market-macro-surprise.schema.ts` so actual-vs-forecast normalization is deterministic and schema-validated.
- Direction resolver integration now applies normalized economic meaning/pressure context when release metadata includes actual/forecast/previous fields, while preserving asset-contextual resolution and price-confirmation caveats.
- FX relative strength now maps normalized macro surprises to the relevant currency side when the release currency belongs to the pair; one-sided evidence still keeps missing-side/relative-magnitude penalties.
- Weighted evidence now carries macro surprise reason/warning strings from the direction resolver; actual-only macro releases remain low-confidence/incomplete and do not create a high-confidence contribution.
- Remaining gaps: C6-R5 expanded contradiction matrix, C6-R6 confidence calibration with empirical distributions, C6-R7 price impulse/reaction confirmation, consensus dispersion ingestion, historical sigma/z-score calibration, provider quality/reliability activation, and live macro provider dependencies.

## C6-R5 code-gap audit update — Expanded contradiction matrix (2026-06-04)

- Current contradiction rules audited: `services/reasoning/src/market-cognition/contradiction-signals.ts` previously emitted stable market-cognition flags for four narrow pair families only: macro pressure vs policy pressure, liquidity pressure vs risk sentiment pressure, volatility pressure vs risk sentiment pressure, and credit stress pressure vs earnings pressure.
- Coverage gaps found: hawkish policy vs risk-asset strength, XAU/USD strength vs real-yield/USD strength, FX base-vs-quote pressure conflicts, equity index strength vs deteriorating breadth, risk-on narratives with rising VIX/volatility or credit stress, BTC strength with overheated derivatives/funding or deteriorating liquidity, oil effects that support CAD but pressure DE30 industrial margins, safe-haven conflicts across USD/JPY/CHF/gold, macro surprise without price reaction, stale/fresh evidence conflicts, provider/source disagreement, and duplicate source bursts.
- Files affected by C6-R5: new types in `packages/types/src/market-contradiction-matrix.ts`, new schemas in `packages/schemas/src/market-contradiction-matrix.schema.ts`, new deterministic reasoning module in `services/reasoning/src/contradiction-matrix/index.ts`, a bridge in market-cognition contradiction signals, market-cognition builder integration, canonical boundary read-only methods, and reasoning tests.
- C6-R5 changes: contradiction detection now covers policy-vs-risk, rates-vs-gold, FX base/quote, risk-vs-volatility, risk-vs-credit, equities-vs-breadth, crypto-vs-derivatives/liquidity, commodity cross-asset, safe-haven conflict, macro-vs-price-confirmation, stale/fresh conflict, and source disagreement. Contradiction is treated as tension/uncertainty and not as reversal or direct financial advice.
- Remaining pending work: C6-R6 empirical confidence calibration, C6-R7 price reaction/impulse engine, provider reliability weighting, and golden scenario expansion remain open and must not be marked complete by C6-R5.
- No UI, live provider, payment, notification, commercial, billing, Super Admin, affiliate, route-entitlement, or 2FA behavior changed.

## C6-R5B source-disagreement cleanup note (2026-06-04)

- `source_disagreement` no longer fires solely from `sourceIndependenceVerified: false`; unverified source independence remains a warning/caveat.
- Duplicate, scraped, and same-headline source bursts still produce `source_disagreement` when actual source-conflict evidence is present.
- C6-R6 confidence calibration, C6-R7 price reaction/impulse logic, provider reliability weighting, and golden scenario expansion remain pending.
- No UI, live provider, payment, notification, commercial, billing, Super Admin, affiliate, route-entitlement, or 2FA behavior changed.

## C6-R6 confidence calibration code-gap update (2026-06-04)

- Added `packages/types/src/market-confidence-calibration.ts`, `packages/schemas/src/market-confidence-calibration.schema.ts`, and `services/reasoning/src/confidence-calibration/index.ts` as the deterministic confidence calibration foundation.
- Updated market-cognition confidence decomposition to consume calibrated confidence and keep existing snapshot shape/backward-compatible fields.
- Calibration considers contradiction severity, source independence versus duplicate/source-disagreement risk, provider activation/reliability gaps, FX base/quote completeness, macro forecast/actual/fallback completeness, pending price confirmation, stale/fresh conflict, and DXY/weighted FX diagnostic limitations.
- Remaining gaps: C6-R7 price reaction/impulse engine, provider reliability weighting, golden scenario expansion, empirical backtesting, and live provider activation.
- No UI, live provider, payment, notification, commercial, billing, Super Admin, affiliate, route-entitlement, or 2FA behavior changed.

### C6-R6 audit notes — current confidence inputs and weaknesses

- Before C6-R6, `services/reasoning/src/market-cognition/confidence-decomposition.ts` derived final confidence from average evidence quality, usable-weight ratio, stale/expired freshness, pressure-family coverage, and a generic contradiction-count penalty.
- Weakness found: contradiction severity/status, source-independence quality, duplicate/source bursts, provider activation/reliability gaps, FX base/quote completeness, macro forecast/actual/fallback completeness, price-confirmation pending status, stale-vs-fresh conflict, asset-causality completeness, and diagnostic-only paths were not fully represented in the final confidence score.
- C6-R6 changes: adds typed calibration inputs/results, schema validators, deterministic penalty/boost rules, market-cognition integration, canonical boundary methods, and regression tests for high-tier blocking conditions.
- Still pending after C6-R6: R7 price reaction/impulse, provider reliability weighting, golden scenario expansion, empirical backtesting, and live provider activation.
## C6-R6B confidence calibration provider/source context cleanup (2026-06-04)

- `providerReliabilitySupplied` is input-level provider context for one calibration input, not completion of global provider reliability weighting.
- System-level provider reliability expansion remains pending; C6-R7 price reaction, provider reliability weighting, golden scenarios, empirical backtesting, and live provider activation remain pending.
- Market cognition keeps conservative provider/source defaults when no explicit internal context is supplied, and calibration can reuse a supplied contradiction matrix to reduce future context drift.
- No UI, live provider, payment, notification, commercial, billing, Super Admin, affiliate, route-entitlement, or 2FA behavior changed.

## C6-R7 code-gap update — price reaction / event impulse foundation (2026-06-04)

- Previously, price confirmation existed primarily as pending warnings such as `pending_price_confirmation`, `missing_price_reaction`, and confidence penalties for event-sensitive evidence without price reaction context.
- C6-R7 adds `packages/types/src/market-price-reaction.ts`, `packages/schemas/src/market-price-reaction.schema.ts`, and `services/reasoning/src/price-reaction/index.ts` to evaluate deterministic event-time price movement, impulse class, volatility-adjusted move size, wick rejection, absorption, reversal, delayed follow-through, and insufficient-data states.
- The contradiction matrix now distinguishes supplied confirmed, rejected, absorbed, reversed, delayed, ambiguous, and insufficient price reactions for macro-vs-price context instead of treating all macro price confirmation as missing.
- Confidence calibration now removes the severe missing-price-confirmation penalty when confirmed reaction context is supplied, reduces confidence for rejected/reversed reaction context, and remains cautious for absorbed/ambiguous/delayed context.
- This is fixture/input driven only and does not activate live providers, chart feeds, recommendations, payments, notifications, commercial controls, Super Admin controls, affiliates, route entitlements, or 2FA behavior.
- Provider reliability weighting remains pending. Golden scenario expansion remains pending. Empirical backtesting remains pending.

## C6-R8 code-gap update — provider reliability/data-gap weighting (2026-06-05)

Closed foundation-level gap:

- Added deterministic provider/source reliability contracts, validators, reasoning module, canonical boundary methods, and tests.
- Provider reliability now uses available registry/status/metadata/test fixtures only; it scores authority, activation state, freshness, independence, extraction quality, provider/evidence-class fit, and C6-R1 asset dependency coverage.
- Evidence weighting now appends provider reliability diagnostics and reduces evidence contribution through bounded provider weight multipliers for fixture-only, dry-run, unknown, scraped, duplicate, stale, failed-extraction, or missing-critical-dependency contexts.
- Confidence calibration can consume supplied provider reliability results, avoid only the missing-provider-context input penalty, still apply low-provider-reliability penalties, and cap final confidence when provider reliability caps are lower than computed confidence.
- Contradiction diagnostics can carry provider reliability caveats without converting mere provider unreliability into market contradiction or reintroducing C6-R5B source-disagreement noise.

Still open:

- Live provider activation remains pending.
- Empirical reliability backtesting remains pending.
- Golden scenario expansion remains pending.
- Live provider payload/schema smoke tests remain pending.
- No UI/live provider/payment/notification/commercial/Super Admin/affiliate/route-entitlement/2FA behavior changed.

## C6-R9 gap closeout — golden scenario expansion

- C6-R9 closes the acceptance-suite gap by adding deterministic golden scenarios and schema validators for market-realism reasoning.
- Scenario count: 33 deterministic fixtures, exceeding the minimum 28 required for C6-R9.
- Assets covered: all 14 launch/diagnostic assets are represented at least once.
- Engines covered end-to-end in fixture acceptance: asset direction, FX relative strength, macro surprise normalization, contradiction matrix, confidence calibration, price reaction, provider reliability, and source independence diagnostics.
- Market regimes covered include inflation shock, disinflation relief, growth scare, hawkish/dovish policy repricing, risk-off, volatility shock, credit stress, energy shock, crypto leverage unwind, liquidity stress, soft landing, mixed regime, and diagnostic DXY/VIX contexts.
- Remaining gaps: live provider activation, empirical reliability/backtesting, and production data calibration remain open and must not be represented as complete.
- No UI/live provider/payment/notification/commercial/Super Admin/affiliate/2FA behavior changed.

## C6-R9B real-engine execution cleanup

- C6-R9B fixes the C6-R9 runner gap where observed values could be derived from expected fixture outcomes.
- The golden scenario harness now builds deterministic reasoning evidence items, weighted snapshots, price candles, provider reliability inputs, contradiction context, and confidence inputs, then compares actual engine outputs against fixture expectations.
- Anti-self-fulfillment tests mutate expected direction, warnings, contradiction families, price candles, and provider metadata to prove the runner fails when actual engine outputs do not satisfy expectations.
- This remains deterministic fixture acceptance only; live provider activation, empirical backtesting, and production data calibration remain pending.
- No UI/live provider/payment/notification/commercial/Super Admin/affiliate/2FA behavior changed.

## C6-R9C acceptance purity cleanup

C6-R9C closes the remaining golden-scenario acceptance impurity: required warnings are no longer satisfied by fixture/category/source metadata, and expected contradiction families are no longer appended from scenario category/group/source fields. Acceptance now uses only actual outputs from the reasoning engines, while fixtures remain deterministic inputs plus expected criteria. Confidence checks use bounded deterministic ranges/tier/cap expectations rather than universal 0–100 ranges. This is still fixture-driven real-engine acceptance only; live provider activation, empirical reliability/backtesting, and production data calibration remain pending. No UI/live provider/payment/notification/commercial/Super Admin/affiliate/route-entitlement/2FA behavior changed.

## C6-R9D confidence acceptance tightening

C6-R9D closes the remaining broad-confidence acceptance gap in the golden-scenario suite. Default confidence expectations now use meaningful deterministic bands, allowed confidence tiers are enforced in pass/fail logic, and diagnostic/fixture-only cap checks remain active. Anti-regression tests prove scenarios fail when actual confidence is above or below the accepted range, when the actual tier is excluded, and when price-reaction ordering is lost. This remains fixture-driven real-engine acceptance only; live provider activation, empirical reliability/backtesting, and production data calibration remain pending. No UI/live provider/payment/notification/commercial/Super Admin/affiliate/route-entitlement/2FA behavior changed.

## C6-R9E expectation completeness closure

C6-R9E closes the remaining fixture-contract gap: declared expected reason codes, provider warnings, price-reaction status/warnings, severity expectations, and confidence expectations now bind scenario pass/fail against actual engine outputs. Severity now reuses the canonical contradiction severity vocabulary (`none`, `low`, `moderate`, `high`, `critical`). This remains deterministic fixture-driven real-engine acceptance only; live provider activation, empirical backtesting, and production-data calibration remain pending. No adaptive confidence or drift engine was introduced, and no UI/live provider/payment/notification/commercial/Super Admin/affiliate/route-entitlement/2FA behaviour changed.

## C6-R9F actual confidence and provider-input purity closure

C6-R9F closes the final acceptance-purity gap: supported golden-scenario confidence now comes from the confidence-calibration engine's final confidence/tier, provider expectations no longer manufacture provider-engine inputs, price confidence-effect semantics are binding, and provider expectation flag failures are named diagnostics. The suite remains deterministic fixture-driven real-engine acceptance only; live provider activation, empirical backtesting, and production-data calibration remain pending. No adaptive confidence/drift engine, UI, live provider, payment, notification, commercial, Super Admin, affiliate, route-entitlement, or 2FA behaviour changed.

## C6-R9G fixture input explicitness and canonical confidence tiers

C6-R9G closes the final deterministic integrity gaps: confidence-tier thresholds now have one canonical source, fixture confidence expectations have one visible inline anchor, economic fixture input is explicit rather than scenario-ID-derived, category labels no longer create semantic evidence, and price confidence effects are verified through controlled same-input comparisons. Golden scenarios remain fixture-driven real-engine acceptance only; live provider activation, empirical backtesting, and production-data calibration remain pending. No adaptive confidence/drift system, UI, live provider, payment, notification, commercial, Super Admin, affiliate, route-entitlement, or 2FA behaviour changed.
