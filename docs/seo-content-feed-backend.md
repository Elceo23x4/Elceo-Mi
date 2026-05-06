# SEO Content Feed Backend (C5-A19)

C5-A19 adds backend-only SEO feed contracts and deterministic builders for programmatic SEO page families.

- Feed coverage: asset, macro event, institution, country macro, evidence class, education, explainer, comparison, glossary, daily/weekly notes.
- Output includes canonical metadata, sitemap-ready records, JSON-LD-ready string payloads, internal linking edges, and assembly report.
- No frontend/public routes are added in this batch.
- No article-body generation is included.
- Keyword stuffing is explicitly disallowed; only defined keyword arrays are emitted.
- C5-A20 can prioritize internal/admin query routes or market-evidence internal API routes.

## C5-A20 market evidence + SEO admin/internal query routes
Added protected read-only admin query surfaces under /api/admin/market-evidence/* and /api/admin/seo/* (internal token + admin.read). These routes expose persisted payload/replay/quality/reasoning-input/weighted/cognition/SEO feed/sitemap views with strict query validation, no live provider fetches, and no public SEO pages.
