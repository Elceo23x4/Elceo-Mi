# SEO Content Architecture (C5-A1)

Backend SEO architecture foundation for canonical keyword clusters, page contracts, internal-link rules, and structured-data readiness.

- Keyword clusters include forex/gold/macro, central-banks, inflation/labor/rates, COT/liquidity/risk sentiment, crypto macro, index/volatility, psychology/journal/risk.
- Launch page families include asset pages, macro event pages, institution pages, evidence class explainers, and education/explainer pages.
- Internal linking maps asset pages -> macro catalysts -> institution policy pages -> explainer context.
- Structured data kinds are contract-backed for article/faq/howto/dataset/webpage.
- Anti-abuse rule: avoid keyword stuffing and prioritize intent-matched authored content.
- Frontend consumes snapshots later; this batch is backend-only and does not render pages.


## C5-A2 durability/query/replay update
- SEO architecture snapshots now persist durably via `app_seo_content_architecture_snapshots` with strict JSON serialization and schema-validated replay.
- Query helpers read persisted snapshots only; no hidden regeneration.
- Generation remains deterministic and backend-only; C5-A3 should add provider-ingestion foundations/contracts.


## C5-A14 coverage-audit closure
- Launch SEO families are now checked for slug uniqueness, required asset/evidence mapping, and internal-link target validity as part of deterministic coverage closure.
