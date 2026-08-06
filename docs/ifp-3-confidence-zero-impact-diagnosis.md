# IFP-3 Confidence-Zero Impact Diagnosis

## Repository evidence and method

The unchanged 33-scenario golden suite was executed through `npm run -w services/reasoning test`. The sealed repository baseline reports 25 final-confidence-zero scenarios. The existing audit retains exact emitted calibration traces for five representative zero cases; it does not retain per-scenario confidence anatomy for the other twenty. This diagnosis distinguishes proven causes from unobservable causes rather than inventing attribution.

| Scenario ID | Context | Emitted components | Penalties that exhausted confidence | Proven? | IFP-3 permitted state |
|---|---|---|---|---|---|
| `c6r9_us_cpi_upside_nasdaq_pressure` | US CPI / Nasdaq | base 20; quality 0; weight 0; freshness 20; coverage 0 | missing price 29, activation 13, reliability 8, coverage 8, weight 8; pre-clamp -46 | mixed cause proven | wait unless trusted direct evidence independently supports review |
| `c6r9_sp500_bullish_credit_stress_tension` | S&P 500 / credit stress | base 54.98; quality 21; weight 11.2; freshness 20; coverage 2.78 | contradiction 7, missing price 14, activation 13, reliability 8, coverage 8, weight 8; pre-clamp -3.02 | mixed cause proven | review only if direct material contradiction is trusted; otherwise wait |
| `c6r9_fixture_only_provider_high_extraction_capped` | fixture-only FX | base 60.50; quality 24.6; weight 13.12; freshness 20; coverage 2.78 | contradiction 7, missing price 14, FX context 30, metadata 9, activation 13, reliability 8, coverage 8; pre-clamp -28.50 | mixed cause proven | wait; fixture evidence cannot independently support a hard state |
| `c6r9_dxy_diagnostic_limited_basket_context` | DXY diagnostic | base 62.34; quality 25.8; weight 13.76; freshness 20; coverage 2.78 | missing price 14, FX context 12, diagnostic 8, activation 13, reliability 8, coverage 8, weight 8; pre-clamp -0.66 | mixed cause proven | wait unless separate trusted direct evidence closes requirements |
| `c6r9_macro_bullish_reversed_price_reaction` | macro / reversal | base 68.83; quality 25.8; weight 17.48; freshness 20; coverage 5.56 | contradiction 12, missing price 14, FX context 30, metadata 9, activation 13, reliability 8, coverage 8; pre-clamp -25.17 | mixed cause proven | review/escalation only when trusted direct evidence independently meets policy |
| Remaining 20 zero scenarios | deterministic fixtures | no durable per-scenario anatomy in repository artifacts | exact combination cannot be established | unresolved | determined only from persisted direct evidence |

## Counts and conclusions

- Total zero-confidence scenarios: **25 of 33**.
- Proven mixed-cause scenarios: **5**; none supports single-cause attribution.
- Exact-cause-unobservable scenarios: **20**.
- Proven recurring contributors in retained traces are missing/adverse price confirmation, provider activation/readiness limits, low coverage or usable weight, fixture/diagnostic limits, and contradiction or one-sided-FX penalties. Freshness contributed positively in these traces and is not proven as the zero cause.

The protocol never branches on confidence zero. Canonical persisted broken invalidation is required for `invalidate_thesis`; trusted direct critical or compound contradiction is required for `escalate_review`. Non-final, insufficient, fixture, unverified, or pending evidence waits; trusted material contradiction reviews; only final resolved evidence archives.

These fixtures are regression evidence, not calibration acceptance or production-correctness evidence. No confidence formula, band, floor, penalty, golden input, or golden expected output was changed. Retaining all 25 anatomy records requires a future diagnostic-only change before exact cause counts can be established without speculation.
