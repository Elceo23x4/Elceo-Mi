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
