# Kick Off dashboard contract v1

## Purpose and commercial boundary

Kick Off answers only what H4 price is doing, how much quality-adjusted usable evidence ELCEO has, and which current source-authored headlines exist in that exact evidence epoch. Focus Plan remains the unchanged `DashboardChartWorkspaceViewModel` and owns direction, confidence, contradictions, evidence notes, narratives, rankings, and reasoning.

## Accepted versions

- Public contract: `kick-off-dashboard-v1`
- Materialization kind: `kick_off_dashboard_context`
- Context: `kick-off-dashboard-context-v1`
- Score: `kick-off-evidence-score-v1`
- Headlines: `kick-off-macro-headlines-v1`

## Evidence Score

The canonical value is exactly `WeightedEvidenceSnapshot.usableWeight`; it is not normalized, rounded, or derived from cognition confidence. Zero is an available value. Unavailable means an exact safe context could not be established.

## Headlines

Candidates must be validated typed `market_news` or `geopolitical_risk` payloads present in the exact weighted snapshot, non-excluded, positive quality-adjusted weight, published no later than evaluation, and `fresh` or `aging` under the existing evidence freshness result. Ordering is publication descending then payload identity ascending, exact duplicates only are collapsed, and at most three are exposed. Public IDs are deterministic SHA-256 values; internal identities, sentiment, importance, contribution, and generated prose are forbidden.

## Public shape and availability

The strict runtime-validated response positively constructs contract/access, asset, H4 timeframe, horizon, evaluation time, canonical candles, stripped `{zone_id,lower,upper,center}` zones, Evidence Score availability, and headline availability. Unknown public fields are rejected. D1 absence makes the dashboard unavailable. A missing, stale, mismatched, or tampered context leaves the chart available while score and headlines are unavailable. A valid context with no candidates returns `empty` headlines.

## Lineage, integrity, and freshness

The context binds the D1 identity and integrity, cognition identity and integrity, exact evaluation epoch, horizon, asset, reasoning-input identity, weighted snapshot identity and canonical content hash, sorted evidence identities, policy identifiers, freshness policy hash, and canonical payload. Its expiration is the earliest safe parent expiration. Passive reads validate the current pointer, immutable artifact integrity, exact lineage, and freshness; they cannot invoke providers, schedulers, weighting, cognition, D1 computation, or writes.

## Premium exclusion and compatibility

Kick Off never serializes directional bias, confidence, contradiction, annotations, filters, modules, evidence notes/IDs, rationale, warnings, drivers, cautions, signal values, quality weights, provider reliability, or internal materialization identities. Focus Plan API and `DashboardShell` behavior remain unchanged, including premium alert evaluation; the Kick Off renderer receives only its strict allowlisted model and executes no premium alerts.
