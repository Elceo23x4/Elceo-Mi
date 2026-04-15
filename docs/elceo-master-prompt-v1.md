Doc 1 of 4

ELCEO Master Codex Build Prompt
Detailed implementation instruction file for Codex. Use this as the primary build contract for the platform.
Build scope: full production-grade web platform, launch asset cluster, engineering-deep execution, no MVP shortcuts.
—
MASTER PROMPT FOR CODEX
You are building ELCEO, a premium production-grade AI-powered market cognition web platform. This is not an MVP, not a prototype, not a generic trading dashboard, and not a template-based SaaS product. Build it as a real system with clear architecture, maintainable code, strict typing, strong validation, production safeguards, explainability, admin governance, and a highly distinctive user experience. The result must feel like a luxury intelligence terminal for aspiring serious traders and experienced macro traders. It must work globally, default to UTC+0, and launch as a web app with strong mobile responsiveness. The platform is a market intelligence and decision-support system, not a financial-advice engine.
Non-negotiable platform identity
ELCEO is a real-time market cognition system, not a signal spam platform.
The launch user is a hybrid of aspiring serious traders and experienced macro traders.
The system must be event-native and continuously updating.
The output style must use known trading language such as bullish, bearish, continuation, reversal watch, divergence, absorption, risk-on, and risk-off.
Explanations must be layered: brief top-layer explanation first, with expandable deeper reasoning.
The system must support both intraday and swing perspectives, and every directional read must explicitly label its horizon.
The system must be a decision-support product with strong disclaimers, terms acceptance at onboarding, and clear non-financial-advice framing.
Primary launch asset coverage
Gold: XAU/USD only at launch.
Indices: Nasdaq 100, S&P 500, DE30 / DAX.
Crypto: BTC/USD.
Forex pairs: EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, NZD/USD, USD/CAD.
The product architecture must anticipate later expansion into more equities and additional asset classes, but the first public build must deeply support the launch cluster above.
Architecture and repository expectations
Build the codebase as a monorepo with clear modular boundaries. Use TypeScript across the application wherever practical. Use schema validation, strong typing, linting, structured logging, testing, accessibility baselines, performance budgets, and code-level documentation. Use provider interfaces and adapters so integrations can be swapped or mocked. Build with real integrations where credentials are available and stable mocked adapters where credentials are missing.
Frontend: Next.js with App Router and strong responsive behavior.
UI system: componentized design system with color tokens, typography tokens, spacing scale, motion tokens, chart annotation components, and signature interaction primitives.
Backend: modular service architecture inside the monorepo with clearly separated application services, ingestion workers, reasoning pipelines, notification logic, and admin tooling.
Database: production-ready relational model for users, subscriptions, portfolios, journals, event records, annotations, biases, and audit trails.
Event bus: Kafka. Use Kafka as the system backbone for event-native processing.
Object storage: lean and controlled. Store only what is necessary. Use lifecycle rules and retention-aware design to avoid unbounded growth.
Do not generate throwaway scaffolding or placeholder-only code. Generate coherent foundational implementations.
Required product modules
Public landing page with cinematic editorial presentation and premium motion design.
Authentication using Google sign-in and email/password.
Onboarding with terms acceptance, strong disclaimers, and manual asset selection.
Free plan and premium plan logic with controlled tracked-asset limits for free users and full access unlocks for premium users.
User dashboard with real-time chart, market narrative panel, directional cognition panel, risk calculator, asset state cards, and chart-linked intelligence notes.
Portfolio manager with controlled asset selection and visually digestible portfolio states.
Trade journal with deep structured fields and image upload support for before/after screenshots.
Performance analytics and behavior analysis module using a data-scientist style tone.
Alerts system with in-app alerts, browser push, and email alerts. Design WhatsApp support as a future-ready extension point.
Editorial and blog system combining admin-written content and automated market features.
Admin control center with super admin, analyst admin, and support admin roles.
Launch UX and design language
The product must merge two visual philosophies into one unified design language: first, a cinematic magazine-inspired landing experience with editorial rhythm, oversized type, transparent floating surfaces, motion glow, layered imagery, and futuristic polish; second, a signature interaction language where motion and visual state reflect actual system intelligence. The result should feel like Apple meets a futuristic trading lab, not a crypto template, not a generic fintech dashboard, and not a standard dark trading UI.
Support both dark mode and light mode from the beginning.
Primary color family: soft red. Accent color: green.
Typography direction: fully custom-styled layered typography. Use a dramatic display language with serious interface readability.
The site must use a custom cursor represented as a green and red trading candle pair, with one candle longer than the other.
Every interaction should feel uniquely authored. However, implement this through a structured motion system with variants and state-driven behavior so the code remains maintainable.
Add motion intensity controls in user settings and respect reduced-motion preferences.
Use moderate default chart annotations with filters. Show floating side notes linked to candles rather than cluttered direct text overlays.
For chart levels, use zones instead of simple lines, with significance scoring and optional center emphasis.
Add additional visual digestion devices where useful, such as evidence cards, structured confidence anatomy, regime badges, contradiction meters, event cluster cards, and timeline storytelling modules.
Signature interaction language requirements
Build a reusable interaction language where animation is informative, not decorative. Motion must reflect state. Confidence changes, volatility changes, contradiction changes, and direction changes should be expressible through motion, glow, pacing, distortion, blur, pulse, clustering, and transition behavior.
Confidence increase can intensify glow, stability, and directional coherence.
Contradiction can create tension, visual distortion, or controlled flicker.
Reversal watch can visually imply a state transition rather than a hard instant flip.
Volatility can affect movement speed, pulse rate, and spacing rhythm in selected components.
Use different motion families across different interaction classes so the experience remains richly authored.
Do not repeat the exact same interaction pattern everywhere, but do maintain internal logic and visual consistency.
Market reasoning and cognition behavior
The market engine must think like a confidence-weighted hybrid system. When price and narrative disagree, do not freeze and do not oversimplify. Maintain a confidence-weighted hybrid stance that can express both the expected directional logic and the reality of current price behavior.
Every asset state must be capable of expressing aligned bullish, aligned bearish, neutral, divergence, absorption, continuation valid, and reversal watch.
Every directional read must carry a confidence score and also a decomposition of why that confidence exists.
Use layered explanation: one compact user-facing interpretation followed by expandable deeper reasoning.
Build intraday bias, swing bias, and where useful structural context, and label the horizon explicitly.
Use standard trading terminology rather than inventing obscure branded jargon.
Chart intelligence requirements
The chart is a first-class cognition surface. It must not be a passive embedded visual. It must carry explanatory state, level intelligence, annotation filters, and evidence-linked overlays.
Use zone-based H4 key level detection.
H4 key-level significance must use touch count, reaction magnitude, and recency weighting.
Wick touches must be counted.
Support event-linked floating side notes pinned contextually to chart areas or candles.
Allow filtering of annotation classes, such as macro events, policy events, key levels, contradiction markers, and impulse origins.
The chart must support real-time updates and must remain performant on desktop and mobile web.
Risk calculator requirements
Include generic position sizing.
Include forex lot sizing.
Include gold sizing logic.
Include index CFD style sizing where applicable.
Include crypto sizing.
Include account currency conversion support.
Include event risk warnings.
Include volatility-aware caution messaging.
Include suggested maximum risk warnings during major scheduled events where relevant.
Portfolio and onboarding requirements
Users must manually select the assets they want to follow.
The number of followed assets must be controlled by plan entitlements.
The onboarding flow must explain clearly that ELCEO is a market intelligence and decision-support platform, not financial advice.
The onboarding flow must include terms acceptance and disclaimers before full use.
The first setup experience should feel premium, guided, and globally coherent, with UTC+0 as the default platform frame.
Subscription requirements
Implement a free plan that lets users understand how the platform works without unlocking full power.
Implement premium plan logic that unlocks full access.
Plan entitlements should control tracked asset count, intelligence depth, chart overlays, journal analytics, behavioral coaching, and any other premium-only modules you add.
Design the subscription system cleanly so pricing, entitlements, and feature flags can evolve later without painful rewrites.
Trade journal and behavior analysis requirements
Build a serious trading journal rather than a shallow note form. Combine the minimum and deeper journal suggestions into one coherent structured workflow.
Capture asset, direction, entry, stop, take profit, result, setup type, reason, and emotion.
Capture session traded, whether major news was near, whether the user followed ELCEO bias, confidence before trade, confidence after trade, mistake category, and lesson category.
Support screenshot uploads for before-trade and after-trade visuals.
Build performance outputs for best month, worst month, best traded assets, worst traded assets, best gains, highest losses, and most effective trading time windows.
Build behavior analysis in a data-scientist style tone.
The system must identify patterns, suggest practical improvement plans, and assign behavior challenges for the next 5 or 10 trades where useful.
Alerts and notifications requirements
Support in-app alerts, browser push, and email alerts at launch.
Prepare the architecture for future WhatsApp support without implementing it fully now unless practical.
Alert classes must include bias changes, contradiction spikes, key level interaction, major macro event incoming, post-event regime shift, and journal coaching reminders.
Notification preferences must be configurable per user and per alert class.
Editorial and content requirements
Implement a mixed editorial plus automated market feature system.
Content categories must include macro briefings, asset watch, policy shifts, weekend intelligence, trader psychology, and ELCEO research notes.
Admins must be able to publish curated content and manage automated feature visibility.
The landing page and editorial system must maintain the same cinematic premium visual language as the product shell.
Admin and governance requirements
Implement role-based access for super admin, analyst admin, and support admin.
Admin capabilities must include user and plan management, source health monitoring, AI output review, asset bias override, editorial pinning, source disabling, explanation inspection, error visibility, freshness dashboards, landing/blog management, hero-content control, and supported-asset management.
The admin panel must make it possible to answer the question: why did ELCEO say this?
Maintain audit trails for key admin actions and key reasoning outputs.
Engineering quality standards
Use TypeScript broadly and consistently.
Use strict typing where practical.
Use runtime schema validation for important payloads and API boundaries.
Implement linting, formatting, test coverage, structured logging, and error boundaries.
Respect accessibility baselines while still delivering a visually differentiated interface.
Treat performance as a design requirement, especially because the site is motion-heavy.
Document key modules and system decisions inside the codebase.
Integration architecture
Build integration adapters rather than hardwiring provider-specific assumptions deep into application logic. Use provider interfaces, fallback paths, mockable providers, and clear environment-variable management.
Market data providers must be abstracted behind a market data interface.
News and event providers must be abstracted behind source adapters.
Scraping/crawling providers must be abstracted cleanly.
Notification providers must be swappable.
Authentication, billing, storage, and analytics integrations must be modular and replaceable.
Execution phases for Codex
Do not attempt a chaotic one-shot dump. Build in controlled phases inside one coherent repository while keeping the final destination in view from the beginning.
Phase 1: Foundation and architecture
Create the monorepo structure.
Set up Next.js application shell, shared packages, backend modules, provider interfaces, env handling, and base design system.
Set up authentication, database base schema, role scaffolding, feature flag scaffolding, and billing scaffolding.
Set up Kafka integration foundation and the internal event model.
Set up logging, error monitoring hooks, testing scaffolding, and lint/format pipelines.
Phase 2: Public product shell and design system
Build the landing page, navigation shell, theme system, dark/light mode, layered typography system, motion tokens, custom cursor, and initial premium editorial structure.
Create signature interaction primitives so later product modules reuse the same intelligence-driven visual language.
Ensure mobile-responsive behavior is excellent from the start.
Phase 3: Core user workflows
Build onboarding, disclaimers, terms acceptance, plan entitlements, manual asset selection, and user dashboard shell.
Implement the portfolio manager, chart container, watch states, and initial alert preference surfaces.
Phase 4: Market cognition engine foundations
Implement provider adapters, ingestion jobs, event normalization, asset mapping flow, confidence-weighted directional objects, and contradiction-aware state containers.
Create clear interfaces for reasoning outputs and auditability.
Phase 5: Chart intelligence and decision-support layer
Implement H4 zone detection, annotation filters, floating side notes, event-linked overlays, and risk calculator.
Build moderate default annotation density and strong filtering tools.
Phase 6: Journal, analytics, and coaching
Implement the deep journal, performance analysis, user behavior detection, and data-scientist style coaching outputs.
Support evidence-rich views, screenshot handling, and habit pattern surfacing.
Phase 7: Alerts, editorial, and admin governance
Implement in-app, browser push, and email alerting.
Build the mixed editorial system and automated feature surfaces.
Build the admin control center with super admin, analyst admin, and support admin roles and audit visibility.
Phase 8: Hardening and production readiness
Add test coverage, accessibility checks, performance optimization, state cleanup, data retention logic, storage lifecycle controls, observability coverage, and final UX refinement.
Ensure the platform is production-ready before public launch.
Detailed build instructions for Codex
When generating the implementation, do not hide complexity through vague abstractions. Make the system understandable. Name things clearly. Separate concerns. Build enough concrete implementation to make the platform real, not just theoretically sound. Avoid toy placeholders. Where integrations are not available at generation time, create clean mock adapters with explicit TODO boundaries and environment-driven replacement points.
Do not build a generic trading dashboard template and rename it.
Do not collapse the product into a simple signal engine.
Do not ignore admin governance or explainability.
Do not sacrifice maintainability for animation flair.
Do not make the landing page feel disconnected from the product shell; both must express one unified brand language.
Do not over-clutter the chart by default; use moderate annotation density with user filters.
Do not use imprecise financial-advice language. Keep the decision-support framing intact.
Preferred implementation choices
Monorepo structure with shared packages for types, schemas, UI primitives, motion primitives, provider contracts, and domain logic.
Design tokens for colors, spacing, radii, elevation, and motion.
A chart module that is integrated into the ELCEO cognition flow rather than isolated.
An event model that can support ingestion, normalization, reasoning, reconciliation, annotation, and admin audit.
A clean entitlement system that can support free and premium plans without future rewrites.
A unified user-facing explanation system where every explanation has a short version and an expandable deep version.
Exact output expectations
Generate a codebase that a serious engineering team could continue building on without embarrassment. The structure should be clear, the product intent should be unmistakable, the UI should already express the ELCEO identity, and the engineering choices should reflect a long-term platform mindset. The output should not be a mockup-only artifact. It should be a real foundation for a full-production launch.
Final instruction to Codex
Build ELCEO with depth-first dominance around Gold, Nasdaq 100, S&P 500, DE30, BTC/USD, and the selected USD pairs. Treat the landing page and the application shell as one continuous brand system. Treat the market engine as a cognition system rather than a headline summarizer. Treat the chart as an intelligence surface rather than a passive panel. Treat the journal as a behavioral laboratory rather than a note form. Treat admin as a first-class governance layer. Build with engineering seriousness, aesthetic ambition, and production discipline throughout.
