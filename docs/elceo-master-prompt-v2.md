Doc 2 of 4
ELCEO Master Codex Prompt V2
Expanded build contract with mathematical logic, scoring systems, deterministic rules, and production-readiness requirements.
MASTER PROMPT FOR CODEX
You are building ELCEO, a premium production-grade AI-powered market cognition web platform. Build it as a serious, maintainable, extensible, event-driven system. This is not an MVP, not a toy, not a static dashboard, and not a template reskin. The output must be production-minded and suitable as the foundation for a full public launch after hardening, testing, and iterative validation. Do not behave as if one generated pass is enough to guarantee perfect production readiness. Build a real foundation that includes architecture, code quality, explainability, deterministic calculations, testable scoring systems, and clean extension points.
Reality instruction
Do not assume a single prompt can guarantee a flawless fully finished public-ready system with zero follow-up work. Build the strongest possible production-grade foundation, implementation scaffold, and first complete feature set, but structure the codebase for further refinement, QA, data validation, and integration hardening.
Where true provider credentials are unavailable, implement clean provider interfaces, adapters, mocks, environment-variable hooks, and explicit replacement points.
Prioritize correctness, maintainability, clarity, and testability over superficial breadth.
Non-negotiable product identity
ELCEO is a real-time market cognition and decision-support web platform for aspiring serious traders and experienced macro traders.
The product must support global users with UTC+0 as the default system frame.
Launch asset cluster: XAU/USD, Nasdaq 100, S&P 500, DE30, BTC/USD, EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, NZD/USD, USD/CAD.
The product must support both intraday and swing perspectives and label horizon explicitly in user-facing reads.
The product must use standard trading language such as bullish, bearish, divergence, continuation, reversal watch, absorption, risk-on, and risk-off.
The product is not financial advice. Strong disclaimers and terms acceptance are required.
Core build expectations
Monorepo architecture.
Next.js web application with strong mobile responsiveness.
TypeScript-first implementation with strict typing where practical.
Kafka event backbone.
Provider interfaces and adapters for market data, news, macro data, crawling, notifications, storage, and billing.
Role-based admin system with super admin, analyst admin, and support admin.
Free plan and premium plans with entitlement-driven access control.
Cinematic editorial landing page merged with the signature interaction language of the app shell.
Critical correction to the original prompt
The previous master prompt was strong on architecture, UX, and product behavior, but a production-grade system like ELCEO also requires explicit mathematical logic, deterministic ranking logic, scoring formulas, confidence decomposition, decay models, and unit-tested calculation engines. These are mandatory and must be built from the start.
Mathematical and deterministic logic requirements
Implement a dedicated domain-calculation layer. Do not bury numerical logic inside UI components or ad hoc helper functions. Put formulas, weights, scoring functions, and deterministic rules in well-named domain modules with tests. Build them so they can be tuned later through configuration or admin settings where appropriate.
1. Risk and position sizing engine
Implement account-risk-based position sizing.
Inputs must support account balance, risk percent, entry price, stop price, target price, asset type, contract specification, and account currency.
Support forex lot sizing, gold sizing, index CFD style sizing, and crypto sizing.
Implement pip, point, tick, and contract-value logic where applicable.
Implement account currency conversion for sizing when the quote currency differs from the account currency.
Return position size, risk amount, reward amount, risk-reward ratio, nominal exposure, and caution flags.
Build deterministic validation and edge-case handling for zero distance stop, negative values, invalid currency mapping, missing conversion rates, and unsupported instrument metadata.
Add event-risk modifiers and volatility-aware caution logic so the engine can warn users when size may be too aggressive around high-impact events.
2. H4 key-level zone scoring engine
Implement H4 zone detection using touch count, reaction magnitude, and recency weighting.
Count wick touches as valid touches.
Represent levels as zones, not only lines.
Compute a zone significance score using weighted components. At minimum include touch_count_score, reaction_magnitude_score, recency_score, and optional breakout_retest_score.
Store both raw component scores and final normalized significance score.
Design the formula so weights are configurable.
Build tests against synthetic candle sequences and known pattern fixtures.
3. Reaction magnitude and impulse logic
Implement deterministic reaction magnitude calculations after zone touches and major events.
Possible factors include move distance in ATR units, percentage move, candle-body expansion, follow-through persistence, and speed of directional move.
Impulse detection must not rely on a vague AI summary alone. Use deterministic thresholds plus contextual narrative linkage.
Store start time, impulse origin candle or bar window, magnitude score, and linked supporting event IDs.
4. Event surprise and macro impact scoring
For macro events, compute surprise score using actual versus forecast and optionally versus previous.
Normalize surprise per indicator type so CPI, NFP, rate decisions, and PMI are not treated with naive one-size-fits-all arithmetic.
Store both signed surprise and absolute surprise magnitude.
Map surprise to asset impact templates based on asset class and market regime.
Support future tuning by configuration rather than hardcoding fragile assumptions everywhere.
5. Asset-direction pressure model
Implement deterministic directional pressure components per asset.
For gold, include real-yield pressure, dollar pressure, safe-haven pressure, policy pressure, event shock pressure, and contradiction pressure.
For equity indices, include rates pressure, growth pressure, earnings or company-news pressure where relevant, liquidity pressure, and sentiment pressure.
For BTC/USD, include liquidity pressure, dollar pressure, risk sentiment pressure, and event shock pressure.
For USD pairs, include base/quote macro divergence pressure, central-bank policy pressure, yields pressure, and event surprise pressure.
Each component must produce a signed value and a confidence contribution.
The final asset directional state must be derived from transparent weighted aggregation, not black-box text generation alone.
6. Confidence decomposition model
Do not use a single opaque confidence number.
Build confidence from at least source_confidence, event_strength_confidence, model_agreement_confidence, price_confirmation_confidence, historical_pattern_confidence if available, and contradiction_penalty.
Expose both total confidence and component anatomy to the UI and admin layers.
Normalize output to a well-defined scale such as 0 to 100.
7. Contradiction and tension scoring
Implement a confidence-weighted hybrid contradiction model.
When price and narrative diverge, compute a tension score rather than just a binary mismatch flag.
Tension score should consider expected direction, realized price direction, magnitude of deviation, elapsed time since event, proximity to significant zones, and broader regime context.
Support system states such as aligned bullish, aligned bearish, divergence, absorption, continuation valid, and reversal watch.
Expose contradiction history over time so the UI can show rising or falling tension.
8. Time decay and freshness logic
Implement event decay logic so market-impact relevance fades over time according to event class.
Different event types must have different decay profiles. A CPI release should decay differently from a central-bank rate decision, a war escalation headline, or a company earnings surprise.
Build freshness timers for all surfaced intelligence objects.
Do not allow stale intelligence to continue looking equally current in the UI.
9. Ranking and prioritization logic
Build deterministic ranking for dashboard items, alert priority, asset cards, and evidence cards.
Ranking should consider user portfolio inclusion, recency, significance, confidence, contradiction, volatility, and event urgency.
Free-tier users and premium users should both see coherent ranking, with premium unlocking deeper depth rather than random quality variation.
10. Behavioral analytics calculations
Implement performance metrics such as win rate, expectancy, average gain, average loss, average risk-reward, drawdown behavior, profit factor where appropriate, and time-of-day performance segmentation.
Track setup-level performance, asset-level performance, session-level performance, and behavior-category performance.
Use deterministic analytics first, then layer explanatory AI on top.
Behavior coaching must be grounded in measurable patterns, not generic motivational language.
11. Alert triggering logic
Alerts must use deterministic trigger rules where possible.
Examples: bias change threshold crossed, contradiction score spike, price entering high-significance H4 zone, major macro event approaching, post-event state transition, or behavioral reminder schedule.
Implement de-duplication, cooldown logic, and user-level notification preferences.
12. Storage and retention mathematics
Because object storage must remain lightweight and efficient, build retention-aware storage logic from day one.
Do not persist every raw artifact forever.
Introduce retention windows, compressed snapshots, metadata-first storage, and optional on-demand regeneration where practical.
Store canonical structured event records in the database, not only bulky raw payloads.
Use lifecycle controls for screenshots, raw scrape captures, temporary files, and generated preview assets.
Required engineering structure for the calculation layer
Create a domain module or package for financial calculations and scoring logic.
Separate pure functions from infrastructure code.
Add unit tests for every important formula and rule family.
Use fixtures for sample instruments, sample macro events, and sample OHLC sequences.
Expose calculation outputs through typed schemas.
Document formulas and assumptions in code comments and developer docs.
UI and product requirements still in force
The landing page must feel like Apple meets a futuristic trading lab.
Use soft red as the main color family and green as the accent color.
Support dark mode and light mode.
Use fully custom-styled layered typography.
Every interaction should feel uniquely authored, but implement this through a maintainable motion system.
Add motion intensity controls and respect reduced-motion preferences.
Use moderate chart annotations with filters and floating side notes linked to candles.
Use zones for key levels.
Journal, admin, and governance requirements still in force
Build the deep journal with both minimum and advanced fields combined.
Use a data-scientist style for behavior analysis.
Include super admin, analyst admin, and support admin roles.
Provide admin tools to inspect source health, AI outputs, overrides, audit trails, supported assets, landing page content, and explanation traceability.
Implementation approach for Codex
Build in phased sequence inside one master plan, not as one chaotic dump.
Start with repository structure, shared types, schemas, design system, auth, roles, billing scaffolding, env handling, Kafka foundation, and the calculation domain modules.
Then build the landing page and product shell.
Then build onboarding, portfolio selection, dashboard shell, chart shell, and entitlements.
Then build ingestion, normalization, directional pressure objects, contradiction scoring, zone detection, and annotations.
Then build the journal, analytics, alerts, editorial, and admin layers.
Then harden with tests, performance, accessibility, storage retention logic, and observability.
Final instruction to Codex
Build ELCEO as a production-minded market cognition platform with explicit mathematical logic, deterministic scoring, testable calculations, explainable reasoning, premium visual identity, and strong engineering discipline. Do not rely on AI text generation alone for numerical or ranking behavior. Use deterministic domain logic for calculations and state scoring, then layer AI explanations on top. The result should be a serious foundation for a full-production public launch after final QA, integration hardening, and iterative refinement.
