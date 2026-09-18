# ELCEO UI Handoff — Canonical Index

This directory is the authoritative current frontend integration handoff for the frozen ELCEO backend.

## Frozen backend

- Commit: `20266494efd3a8d3a97c3ea9335c672e20fe7fa5`
- Functional tree: `6f81f55269031e0ec6467cd60283593dd5b7c2d3`
- Freeze record: `docs/backend-freeze.md`

Historical phase documents remain useful for lineage, but this handoff supersedes stale implementation-status notes where later backend work closed them.

## Machine-readable contracts

- `artifacts/ui-handoff/backend-freeze-manifest.json`
- `artifacts/ui-handoff/route-inventory.json`
- `artifacts/ui-handoff/openapi.json`
- `artifacts/ui-handoff/mocks/*.json`

Generate with:

`npm run generate:ui-handoff`

Validate synchronization with:

`npm run check:ui-handoff`

The generator reads the actual `apps/web/app/api/**/route.ts` tree. Field-level validators/types remain authoritative where route source proves more detail than the generic OpenAPI layer.

## Frontend rules

1. The browser consumes server-owned intelligence; it does not recreate confidence, bias, evidence sufficiency, billing truth or entitlement decisions.
2. Internal/ops routes are never browser APIs.
3. Admin and super-admin surfaces remain separately classified.
4. Mutation retries must honor idempotency/replay behavior exposed by the server.
5. Fail-closed external-provider/payment activation is a legitimate state and must be represented as degraded/blocked rather than guessed around.
6. Raw provider payloads and secrets never belong in frontend contracts.
7. FX UI must preserve independent base-currency and quote-currency evidence/context before relative pair interpretation.

## Human-readable handoff documents

- `ui-state-matrix.md` — backend state to UI behavior.
- `validation-and-field-rules.md` — request/field/validation constraints.
- `auth-session-and-authorization.md` — authentication, ownership, admin and step-up boundaries.
- `state-ownership.md` — server vs client ownership.
- `frontend-integration-map.md` — UI surface to API integration map.
- `billing-payment-state-machine.md` — billing/payment UI semantics.
- `notifications-ui-contract.md` — notification UI semantics.

## Route/API discovery

`route-inventory.json` is exhaustive for route/method presence. `openapi.json` mirrors that path/method set and adds UI exposure/policy metadata. It intentionally does not invent field constraints that cannot be proven mechanically from the frozen route tree.

Use `x-elceo-ui-exposure`, `x-elceo-policy`, `x-elceo-entitlement`, `x-elceo-permission` and `x-elceo-source` as integration metadata.

## Error envelope

Canonical route families use the standard shape:

- success: `{ "ok": true, "data": ..., "meta"?: ... }`
- error: `{ "ok": false, "error": { "code": "...", "message": "...", "details"?: ... } }`

Common HTTP mappings include 400 validation/bad request, 401 unauthorized, 403 forbidden/entitlement denial, 404 not found, 409 conflict/idempotency replay conflict, 422 unprocessable, 424 dependency failure and 500 internal error. Route handlers/validators remain authoritative for whether each status applies to a specific method.

## UI implementation boundary

The UI phase may design and implement presentation, interaction, local ephemeral state, display caching and accessibility behavior. It must not alter frozen backend semantics to simplify frontend work. Any genuine contract defect discovered during UI integration must be reported with exact route/schema evidence and handled as a separately reviewed backend defect.
