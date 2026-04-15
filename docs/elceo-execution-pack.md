Doc 4 of 4

ELCEO Codex Execution Pack
Companion implementation pack for the master Codex prompt: repository layout, providers, environment variables, Kafka design, service contracts, and deterministic logic scaffolding.
Purpose of this file
This execution pack is meant to reduce ambiguity when Codex builds ELCEO. It defines exact naming conventions, module boundaries, provider adapters, key environment variables, event topics, domain objects, and the first deterministic logic surface. Use it together with the ELCEO Master Codex Prompt V2.
1. Recommended monorepo structure
apps/web -> Next.js web application, public site, app shell, dashboard, admin surfaces.
apps/docs -> optional internal docs or Storybook-style documentation site.
packages/ui -> shared UI components, tokens, typography primitives, chart annotation components, evidence cards, badges, overlays.
packages/motion -> signature interaction primitives, animation variants, motion tokens, reduced-motion handling.
packages/domain -> pure business logic: scoring, ranking, risk calculations, key-level logic, contradiction logic, decay logic.
packages/types -> shared TypeScript types and enums.
packages/schemas -> Zod schemas for API payloads, event objects, DTOs, provider payload normalization.
packages/config -> runtime config, feature flags, entitlement maps, scoring defaults, asset metadata.
packages/providers -> provider interfaces and adapters.
services/ingestion -> worker service for macro/news/crawl/market data ingestion.
services/reasoning -> event interpretation pipeline, confidence weighting, contradiction building, narrative generation orchestration.
services/chart-intelligence -> H4 zone detection, impulse detection, annotation generation support.
services/notifications -> in-app, email, and push notification processing.
services/analytics -> journal analytics, behavior analysis inputs, aggregation jobs.
services/admin-jobs -> audit, reindex, retention, data hygiene, backfills.
2. Launch provider choices and adapter names
Market data: FinnhubAdapter, AlphaVantageAdapter, MarketDataCompositeAdapter
Macro calendar: TradingEconomicsAdapter
News: NewsApiAdapter, MarketauxAdapter
Geopolitics: GdeltAdapter
Crawling and extraction: FirecrawlAdapter, PlaywrightFallbackAdapter
Auth: GoogleAuthAdapter, EmailPasswordAuthAdapter
Billing: StripeBillingAdapter
Storage: CloudflareR2StorageAdapter
Database/auth platform if chosen: SupabasePlatformAdapter
Notifications: EmailNotificationAdapter, BrowserPushAdapter, InAppNotificationAdapter
Analytics: PostHogAnalyticsAdapter
Error monitoring: SentryMonitoringAdapter
3. Core environment variables
APP_ENV
APP_BASE_URL
NEXT_PUBLIC_APP_BASE_URL
DATABASE_URL
REDIS_URL
KAFKA_BROKERS
KAFKA_CLIENT_ID
KAFKA_GROUP_ID_INGESTION
KAFKA_GROUP_ID_REASONING
KAFKA_GROUP_ID_NOTIFICATIONS
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
R2_PUBLIC_BASE_URL
FIRECRAWL_API_KEY
NEWSAPI_API_KEY
MARKETAUX_API_KEY
FINNHUB_API_KEY
ALPHAVANTAGE_API_KEY
TRADING_ECONOMICS_API_KEY
POSTHOG_API_KEY
SENTRY_DSN
EMAIL_FROM_ADDRESS
RESEND_API_KEY
WEB_PUSH_PUBLIC_KEY
WEB_PUSH_PRIVATE_KEY
OPENROUTER_API_KEY
4. Kafka topic plan
elceo.source.market.raw
elceo.source.macro.raw
elceo.source.news.raw
elceo.source.geopolitics.raw
elceo.source.crawl.raw
elceo.event.normalized
elceo.event.asset-mapped
elceo.event.reasoned
elceo.asset.state-updated
elceo.asset.annotation-requested
elceo.asset.annotation-created
elceo.user.alert-triggered
elceo.user.alert-dispatched
elceo.journal.created
elceo.analytics.recompute-requested
elceo.admin.audit-log
5. Canonical event object
event_id
event_type
source_type
source_provider
source_url
occurred_at
ingested_at
headline
summary
region
country
asset_candidates
priority
raw_payload_ref
normalized_payload
freshness_expires_at
dedupe_key
trace_id
6. Canonical asset cognition object
asset_code
time_horizon
directional_bias
confidence_total
confidence_anatomy
directional_pressure_components
contradiction_score
contradiction_state
supporting_event_ids
invalidating_event_ids
current_regime
freshness_expires_at
short_explanation
deep_explanation
updated_at
7. First deterministic config surfaces
Create versioned config files, not hard-coded scattered constants. Suggested config files:
config/assets.ts -> launch assets, metadata, contract hints, display labels, sessions, category mappings.
config/plans.ts -> free and premium entitlement rules, tracked asset limits, feature flags.
config/scoring.ts -> weights for confidence, contradiction, key-level significance, ranking.
config/decay.ts -> event decay windows by event class.
config/notifications.ts -> cooldown and dedupe policies.
config/ui.ts -> annotation defaults, visual density, motion intensity defaults.
8. First deterministic formulas Codex should implement
Risk amount = account_balance * risk_percent.
Risk-reward ratio = reward_amount / risk_amount with divide-by-zero protection.
Position sizing must derive from instrument metadata and stop distance with support for forex, gold, indices, and crypto.
Zone significance score should aggregate touch count, reaction magnitude, recency, and optional breakout-retest bonus using normalized weighted values.
Contradiction score should combine expected direction, realized price direction, deviation magnitude, elapsed time, and nearby zone significance.
Confidence total should aggregate source confidence, event strength, model agreement, price confirmation, historical pattern confidence when available, minus contradiction penalty.
Event freshness should use event-class-specific decay rather than one flat timer.
Ranking score should include portfolio relevance, recency, significance, confidence, urgency, and contradiction intensity where appropriate.
9. Service contracts to implement first
MarketDataProvider.getLatestQuote(assetCode)
MarketDataProvider.getCandles(assetCode, timeframe, from, to)
MacroProvider.getCalendar(start, end)
NewsProvider.searchNews(query, from, to)
GeopoliticsProvider.searchEvents(query, from, to)
CrawlerProvider.extract(url)
ReasoningService.reasonEvent(normalizedEvent)
ReconciliationService.reconcile(assetCognition, latestPriceState)
ChartIntelligenceService.computeH4Zones(assetCode)
ChartIntelligenceService.buildAnnotations(assetCode)
RiskService.calculatePosition(input)
AnalyticsService.recomputeUserPerformance(userId)
NotificationService.dispatch(alertObject)
10. First database tables to define
users
user_roles
subscriptions
plan_entitlements
user_asset_watchlists
assets
market_quotes
market_candles
normalized_events
event_asset_links
asset_cognition_states
asset_annotations
risk_calculation_logs
journal_entries
journal_entry_media
user_performance_snapshots
behavior_insights
notifications
notification_preferences
admin_audit_logs
source_health_logs
11. First internal pages and routes
/
/pricing
/login
/signup
/onboarding
/dashboard
/dashboard/[asset]
/portfolio
/journal
/analytics
/research
/settings
/admin
/admin/users
/admin/feeds
/admin/audit
/admin/content
12. Build order Codex should follow
Create monorepo, shared packages, env validation, base configs, and CI scaffolding.
Implement design system, theme system, motion system, and the cinematic landing shell.
Implement auth, roles, plans, onboarding, and disclaimer/terms flows.
Implement assets, watchlists, dashboard shell, and chart shell.
Implement provider interfaces and stub adapters.
Implement Kafka event model and ingestion service foundation.
Implement domain calculation package with tests before wiring many UI behaviors to it.
Implement reasoning, reconciliation, and chart-intelligence flows.
Implement journal, analytics, and coaching.
Implement notifications, editorial, and admin governance.
Harden with observability, accessibility, performance, and retention logic.
13. Codex anti-drift instructions
Do not flatten ELCEO into a generic buy/sell dashboard.
Do not skip the mathematical layer and replace it with prose.
Do not build one giant services folder with unclear responsibilities.
Do not treat the landing page as separate from the product design language.
Do not over-clutter the chart by default.
Do not omit admin explainability and auditability.
Do not hard-code provider assumptions everywhere.
14. What to hand back after initial Codex run
A runnable monorepo.
A clear README with setup steps.
A sample .env.example.
Migration files or schema definition.
Shared type and schema packages.
A working public landing page and authenticated app shell.
A first functioning dashboard path with mocked or partial real data.
A tested domain calculation package.
A provider adapter layer with explicit TODO boundaries.
Final execution instruction
Codex should use this execution pack together with the master prompt to reduce ambiguity. Prefer explicit naming, modular boundaries, deterministic logic, testable formulas, and production-minded structure from the start.
