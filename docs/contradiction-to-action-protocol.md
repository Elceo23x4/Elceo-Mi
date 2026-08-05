# IFP-3 Contradiction-to-Action Protocol

## Objective
IFP-3 transforms persisted, evidence-backed contradiction conditions into deterministic reasoning-governance states. It does not produce trade instructions.

## Architecture
The implementation lives in `services/reasoning/src/contradiction-action-protocol/` with versioned contracts, policy constants, deterministic identity, state machine, service, memory repository, SQL repository, and exports.

## Evidence sources
The service accepts persisted identities: event evaluation ID, optional analog retrieval ID, previous decision ID, and an evidence cutoff. It loads the IFP-1 event evaluation and expectation, optional IFP-2 analog retrieval, cognition snapshot identities, frozen invalidation state, and contradiction-matrix evidence.

## State definitions
- `wait_for_confirmation`: evidence is provisional, pending, ambiguous, provenance-limited, or otherwise immature.
- `review_required`: material contradiction exists without confirmed invalidation or escalation criteria.
- `invalidate_thesis`: direct persisted canonical invalidation evidence is confirmed.
- `escalate_review`: sufficiently sourced direct critical or compound contradiction requires analyst or risk review.
- `archive_resolved`: final evidence is resolved or non-actionable and no unresolved requirement remains.

## Precedence rules
Confirmed canonical invalidation takes precedence. Immature evidence waits. Critical direct evidence escalates. Material non-terminal contradiction enters review. Final resolved records archive.

## Analog limitations
Analog outcomes are context only. They cannot independently invalidate or escalate, do not alter ranking identity, and sparse, provenance-limited, or no-comparable-history results are limitations.

## Provenance rules
Unverified required evidence cannot produce hard states. Fixture-only evidence is identified as non-production evidence and cannot be treated as production validation.

## Deterministic identity
Protocol evidence snapshots and decisions are content-bound using canonical JSON hashing. Decision identity includes policy version, source evaluation/evidence hashes, expectation, cognition snapshots, contradiction hash, invalidation hash, analog retrieval/query-feature hash when present, cutoff, and previous decision.

## Persistence
Records are immutable and append-only. Later records may supersede earlier records through explicit transition rows. SQL writes are transactional across parent, evidence reference, and transition rows.

## Safe-language boundary
All generated text is validated by a no-advice guard. Blocked classes include trade execution, position entry, position exit, position sizing, leverage selection, stop placement, and target placement.

## Confidence-zero treatment
Zero confidence is diagnostic context only. It can support wait or review when paired with evidence conditions, but cannot by itself cause invalidation or escalation.

## Test evidence
The focused test suite covers state precedence, analog safety, deterministic identity, repository immutability, no-advice validation, SQL/memory parity, and concurrency behavior.

## Truthful completion boundary
IFP-3 remains active until this PR is accepted and merged. IFP-4 has not started; the complete IFP is not finished.
