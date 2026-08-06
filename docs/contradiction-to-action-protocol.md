# IFP-3 Contradiction-to-Action Protocol

## Objective
IFP-3 transforms persisted, evidence-backed contradiction conditions into deterministic reasoning-governance states. It does not produce trade instructions.

## Architecture
The implementation lives in `services/reasoning/src/contradiction-action-protocol/` with versioned contracts, policy constants, deterministic identity, state machine, service, memory repository, SQL repository, and exports.

## Evidence sources
The service accepts persisted identities: event evaluation ID, optional analog retrieval ID, previous decision ID, and an evidence cutoff. It loads the IFP-1 event evaluation and expectation, both persisted canonical cognition payloads, and optional IFP-2 analog context. A dedicated repository supplies persisted-source `MarketContradictionInput`; the service validates its asset, generation time, evidence identities, evidence-point times, provenance boundary, and required fields before always invoking the existing contradiction-matrix evaluator internally. Callers cannot provide a completed matrix result.

## State definitions
- `wait_for_confirmation`: evidence is provisional, pending, ambiguous, provenance-limited, or otherwise immature.
- `review_required`: material contradiction exists without confirmed invalidation or escalation criteria.
- `invalidate_thesis`: direct persisted canonical invalidation evidence is confirmed.
- `escalate_review`: sufficiently sourced direct critical or compound contradiction requires analyst or risk review.
- `archive_resolved`: final evidence is resolved or non-actionable and no unresolved requirement remains.

## Precedence rules
Trusted confirmed canonical invalidation (`invalidation.primary != null`, `primary.confirmed === true`, and `riskLabel === broken`) takes precedence. Provisional, finalizable, insufficient, pending, and provenance-limited evidence waits. Final delayed or ambiguous evidence reviews. Trusted critical direct evidence escalates; trusted material contradiction reviews. Only final resolved records archive.

## Analog limitations
Analog outcomes are context only. They cannot independently invalidate or escalate, do not alter ranking identity, and sparse, provenance-limited, or no-comparable-history results are limitations.

## Provenance rules
Reliability is preserved from expectation, release, and reaction provenance; replay requires certification artifacts. Fixture and unverified required evidence cannot produce hard states and remain visible in references, warnings, limitations, sufficiency, and exact provenance counts. Cognition invalidation is loaded from canonical payloads rather than expectation fields.

## Deterministic identity
Protocol evidence snapshots and decisions are content-bound using canonical JSON hashing. Decision identity includes policy version, source evaluation/evidence hashes, expectation, cognition snapshots, contradiction hash, invalidation hash, analog retrieval/query-feature hash when present, cutoff, and previous decision.

## Persistence
Records are immutable and append-only. Immediate, confirmation, and follow-through assessments may supersede earlier records only within the same expectation/release/version/asset event lineage and without stage regression. SQL writes are transactional across parent, evidence reference, and transition rows, and the protocol repository is part of canonical memory and SQL reasoning persistence composition.

## Safe-language boundary
All generated text is validated by a no-advice guard. Blocked classes include trade execution, position entry, position exit, position sizing, leverage selection, stop placement, and target placement.

## Confidence-zero treatment
Zero confidence is diagnostic context only. It can support wait or review when paired with evidence conditions, but cannot by itself cause invalidation or escalation.

## Test evidence
The focused test suite covers finalization-aware states, canonical cognition invalidation, provenance preservation, contradiction cutoffs, deterministic normalization, repository immutability, persistence composition, and no-advice validation. SQL transaction/concurrency acceptance additionally requires the repository's database-backed validation environment.

## Truthful completion boundary
IFP-3 remains active until this PR is accepted and merged. IFP-4 has not started; the complete IFP is not finished.
