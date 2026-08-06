# IFP-3 Contradiction-to-Action Protocol

## Objective
IFP-3 transforms persisted, evidence-backed contradiction conditions into deterministic reasoning-governance states. It does not produce trade instructions.

## Architecture
The implementation lives in `services/reasoning/src/contradiction-action-protocol/` with versioned contracts, policy constants, deterministic identity, state machine, service, memory repository, SQL repository, and exports.

## Evidence sources
The service accepts persisted identities: event evaluation ID, optional analog retrieval ID, previous decision ID, and an evidence cutoff. It loads the IFP-1 event evaluation and expectation, both persisted canonical cognition payloads, and optional IFP-2 analog context. Memory and SQL repositories persist a content-bound `PersistedContradictionInputRecord` tied to the exact evaluation, expectation, asset, assessment stage/evidence hash, and point-in-time cutoff. The production factory obtains that repository from canonical reasoning persistence; consumers do not invent adapters. The service validates the record before invoking the existing contradiction-matrix evaluator internally.

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
Reliability is preserved from expectation, release, reaction, and persisted contradiction-point provenance; replay requires certification artifacts. Missing provider reliability, unverified source independence, fixture evidence, and unverified evidence block hard states and remain visible in references, warnings, limitations, sufficiency, and exact provenance counts. Pre-event cognition must precede the expectation cutoff, issuance, and scheduled release, and its audit cutoff cannot exceed the expectation cutoff.

## Deterministic identity
Protocol evidence snapshots and decisions are content-bound using canonical JSON hashing. Decision identity includes policy version, source evaluation/evidence hashes, expectation, cognition snapshots, contradiction hash, invalidation hash, analog retrieval/query-feature hash when present, cutoff, and previous decision.

## Persistence
Records are immutable and append-only. Immediate, confirmation, and follow-through assessments may supersede earlier records only within the same expectation/release/version/asset event lineage and without stage regression. SQL writes are transactional across parent, evidence reference, and transition rows. Tests use independent concurrent connections synchronized at the insert boundary so both transactions reach the uniqueness race before either commits; rollback tests verify no partial parent or children remain.

## Safe-language boundary
All generated text is validated by a no-advice guard. Blocked classes include trade execution, position entry, position exit, position sizing, leverage selection, stop placement, and target placement.

## Confidence-zero treatment
Zero confidence is diagnostic context only. It can support wait or review when paired with evidence conditions, but cannot by itself cause invalidation or escalation.

## Test evidence
The focused test suite covers finalization-aware states, canonical cognition invalidation, provenance preservation, contradiction cutoffs, deterministic normalization, repository immutability, persistence composition, and no-advice validation. SQL transaction/concurrency acceptance additionally requires the repository's database-backed validation environment.

## Truthful completion boundary
IFP-3 remains active until this PR is accepted and merged. IFP-4 has not started; the complete IFP is not finished.

## Final acceptance boundaries
Escalation and review reasons are independent: a trusted reversal escalates only at critical severity, while a trusted `mispriced_candidate` escalates at high or critical severity; lower severities review. Every contradiction evidence point must map to exactly one persisted provenance record, replay provenance requires verification artifacts, and orphan or duplicate provenance is rejected before matrix evaluation.

Persisted input identity binds availability, normalized input, source IDs, provenance, provider/source-independence flags, warnings, and limitations. Reordering set-like fields is neutral; provenance or point-in-time eligibility changes identity. SQL input persistence permits identical normalized market content for distinct valid event lineages. Analog outcomes remain context only and are not state-machine inputs; protocol parent, evidence, and transition writes remain atomic.

Assessment history is a strictly linear immediate → confirmation → follow-through chain in one canonical event repository. Immediate is provisional and waits; confirmation may be finalizable and reviewable; only the terminal resolved follow-through is final and may archive. IFP-1 retains one final assessment per expectation/release version. Same-stage supersession, regression, and branching are rejected, and the complete path is retrievable by deterministic event-instance identity. SQL tests execute previous-row locking, recursive ancestor lookup, outgoing/incoming transition uniqueness, and transition insertion; evidence, parent, and transition failures roll back transaction-local changes. Analog outcomes remain context-only.
