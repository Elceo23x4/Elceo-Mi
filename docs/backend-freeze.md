# ELCEO Backend Freeze

**Status:** FROZEN  
**Frozen main commit:** `20266494efd3a8d3a97c3ea9335c672e20fe7fa5`  
**Frozen functional tree:** `6f81f55269031e0ec6467cd60283593dd5b7c2d3`  
**Freeze acceptance:** CI Validation `#784` on the merged `main` commit completed successfully.

## What this freeze means

ELCEO's backend implementation is closed for the UI handoff baseline. The merged `main` commit above passed the integrated repository acceptance chain, including repository tests, PostgreSQL/Redis integration, SEC-A through SEC-G checks, intelligence-program integration, production build, migration validation, security gates, the complete release gate, clean-tree verification, and diff-integrity validation.

The functional backend tree is therefore the authority for UI integration. Documentation or UI work must not silently alter runtime semantics.

## Frozen functional domains

The freeze covers the implemented backend contracts and behavior for:

- authentication/session and authenticated subject ownership;
- account/profile state;
- entitlements, commercial access, billing and payment state machines;
- workspace, portfolio and journal state;
- notifications and delivery state;
- canonical dashboard materialization and passive reads;
- market evidence, freshness, provenance and vintage semantics;
- asset evidence blueprints and capability/source routing;
- cognition, directional bias, confidence, contradiction/tension and reasoning outputs;
- provider API-gate execution policy;
- admin and super-admin authorization/security controls;
- persistence, idempotency, replay and recovery behavior;
- release/security/governance acceptance infrastructure.

## Allowed post-freeze changes

The following do **not** reopen the backend architecture when they preserve the frozen runtime contract:

- UI implementation;
- documentation and generated handoff artifacts;
- mechanical handoff validation tooling;
- deployment/environment configuration;
- provider credentials and entitlements;
- licensing/legal activation work;
- staging and production smoke certification;
- objective defect corrections reviewed explicitly against this freeze.

## Changes that require explicit backend-unfreeze review

Do not change any of the following merely to make frontend work easier:

- API path/method semantics;
- request/response DTO semantics;
- validation rules;
- auth/session ownership rules;
- entitlement decisions;
- billing/payment transitions;
- persistence semantics;
- cognition formulas or confidence arithmetic;
- evidence-source authority or routing;
- freshness/vintage semantics;
- server/client state ownership;
- notification-delivery semantics;
- migration/schema behavior.

If UI integration discovers a genuine mismatch or missing backend contract, record the exact defect and evidence before changing runtime code.

## Deployment/preproduction distinction

Backend completion does not mean every external integration is production-active. Provider credentials, paid entitlements, redistribution/licensing approval, staging probes, production webhook certification, payment-provider activation, and environment secrets remain deployment/preproduction concerns where the frozen backend deliberately fails closed.

A route or provider marked blocked/degraded because activation evidence is absent must not be documented as live merely because its code path exists.

## UI handoff authority

Current UI implementation guidance lives under `docs/ui-handoff/` and `artifacts/ui-handoff/`.

Those handoff artifacts must be mechanically checked against the frozen route/runtime contracts. Historical phase documents remain useful context, but they are not allowed to override the current frozen implementation.
