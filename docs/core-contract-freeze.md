# C1/C1-R — Canonical Contract Freeze and Hardening

This document freezes and hardens the canonical language used across ingestion, provider adapters, reasoning, notifications, chart projection, admin replay, and analytics.

## Ownership map

- `@elceo/types` owns canonical contracts, enums, legacy markers, and migration bridge helpers.
- `@elceo/schemas` owns strict runtime validation and deterministic fixtures.
- `@elceo/domain` owns deterministic scoring/mapping formulas.
- `@elceo/providers` owns adapter interfaces that return canonical events.

## Canonical-first rule (non-optional)

All **new code** must consume canonical contracts first:
- `CanonicalEvent`
- `RankedEvidenceItem`
- `CanonicalCognitionState`
- `ReasoningInputFrame`
- `NotificationTriggerRule`/`NotificationDecision`
- `ZoneSignificance`/`InvalidationState`

Legacy shapes exist for migration only and are explicitly deprecated.

## Legacy transition policy

Legacy compatibility currently exists for:
- `AssetCognitionState` (legacy cognition envelope)
- `InternalNormalizedEvent` (legacy normalized ingestion envelope)

### Guardrails

1. Do not create new producers of legacy shapes.
2. Existing legacy consumers must use explicit bridge helpers.
3. Bridge helpers are deterministic and document lossy mapping.
4. Bridge helpers must never silently invent required canonical semantics.

### Bridge helpers

Use:
- `mapLegacyAssetCognitionStateToCanonical(...)`
- `mapInternalNormalizedEventToCanonicalEvent(...)`

These are temporary migration tools and should be removed after full canonical migration.

## CanonicalEvent

`CanonicalEvent` is the normalized event/evidence envelope and the only allowed event payload across service boundaries.

### Timestamp semantics
- `occurredAt`: when event happened/published at source.
- `detectedAt`: when ELCEO observed/ingested it.
- `effectiveUntil`: optional explicit source expiry window.

### Auditability requirements
- `rawPayload` preserves source payload for replay/audit.
- `id` and `dedupeKey` preserve deterministic identity.
- `attribution` stores provider/publisher/author separately.
- `audit` stores normalizer/version/ingestion channel.

## RankedEvidenceItem

`RankedEvidenceItem` is the reasoning-layer ranked evidence record (not identical to `CanonicalEvent`).
It stores score components and linked chart context (`linkedZoneIds`, `linkedPriceLevels`, `linkedCandleTimes`, `linkedNotes`).

## CanonicalCognitionState

`CanonicalCognitionState` is the central reasoning output contract for dashboard, notifications, replay, analytics, journaling, and chart projection.
It must remain deeply structured:
- confidence (score + anatomy)
- contradiction (score + regime + anatomy + summary)
- freshness
- invalidation
- evidence
- zones
- explanation
- support events
- chart projection
- audit

## Strict runtime validator expectations

Validators are required to be field-specific and nested (not shallow):
- enum correctness
- string/array/boolean checks
- score ranges (0..100)
- ISO date checks
- nested object requirements
- relationship checks where applicable (example: invalidation `confirmed` ↔ `confirmedAt`)

Validator failures must emit precise field-level errors.

## Frozen formulas

All scoring helpers are pure and deterministic in `@elceo/domain/src/contracts/helpers.ts`.

### Confidence weighted score
Penalties are subtractive by design because contradiction/staleness reduce conviction.

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

### Contradiction regime boundary table

| Score range | Regime |
|---|---|
| 0 <= score < 15 | none |
| 15 <= score < 35 | low |
| 35 <= score < 60 | moderate |
| 60 <= score < 80 | high |
| 80 <= score <= 100 | critical |

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

```text
touchCountScore = clampTo100(min(touchCount, 5)/5*100)
```

```text
finalStrengthScore = clampTo100(
  0.20*touchCountScore +
  0.30*reactionMagnitudeScore +
  0.20*recencyScore +
  0.15*wickBodyRespectScore +
  0.15*multiTimeframeConfluenceScore
)
```

Reaction magnitude has the highest weight because structural validity is most strongly evidenced by reaction magnitude.
Recency matters but does not dominate.

### Invalidation risk labels

| Primary severity | Risk label |
|---|---|
| null / 0..24 | guarded |
| 25..49 | warning |
| 50..74 | fragile |
| 75..100 | broken |

## Runtime test expectations

Contract hardening requires runtime-executed tests (not compile-only):
- formula outputs and boundaries
- validator accept/reject behavior
- canonical fixture validity
- malformed nested structure rejection

## What new code should import

- Canonical contracts from `@elceo/types`
- Validators/fixtures from `@elceo/schemas`
- Formula helpers/constants from `@elceo/domain`
- Adapter contracts from `@elceo/providers/contracts`

## What old code may still use temporarily

- Legacy types (`AssetCognitionState`, `InternalNormalizedEvent`) only behind bridge boundaries.
- Migration bridge helpers in `@elceo/types/legacy-bridges` for transition periods.

No new feature should introduce additional legacy shapes.
