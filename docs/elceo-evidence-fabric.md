# ELCEO Evidence Fabric (DFC-1)

## Boundary and hierarchy

The fabric routes **asset → evidence capability → role-specific route → canonical source → trusted resolver → Provider API Gate → protocol connector → source mapper → normalizer → append-only persistence → quality/freshness/revision state**. Provider names are deliberately below capabilities. The launch universe is exactly the fourteen entries in `TRADING_ASSET_COVERAGE`; DXY and VIX are launch-analysis assets and retain cross-asset diagnostic roles.

Every connector uses an immutable server-owned origin. Runtime input may select a registered dataset, series, period, or asset, but can never supply a hostname. Protocol families are SDMX REST, JSON REST, CSV, XML, XLSX/file, Socrata, SEC EDGAR JSON, provider-keyed REST, and market REST/streaming. All deployed execution remains behind the existing Provider API Gate, quota, cache/single-flight, timeout, retry, allowlist, and provenance controls.

## Authority and routing

Authority tiers are official first party, market venue, licensed market vendor, trusted aggregator, public extraction, and calculated internal. An official actual is preserved separately from a vendor expectation. Correlation keys bind area, indicator, reference period, scheduled release time, and authority. Disagreement is retained for contradiction analysis, never overwritten by authority ranking.

Aliases are translated before lookup, quota, scheduling, readiness, and persistence. New records use canonical IDs. Legacy IMF, World Bank, and OECD zero-returning code is not an eligible route: canonical definitions require a real transport, normalizer, provenance and append-only persistence.

## Blueprints and sufficiency

Machine-readable blueprints cover XAU/USD, EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, NZD/USD, USD/CAD, BTC/USD, Nasdaq 100, S&P 500, DE30, DXY, and VIX. Requirements are critical, important, or supplemental and routes identify primary, confirmation, fallback, or proxy roles. Sufficiency is evaluated per asset. Each critical capability needs a non-placeholder executable adapter, normalization, freshness, persistence, and trusted gate path. Price alone always fails.

A source-unique official release does not need fake redundancy. Transport redundancy and semantic confirmation are reported separately. A source outage yields an explicit degraded reason.

## Revision and expectation semantics

Macro observations are append-only vintages retaining reference period, release, first-seen, retrieval and effective timestamps; vintage/revision ID; prior and revised values; preliminary/final/revised state; source reference; canonical ID; and request ID. `asOf(T)` selects only vintages first seen by T, preventing look-ahead. FRED/ALFRED real-time periods map to these fields.

Calendar expectations, previous values, preliminary actuals, authoritative actuals, and revisions are distinct fields. DFC-1 introduces their link contract without changing Expectation–Reality Delta formulas.

## Proxy rule

A proxy route must declare the underlying, instrument/source, basis-risk class, rationale, `proxy: true`, and `mayLabelAsDirectPrice: false`. A direct-price requirement rejects proxy-only satisfaction unless the blueprint explicitly permits it; index ETFs are never silently presented as indices.

## Activation and licensing

Descriptor, parser, fixture verification, executable adapter, staging eligibility, empirical verification, production eligibility, and production activation are independent states. Eligibility is derived from identity, translation, adapter, normalization, gate/quota/freshness policy, credentials, explicit activation, resolver, non-placeholder status, and probe outcome. Production is blocked by default and no source is activated by DFC-1.

Usage metadata separates internal analytics, raw display, attribution, and redistribution. Unknown rights fail closed for raw redistribution and require legal review; a subscription is not treated as redistribution permission.

## Scheduling

Schedules derive from blueprint capabilities and deduplicate source/capability/asset work. Prices are intraday; releases are release-aware with bounded polling; macro and rates are daily/release-aware; COT is weekly; filings/news use bounded short polling; structural international series are weekly; calculated composites react to upstream changes. Gate quotas and single-flight prevent official API hammering.

## Current evidence status

The matrices in `artifacts/provider-closure/` distinguish contract implementation from activation. All fourteen blueprints are audited independently. Only Tiingo has a proven executable registration; the asset results therefore remain explicitly degraded wherever critical official routes are not executable. This is **not** a claim of empirical staging or production readiness: public endpoints still need opt-in probes and schema fixtures, keyed sources need credentials, usage rights need review, and all production activation remains false. Ifo and ZEW remain supplemental public-extraction shells until an authoritative reliable programmatic path is demonstrated. Gold ETF flows and several breadth/derivatives routes similarly remain supplemental rather than making a false green claim.


## DXY and VIX execution semantics

DXY's direct observation authority is ICE Data Indices. DX futures, UUP, and reconstructed currency baskets are derivative or proxy evidence and may not be labelled as the direct index. The direct route remains blocked on entitlement, fixture, adapter, and redistribution review.

VIX's direct observation authority is Cboe. VIX futures, ETPs, and calculated volatility are distinct derivative/proxy capabilities. The registry describes the delayed Cboe source contract, but does not claim real-time entitlement or staging verification.

## Executable truth

Implementation state is derived from `EVIDENCE_EXECUTION_REGISTRATIONS`, not source descriptors. At this revision only the Tiingo adapter, normalizer, fixture module, scheduler identity, persistence path, gate translation, and trusted resolver form a complete executable registration. Other sources remain `source_contract_ready` or blocked until source-specific code and fixture tests exist. PostgreSQL table `app_macro_evidence_vintages` is the append-only macro authority; process memory is not authoritative.
