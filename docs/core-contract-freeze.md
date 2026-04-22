# C1 — Canonical Contract Freeze

This document freezes the canonical language used across ingestion, provider adapters, reasoning, notifications, chart projection, admin replay, and analytics.

## Ownership map

- `@elceo/types` owns canonical contracts and enums.
- `@elceo/schemas` owns runtime validation helpers.
- `@elceo/domain` owns deterministic scoring and mapping helpers.
- `@elceo/providers` owns provider adapter interfaces that must emit canonical events.

## CanonicalEvent

`CanonicalEvent` is the normalized evidence/event envelope. It is the only allowed cross-service event shape.

### Timestamp semantics
- `occurredAt`: when event happened (or was published by source).
- `detectedAt`: when ELCEO ingested/detected it.
- `effectiveUntil`: optional explicit expiry if the source provides it.

### Auditability
- `rawPayload` keeps upstream payload for replay/audit.
- `dedupeKey` and `id` are deterministic identities.
- `attribution` stores provider/publisher/author explicitly.
- `audit` stores normalizer/version/ingestion channel.

## RankedEvidenceItem

`RankedEvidenceItem` is a ranked reasoning input record and is intentionally distinct from `CanonicalEvent`.
It contains score components, linked zones/price levels/candles/notes, and deterministic ranking outputs.

## CanonicalCognitionState

`CanonicalCognitionState` is the central reasoning output envelope for dashboard, demo, notifications, admin replay, journal linkage, and chart projection.
It keeps nested sections explicit:
- confidence anatomy
- contradiction anatomy and regime
- freshness
- invalidation state
- ranked evidence
- zone significance
- explanation (concise, expanded, and deterministic reason buckets)
- support event slices
- chart projection references
- audit versions

## Frozen formulas

All scoring helpers are pure and deterministic in `@elceo/domain/src/contracts/helpers.ts`.

### Confidence weighted score
Penalties are subtractive by design: contradiction and staleness reduce conviction.

```text
score = clampTo100(
  0.30*sourceIntegrity +
  0.25*eventAlignment +
  0.30*priceAcceptance -
  0.10*contradictionPenalty -
  0.05*stalenessPenalty
)
```

### Contradiction weighted score

```text
score = clampTo100(
  0.25*narrativeConflict +
  0.30*priceConflict +
  0.20*eventConflict +
  0.15*macroConflict +
  0.10*timeframeConflict
)
```

Regime thresholds:
- `[0, 15)` => `none`
- `[15, 35)` => `low`
- `[35, 60)` => `moderate`
- `[60, 80)` => `high`
- `[80, 100]` => `critical`

### Freshness

```text
freshnessScore = clampTo100(100 - decayRatePerHour * hoursSinceLastMaterialUpdate)
```

Default decay rates:
- M5: 12
- M15: 8
- H1: 4
- H4: 2
- D1: 0.75

Default stale thresholds (hours):
- M5: 6
- M15: 12
- H1: 24
- H4: 72
- D1: 168

### Zone significance
Touch normalization:

```text
touchCountScore = clampTo100(min(touchCount, 5)/5*100)
```

Final strength:

```text
finalStrengthScore = clampTo100(
  0.20*touchCountScore +
  0.30*reactionMagnitudeScore +
  0.20*recencyScore +
  0.15*wickBodyRespectScore +
  0.15*multiTimeframeConfluenceScore
)
```

Reaction magnitude has highest weight because zone importance is primarily proven by rejection/acceptance impulse.
Recency matters but is capped to avoid overfitting one recent touch.

### Invalidation risk label
From primary invalidation severity:
- no primary or `<25`: `guarded`
- `25..49`: `warning`
- `50..74`: `fragile`
- `75..100`: `broken`

## Runtime schema coverage

Runtime validators exist for events, cognition states, providers, reasoning frames, zones/invalidation states, and notification rules/context/decisions.

## Future batch consumption

- Ingestion adapters must output `CanonicalEvent` and never raw provider models across service boundaries.
- Reasoning engines must accept `ReasoningInputFrame` and return `CanonicalCognitionState`.
- Notification evaluation must use `NotificationTriggerRule`, `NotificationTriggerContext`, and emit `NotificationDecision`.
- New features must reuse these contracts and formulas rather than introducing alternate score meanings.
