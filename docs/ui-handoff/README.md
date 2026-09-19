# ELCEO UI/API Handoff

This directory is the **current UI implementation handoff** for the frozen ELCEO backend.

Backend freeze authority:

- main commit: `20266494efd3a8d3a97c3ea9335c672e20fe7fa5`
- functional tree: `6f81f55269031e0ec6467cd60283593dd5b7c2d3`
- integrated acceptance: CI Validation `#784` — success
- freeze policy: `docs/backend-freeze.md`
- machine freeze record: `artifacts/ui-handoff/backend-freeze-manifest.json`

Historical backend documents remain valid as historical evidence, but they must not override the frozen implementation or this handoff package.

## Frontend repository boundary

The production ELCEO UI is planned to be implemented in a **separate frontend repository** from `Elceo-Mi`.

`Elceo-Mi` remains the backend/source-contract repository and retains the canonical handoff because it owns the frozen API/runtime truth: routes, schemas, DTOs, authentication and authorization rules, state ownership, billing/payment truth, notification behaviour, and server-owned cognition.

The UI page inventory and the other files in this directory are therefore **implementation contracts for the separate UI repository**, not an instruction to build the complete production frontend inside `Elceo-Mi`.

Existing UI/prototype code in this repository may be used as implementation evidence or migration reference, but repository separation remains the target architecture. Any backend change later discovered to be necessary for the UI must be handled as an explicit contract change in `Elceo-Mi`, not hidden inside frontend-owned logic.

## Start here

1. **API explorer:** `docs/ui-handoff/api-explorer.html`
2. **Machine API contract:** `artifacts/ui-handoff/openapi.json`
3. **Canonical route inventory:** `artifacts/ui-handoff/route-inventory.json`
4. **Generated counts/coverage:** `artifacts/ui-handoff/handoff-summary.json`
5. **Mock payloads:** `artifacts/ui-handoff/mocks/`
6. **Canonical UI page/surface inventory:** `docs/ui-handoff/ui-page-inventory.md`
7. **UI states:** `docs/ui-handoff/ui-state-matrix.md`
8. **Validation rules:** `docs/ui-handoff/validation-and-field-rules.md`
9. **Auth/session/authorization:** `docs/ui-handoff/auth-session-and-authorization.md`
10. **State ownership:** `docs/ui-handoff/state-ownership.md`
11. **Frontend integration map:** `docs/ui-handoff/frontend-integration-map.md`
12. **Billing/payment UI contract:** `docs/ui-handoff/billing-payment-state-machine.md`
13. **Notifications UI contract:** `docs/ui-handoff/notifications-ui-contract.md`
14. **Explicit unresolved documentation limits:** `docs/ui-handoff/contract-gaps.md`

## Source-of-truth order

When two documents appear to disagree, use this order:

1. frozen route/runtime code at the freeze commit;
2. `@elceo/types` and `@elceo/schemas` contracts used by that code;
3. canonical route-policy inventory and runtime tests;
4. generated `artifacts/ui-handoff/*` files;
5. this handoff documentation;
6. older phase/audit documents.

Do not change backend behavior simply to make a UI assumption work.

## Browser-safe vs server-only

The generated inventory classifies each operation by UI audience and whether it is browser-safe.

- `user_ui`: browser-facing authenticated/user API surface.
- `auth_framework`: Auth.js-owned browser/session boundary.
- `admin_server_bridge`: admin UI may consume the capability, but requests requiring `x-elceo-internal-token` must be made through trusted server-side code. Never expose that token to browser JavaScript.
- `super_admin_server_bridge`: same server mediation plus super-admin/step-up requirements.
- `server_internal`: never called directly by the browser.
- `provider_webhook`: external provider callback surface, not a UI API.

A UI component must not infer browser safety from the URL name alone.

## Session/authentication model

ELCEO uses Auth.js/NextAuth with JWT sessions. The frozen config has a seven-day session maximum age and six-hour update age. Google authentication is enabled only when configured; credential authentication is enabled only when its activation prerequisites are satisfied. Identity, role, plan tier and onboarding state are derived server-side.

The browser may present the Auth.js-managed session cookie, but must never manufacture `userId`, `subjectId`, role, plan tier, entitlement decisions or admin authority.

## Server-owned intelligence

The UI is a **passive consumer** of server-owned intelligence. It must not recreate or recompute:

- directional bias;
- confidence totals or confidence decomposition;
- contradiction/tension state;
- evidence sufficiency;
- source authority/quorum decisions;
- freshness/vintage decisions;
- FX base/quote relative-pressure logic;
- entitlement decisions;
- billing truth;
- provider/live-readiness truth.

The chart/dashboard response is a materialized server DTO. Render it; do not rebuild cognition from raw evidence in the browser.

## Error envelope

The canonical application envelope is:

```text
success: { ok: true, data, meta? }
error:   { ok: false, error: { code, message, details? } }
```

Canonical application error codes include unauthorized, forbidden, bad_request, validation_error, not_found, conflict, unprocessable_entity, dependency_failed, payload_too_large and internal_error. Some framework/specialized routes (notably Auth.js and dashboard-specific handlers) return handler-specific JSON; the generated inventory marks those response contracts instead of pretending they use the standard envelope.

## Mutations and idempotency

Where the generated inventory marks `idempotency: required`, the UI must provide a stable `Idempotency-Key` for one logical user action and reuse that key only for a retry of that same logical action. Do not create a new key merely because the network response was ambiguous; that can defeat duplicate protection.

Server replay semantics are authoritative. The client must not locally assume a write failed solely because the HTTP connection failed.

## Deployment blockers are not UI contracts

A route/provider may exist while live activation remains blocked by credentials, entitlement, provider certification, licensing, staging verification or deployment configuration. The UI must render the server's readiness/degraded state rather than converting code existence into a claim of live availability.

## Regeneration and synchronization

The exhaustive route/OpenAPI artifacts are generated from the frozen route files and `buildRouteInventory()`.

Use:

```bash
npm run generate:ui-handoff
npm run check:ui-handoff
```

`check:ui-handoff` fails on route/OpenAPI drift, internal routes marked browser-safe, stale generated files, malformed mocks, secret-like mock values, freeze-baseline mismatch, or stale fixture-era handoff language.

When the separate production UI repository is created, record which backend freeze commit/tree its integration targets. If the backend freeze later changes, deliberately resynchronize the handoff instead of allowing the repositories to drift implicitly.

## UI implementation rule

If a requested screen needs data that is not represented in the frozen API/DTO contract, log the exact missing contract. Do **not** invent a client-owned substitute and do not silently expand backend semantics inside UI work.
