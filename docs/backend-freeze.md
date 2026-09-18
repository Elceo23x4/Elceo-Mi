# ELCEO Backend Freeze

## Frozen baseline

- Backend implementation status: **FROZEN**
- Frozen `main` commit: `20266494efd3a8d3a97c3ea9335c672e20fe7fa5`
- Frozen functional tree: `6f81f55269031e0ec6467cd60283593dd5b7c2d3`
- Merge lineage: PR #245 — DFC-1 evidence-fabric closure
- Integrated-main acceptance: CI Validation #784 — success
- Exact functional-tree acceptance immediately before merge: SEC-G Exact-Head #180 — success; SEC-H Exact-Head #158 — success

The frozen baseline is the server contract that UI implementation must consume. Documentation commits created after this point may produce later Git SHAs, but must not alter the frozen functional backend unless an objective defect is separately reviewed and approved.

## What is frozen

The following are frozen as implementation contracts:

- API route semantics and response envelopes;
- authentication/session subject derivation;
- ownership and authorization boundaries;
- commercial entitlements and feature-access decisions;
- billing/payment state truth and idempotency semantics;
- notification state/delivery semantics;
- PostgreSQL persistence authority;
- Redis-backed resilience/materialization behavior;
- dashboard materialization/read models;
- evidence fabric, source authority and provider routing;
- macro-vintage and freshness semantics;
- FX base/quote evidence handling;
- reasoning, contradiction, confidence and cognition behavior;
- server/client state-ownership boundaries.

## Allowed after freeze

Allowed work is limited to:

1. UI design and UI implementation against the frozen contracts;
2. documentation and mechanically generated handoff artifacts;
3. deployment/environment configuration;
4. provider credentials, entitlements, licensing/legal verification and staging probes;
5. production activation work that does not change backend semantics;
6. objective defect corrections through a dedicated reviewed change.

## Not allowed silently

Do not silently change API DTOs, auth/entitlement rules, database semantics, cognition formulas, evidence routing, confidence logic, billing state machines, notification semantics or server/client state ownership while UI implementation is underway.

Any such change requires explicit defect evidence and a new reviewed backend change.

## Deployment/preproduction distinction

A frozen backend does not imply every external integration is already production-active. Credential-, entitlement-, licensing-, provider-certification- and staging-dependent routes may correctly remain fail-closed. Those are deployment/preproduction concerns unless they reveal a genuine implementation defect.

The current UI handoff truth source is `docs/ui-handoff/README.md` plus machine-readable artifacts under `artifacts/ui-handoff/`.
