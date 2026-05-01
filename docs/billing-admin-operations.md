# Billing Admin Operations (C4-M4A)

C4-M4A delivers runtime-only billing-admin read models over persisted billing lifecycle + billing policy sources.

## Operational summary semantics
- Summary is aggregated cross-subject from persisted lifecycle subscriptions, account entitlements, latest reconciliation runs, and latest policy transitions.
- Counts are deterministic and include premium-active/trialing/restricted, free-fallback, failed/degraded reconciliations, provider mapping fallback, policy restriction, and recovery counts.
- Health state mapping remains deterministic: `critical` > `degraded` > `attention_needed` > `healthy`.

## Failure classification semantics
- Failure read models are assembled from persisted reconciliation runs with linked policy transitions when present.
- Classification covers: `subject_resolution_failed`, `provider_mapping_missing`, `provider_mapping_fallback_free`, `policy_restricted`, `policy_free_fallback`, and `unknown_failure`.
- Ordering is deterministic: occurredAt desc then failureId asc.

## Retry/re-evaluate candidate semantics
- Candidates are assembled from persisted reconciliation runs + latest subject policy transition + latest subscription state.
- Reasons include failed reconciliation, mapping fallback free, restricted states, and pending recovery re-evaluation.
- Ordering is deterministic: createdAt desc then candidateId asc.

## Subject snapshot semantics
- Subject snapshot is assembled from lifecycle snapshot, policy snapshot, latest reconciliation run, latest policy transition, plus compact operational state.
- Replay helper re-reads persisted canonical sources; it is not a separately persisted snapshot blob.

## Scope boundary
This pass intentionally stops before admin route wiring and admin UI rendering.

## C4-M4B next
- add internal/admin route layer over this boundary
- add pagination/filter contracts for operator workflows
- add richer audit/replay diagnostics for control-plane investigation
