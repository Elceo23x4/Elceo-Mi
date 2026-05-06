# Market Evidence Quality Scoring (C5-A15)

C5-A15 adds deterministic evidence quality scoring before reasoning-weight integration.

- Components: source quality, freshness, completeness, conflict, final score (0..100).
- Provenance kinds: fixture/live_provider/calculated_internal/manual_research/replayed_snapshot/unknown.
- Freshness policies: class-based windows with fresh/aging/stale/expired status transitions.
- Conflict scoring: value spread across same evidence key/provider set mapped to none/mild/material/severe.
- Usability: usable/degraded/warning/blocked based on final score + freshness/conflict.
- Fixture payloads are explicitly marked not live-ready.
- Malformed metadata degrades quality and records reasons; evaluation does not crash.

This batch does not change trading signal weighting. C5-A16 should consume these scored payloads in reasoning input boundary weighting.


## C5-A16 note
- Added scored reasoning evidence input boundary integration from persisted normalized payloads + quality scores.
- Default filter policy excludes blocked, expired, fixture, and below-threshold evidence; deterministic ordering by quality desc, observedAt desc, payloadId asc.
- Added boundary assembly methods by asset and evidence class with no live/external calls.
- This batch does not change trading formulas/asset weights; C5-A17 will add weighting engine.

## C5-A17 note
- Added deterministic asset evidence weighting foundation (contracts/schemas/policies/helpers/boundary/tests) with quality-adjusted weights and no buy/sell/hold outputs.
