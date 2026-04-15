
Doc 3 of 4
ELCEO Provider Integration Codex Pack
Provider-specific build pack for Codex: chosen services, role mapping, fallback hierarchy, ingestion rules, normalization contracts, and accuracy-first orchestration.
Important security instruction
Do not hardcode API keys in the codebase. Use environment variables only. Even if training is disabled, exposed keys should still be treated as compromised if pasted into shared systems. Regenerate and rotate the currently exposed keys before real build and deployment.
1. Accuracy-first operating mode
Optimize for accuracy and reasoning quality over raw speed.
Use event-driven plus scheduled ingestion, but do not publish shallow conclusions instantly from one source.
Require cross-source confirmation or confidence penalties where sources disagree.
Prefer slightly slower, deeper reasoning updates over noisy rapid-fire outputs.
Separate raw ingestion speed from user-facing cognition state updates.
2. Confirmed provider stack
Marketaux API -> finance-focused news and entity-aware article retrieval.
Finnhub API -> market data support, macro/economic calendar support, forex/crypto/market endpoints where useful.
Alpha Vantage API -> additional market data and indicator backup source.
NewsAPI -> broad news coverage and article retrieval.
Firecrawl API -> structured crawling, extraction, and official-page capture.
Financial Modeling Prep API -> supplemental structured market and calendar data, especially as a fallback.
GDELT -> geopolitical and global event detection.
Investing.com via Firecrawl -> economic calendar enrichment and fallback scraping source.
IMF data -> long-term macro and regime background.
World Bank data -> structural macro context and country-level economic background.
OECD data -> institutional macro series and contextual indicators where available.
3. Provider role allocation
A. Market price and asset feed layer
Primary: Finnhub for quotes, selected real-time or near-real-time market data, and broad market context.
Secondary: Alpha Vantage as a backup and validation source for selected time series and indicators.
Tertiary: Financial Modeling Prep as an additional structured fallback where relevant.
Build a MarketDataCompositeAdapter that can reconcile provider differences and select the freshest trusted response.
B. Macro calendar and event layer
Primary: Finnhub economic calendar if coverage is sufficient for launch assets and launch markets.
Secondary: Investing.com economic calendar extracted through Firecrawl for enrichment and fallback.
Tertiary: Financial Modeling Prep economic calendar where useful.
IMF, World Bank, and OECD are not the main real-time event feeds. Use them for background context, regime analysis, and historical learning.
C. News and article layer
Primary finance-aware source: Marketaux.
Secondary broad article source: NewsAPI.
Use a NewsCompositeAdapter to merge, deduplicate, score, and tag articles by asset relevance and source quality.
D. Geopolitical and global event layer
Primary: GDELT.
Use GDELT for detection and clustering, not as the final reasoning layer by itself.
When GDELT detects significant geopolitical shifts, corroborate with article retrieval and official-source scraping where useful.
E. Official documents, policy releases, speeches, and structured extraction
Primary: Firecrawl.
Fallback: Playwright-based custom extraction module for pages Firecrawl cannot reliably handle.
Use this layer for central bank pages, government pages, official statements, policy releases, and economic calendar page capture when needed.
F. Structural macro background layer
IMF, World Bank, and OECD data should feed regime and context models rather than reactive alert logic.
Use them to enrich country profiles, long-term macro state, and historically informed interpretation.
4. Required provider adapters
FinnhubMarketDataAdapter
AlphaVantageMarketDataAdapter
FmpMarketDataAdapter
MarketDataCompositeAdapter
FinnhubMacroCalendarAdapter
InvestingCalendarScrapeAdapter
FmpMacroCalendarAdapter
MacroCalendarCompositeAdapter
MarketauxNewsAdapter
NewsApiNewsAdapter
NewsCompositeAdapter
GdeltEventAdapter
FirecrawlExtractionAdapter
PlaywrightExtractionFallbackAdapter
ImfMacroContextAdapter
WorldBankMacroContextAdapter
OecdMacroContextAdapter
MacroContextCompositeAdapter
5. Environment variable plan
FINNHUB_API_KEY
ALPHAVANTAGE_API_KEY
FMP_API_KEY
MARKETAUX_API_KEY
NEWSAPI_API_KEY
FIRECRAWL_API_KEY
OPENROUTER_API_KEY
ENABLE_FINNHUB=true
ENABLE_ALPHAVANTAGE=true
ENABLE_FMP=true
ENABLE_MARKETAUX=true
ENABLE_NEWSAPI=true
ENABLE_FIRECRAWL=true
ENABLE_GDELT=true
ENABLE_INVESTING_SCRAPE=true
ENABLE_IMF_CONTEXT=true
ENABLE_WORLDBANK_CONTEXT=true
ENABLE_OECD_CONTEXT=true
6. Launch asset mapping rules
XAU/USD
Highest-weight sources: macro calendar, Fed-related events, dollar-sensitive coverage, geopolitical shock detection, safe-haven narratives, and rates-sensitive interpretation.
Context sources such as IMF and World Bank matter more structurally than intraday.
Classify inflation, rates, war, sanctions, banking stress, and policy credibility themes carefully.
Nasdaq 100 and S&P 500
Highest-weight sources: macro calendar, Fed language, inflation data, labor data, growth data, liquidity narratives, and broad risk sentiment.
Use Marketaux and NewsAPI for market-moving article clusters. Use macro surprise interpretation heavily.
DE30
Highest-weight sources: euro area macro events, ECB context, Germany and Europe economic releases, global risk sentiment, and US spillover context.
BTC/USD
Highest-weight sources: risk sentiment shifts, liquidity regime, major macro events affecting dollar and yields, and broad market shock events.
Use article quality penalties aggressively to avoid noisy crypto narratives dominating state.
USD pairs
Highest-weight sources: macro divergence between pair economies, central-bank expectations, inflation and labor releases, risk regime, and policy language.
EUR/USD uses euro area plus US overlap. GBP/USD uses UK plus US. USD/JPY requires strong BOJ and Japan context. USD/CHF includes safe-haven sensitivity. AUD/USD and NZD/USD require risk-growth framing. USD/CAD should later incorporate oil-awareness extensions.
7. Ingestion cadence for accuracy-first mode
Do not use one universal refresh rate. Use cadence by data class. User-facing cognition states should update after validation, not merely after raw fetch.
Live or near-live market quotes: frequent polling or streaming where supported, stored separately from cognition-state publication.
Economic calendar pull: every 5 to 10 minutes outside event windows, with tighter refresh near major release windows where practical.
News article retrieval: every 10 to 15 minutes for launch assets and broad market tags.
GDELT event scan: every 10 to 15 minutes, with clustering and significance filtering.
Official pages and policy pages via Firecrawl: scheduled around likely release times plus selective event-triggered pulls.
IMF, World Bank, and OECD context pulls: slow cadence such as daily or weekly depending on dataset type.
User-facing directional cognition updates: event-driven plus periodic recalculation, but gated by confidence and validation.
8. Fallback hierarchy
Market data fallback order
Finnhub
Alpha Vantage
Financial Modeling Prep
Macro calendar fallback order
Finnhub
Investing.com via Firecrawl
Financial Modeling Prep
News fallback order
Marketaux
NewsAPI
Firecrawl on targeted source pages if confirmation is needed
Document and speech extraction fallback order
Firecrawl
Playwright fallback extraction
9. Data normalization rules
All provider payloads must be normalized into internal schemas before use.
Do not let UI or reasoning services consume raw provider formats directly.
Normalize timestamps to UTC.
Normalize asset codes to a single ELCEO internal naming convention.
Normalize currencies, regions, countries, event categories, and impact levels.
For articles, store canonical fields such as article_id, source_name, url, published_at, headline, summary, mentioned_assets, region_tags, event_tags, credibility_score, and duplicate_cluster_id.
For macro events, store canonical fields such as event_id, indicator_name, country, release_time_utc, actual, forecast, previous, impact_level, source_provider, surprise_score, and freshness_expires_at.
For crawled documents, store extracted text, source URL, crawl timestamp, document class, and structured metadata. Keep raw artifacts lightweight and retention-controlled.
10. Deduplication and cross-source reconciliation
Implement content-based dedupe for near-identical articles across Marketaux and NewsAPI.
Implement source-priority-aware reconciliation when the same event appears from multiple feeds.
Use dedupe keys for macro events based on country, indicator, scheduled release time, and source-normalized indicator code.
Cluster article bursts into event clusters before sending them to reasoning.
Penalize confidence when only one weak source reports a supposedly major event.
Boost confidence when high-quality independent sources converge.
11. Rate-limit handling and provider hygiene
Build per-provider rate limiter wrappers.
Implement exponential backoff and jitter on retryable failures.
Implement provider circuit breakers when repeated failures or malformed responses occur.
Log provider health and freshness separately in admin surfaces.
Cache where reasonable to reduce unnecessary provider calls.
Prefer incremental pulls where supported instead of full repeated fetches.
12. Reasoning orchestration rules
Never let one provider immediately define the final user-facing asset view in accuracy-first mode unless the source is official and the event class is high-confidence.
Use composite evidence assembly before final asset cognition updates.
Use deterministic calculations for surprise, pressure, confidence, contradiction, and ranking. Use AI for interpretation and explanation on top of normalized evidence.
When article-level and macro-level evidence conflict, preserve contradiction explicitly rather than forcing premature consensus.
Tag each final cognition state with supporting_event_ids and evidence summary.
13. Provider-specific Codex instructions
Create a providers package with one folder per provider and one composite layer per data domain.
Add mock adapters for every provider so the system remains runnable before all credentials are configured.
Create a .env.example with placeholder variables only, never real secrets.
Document how to disable one provider and let the composite adapter fall back to the next source.
Expose provider health to the admin panel.
Add tests for normalization, dedupe, fallback behavior, and key calculation surfaces.
14. Final implementation stance
Build ELCEO so that raw speed belongs to the ingestion layer, but judgment belongs to the cognition layer. The chosen providers must feed a composite, accuracy-first market intelligence system. The code must make provider replacement, provider failure, and provider disagreement survivable.
