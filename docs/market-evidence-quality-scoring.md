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
