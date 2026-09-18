# Contract Gaps and Deliberate Limits

This file records where the final handoff intentionally stops rather than inventing stronger contracts than the frozen backend proves.

## OpenAPI field precision

The route/method set is mechanically generated from the frozen API tree and is exhaustive. The OpenAPI layer intentionally does **not** fabricate detailed request-body fields for every endpoint when those constraints live only in imported TypeScript validators/types and are not safely extractable by the documentation generator.

For those routes:

1. `x-elceo-source` identifies the authoritative handler;
2. the imported validator/type is the source of field-level truth;
3. `validation-and-field-rules.md` documents the frontend rule not to infer missing constraints.

This is a documentation precision limit, not a backend defect.

## External-provider activation

Some provider/payment capabilities can remain fail-closed pending environment credentials, entitlements, licensing/legal review, staging probes or production certification. The handoff represents those states as blocked/degraded/environment-required and does not claim live activation.

## Admin browser boundary

Admin/super-admin routes are documented as UI surfaces for product integration planning, but many require the internal server boundary. The browser must not receive the internal API token. Admin UI integration therefore requires a server-mediated path in deployment architecture.

## Historical fixture contracts

The old C6-A10 mock module is preserved for history but is not the final contract authority. The current deterministic handoff mocks under `artifacts/ui-handoff/mocks/` are integration examples tied to the frozen backend handoff, not live provider payloads.

## Future defect handling

If UI implementation discovers a contradiction between these handoff artifacts and the frozen runtime, the runtime remains authoritative until the discrepancy is investigated. Do not silently change either side. Record the exact route/schema/runtime evidence and reopen backend work only as an objective defect correction.
