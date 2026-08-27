# Canonical dashboard projection v1

`canonical-dashboard-projection-v1` is the pure product boundary from a validated `MarketCognitionSnapshot`, validated typed `CanonicalMarketCandleObservation[]`, and explicit semantic context to a `DashboardChartWorkspaceViewModel`. It performs no provider, ingestion, cognition, admission, scheduling, user/session, Redis, or PostgreSQL work.

## Authorities and identity

- Cognition authority is `MarketCognitionSnapshot` directly. The projector neither constructs nor imports legacy `AssetCognitionState`.
- Price authority is the typed canonical candle observation accepted by `validateCanonicalMarketCandleObservation`; `rawPayload` is never inspected and cannot supply OHLC.
- The SHA-256 projection identity canonically binds asset, H4 timeframe, horizon, the complete cognition snapshot, cognition artifact identity/content hash/contract/provenance, chronologically ordered candle truth and its ordered observation-ID/content-hash manifests, canonical `evaluatedAt`, `h4-zone-deterministic-v1`, `dashboard-display-v2`, `canonical-dashboard-projection-v1`, and `canonical-dashboard-policy-v1`.
- Request, user, session, worker, credential, host, random, and execution-clock data are outside the identity. `evaluatedAt` must be a canonical UTC ISO timestamp and is the sole market-evaluation time authority.
- Snapshot, signal, confidence, contradiction, and narrative generation timestamps must be no later than `evaluatedAt`; future cognition fails closed. Artifact provenance is mandatory and must contain at least one non-empty item. No accepted helper currently validates this projection input's cognition-artifact identity/content-hash/contract-version tuple, so this boundary validates presence and deterministically binds the supplied values without inventing a second cognition hash.
- The cognition schema validates collection contents but does not prescribe canonical ordering. Identity normalization therefore sorts only set-like collections: signals by ID, contradictions by ID, their evidence/warning/kind sets, snapshot warnings, narrative evidence IDs, and artifact provenance. Narrative driver and caution arrays retain their authored semantic order.

## Field authority classification

| Output | Class | Mapping |
| --- | --- | --- |
| asset, horizon scope | A | Exact canonical input/cognition agreement. |
| directional bias | B | Exact display classification of canonical signal directions; conflicting qualified directions are `mixed`, and absent qualified direction is `neutral` or `unknown`. |
| confidence total/anatomy | A/B | Canonical final confidence and decomposition copied into display names without reweighting. |
| chart candles | B | Exact typed canonical OHLC/volume display transformation. |
| H4 zones and key-level annotations | C | Existing deterministic H4 mathematics at explicit `evaluatedAt`; future candles are excluded, and each annotation names only the three canonical observations in its calculation window. |
| contradiction state, rationale, severity, evidence | A/B | Canonical flags become truthful lineage. No aggregate score authority exists, so score and marker score are `null`/`unavailable`. |
| module ranks | A/D | Only authoritative final confidence is numeric. Direction, contradiction, and evidence ranks are `null`/`unavailable`. |
| evidence notes | B | Canonical signal rationale, generation timestamp, and evidence IDs only. |
| macro event marker | D | Snapshot evidence IDs do not carry an authoritative event occurrence timestamp, so no marker is emitted. |
| impulse marker | D | No accepted observed impulse source is part of this contract, so no marker is emitted. |

Every canonical output explicitly emits `dashboard-display-v2`. Unsupported numerical values remain `null` with explicit availability; they never become `0`, `50`, `72`, `-1`, `NaN`, generic prose, fixture intelligence, or current-time placeholders. Contradiction evidence lineage remains attached to both dashboard state and its marker.

## Deliberate boundary

D1-B distributed Redis/PostgreSQL materialization and ownership/fencing remains unimplemented. D1-C passive production consumption remains unimplemented, and `GET /api/dashboard/[asset]` remains on its accepted legacy/passive path. Production-live activation remains disabled. IFP-8 remains externally blocked; this projection neither changes IFP/PGS semantics nor fabricates intelligence to bypass that dependency.
