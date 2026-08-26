# D1-A0 truthful dashboard display contract and deterministic chart core

## Boundary and before/after

Before this prerequisite, the legacy dashboard display contract required numeric contradiction and module-rank values even when `MarketCognitionSnapshot` did not canonically own such a number. The legacy evidence-surface module therefore used the constant `72`, the contradiction module ranked an inverse legacy score, the impulse placeholder used the process clock, and H4 zone recency/significance used ambient process time.

After this prerequisite, `dashboard-display-v2` represents a non-authoritative contradiction or module rank as `null` with explicit availability. Null is never a numeric sentinel and unavailable modules sort after numerically ranked modules. Legacy construction remains isolated compatibility behavior; it is not a canonical projection. The deterministic H4 core requires a semantic `evaluatedAt`, while a deprecated legacy wrapper alone supplies present time. The canonical-capable annotation builder omits impulse annotations unless an observed timestamp is supplied.

## Numeric intelligence authority audit

| Dashboard value | Class | Authority / v2 treatment |
| --- | --- | --- |
| `confidence_total` | B | Exact presentation of canonical final confidence; remains numeric. |
| `confidence_anatomy.*` | B | Exact presentation of canonical confidence components; remains numeric. |
| `directional_bias` | A | Canonical directional state (not a synthesized numeric score). |
| Directional module legacy `rank_score` | D | Legacy cognition ranking only; a future canonical projector must use unavailable unless canonical authority is supplied. |
| Confidence module `rank_score` | B | Exact presentation of authoritative confidence. |
| `contradiction.score` | D for `MarketCognitionSnapshot` projection | Snapshot owns flags, severity, evidence IDs, and rationale, but no aggregate score; v2 permits `null`/`unavailable`. |
| Contradiction module inverse rank | D | Legacy-only inverse score; future canonical projection must use `null`/`unavailable`. |
| Evidence-surface module rank `72` | D | Removed from v2 output and represented as `null`/`unavailable`. |
| Zone bounds/center/touches/reaction/significance/age | C | Deterministic candle display values evaluated at explicit semantic time. |
| Evidence note count | C | Deterministic count, used in prose rather than as a rank. |
| Freshness/cleanliness/fragility | A/B when present | Not currently fields of this dashboard display contract; no substitute value is introduced. |
| Impulse metrics/timestamp | D unless evidence supplied | No numeric impulse metric exists here; canonical-capable annotations omit an unobserved impulse and never fabricate its time. |

The audit introduces no contradiction aggregate, confidence, rank, directional, evidence aggregation, zone-weighting, or IFP reasoning formula. It changes presentation contracts and clock injection only; zone mathematics are unchanged.

## Program status

Canonical dashboard projection and distributed dashboard materialization are not implemented. The production dashboard route is unchanged. PGS-1 through PGS-5 and accepted IFP semantics are unchanged. IFP-8 remains externally blocked, and production live remains disabled.
