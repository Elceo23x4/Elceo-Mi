# Validation and Field Rules

This document is a frontend integration guide, not a replacement for `@elceo/schemas`, route-local validators, or server authorization.

## General rules

- Treat route validators and shared schemas as authoritative.
- Do not send server-owned identity fields when the route derives them from session/auth context.
- Do not assume a field is optional, nullable, bounded or enum-valued unless the actual validator/type says so.
- Do not infer API constraints from database column widths alone.
- Reject or surface validation failures exactly as returned by the API; do not silently coerce unsupported values.

## Common envelope

Success:

```json
{ "ok": true, "data": {}, "meta": {} }
```

Error:

```json
{ "ok": false, "error": { "code": "validation_error", "message": "...", "details": [] } }
```

Common mappings documented by the backend include 400, 401, 403, 404, 409, 422, 424 and 500. A specific route may expose only a subset.

## Query/pagination

Where a route exposes `limit`, cursor or history pagination, use only the server-documented defaults/maxima. Do not hard-code a global pagination maximum across unrelated route families. The route validator remains authoritative.

## Identifiers

- User/subject identity is server-derived for user-owned routes.
- Path identifiers such as `caseId`, `positionId`, `entryId`, `subscriptionId`, `targetId` and admin `userId` must be treated as opaque identifiers.
- Never derive authorization from identifier shape.

## Idempotency

Protected mutation routes may require/use idempotency through the shared security boundary. The browser must preserve the same key for a retry of the same logical mutation and use a new key only for a genuinely new operation. Do not retry ambiguous billing/payment mutations by generating a fresh key automatically.

## Date/time

Use ISO-8601 strings where the backend emits/validates timestamps. Preserve UTC/offset semantics from the payload and localize only for display.

## Market assets

Use canonical backend asset identifiers. Launch tradables remain the supported trading universe; DXY/VIX are represented according to the final backend taxonomy and must not be silently relabeled into a different tradability role by the UI.

## Server-owned fields

The browser must never claim or override:

- authenticated subject/user identity;
- entitlement result;
- admin/super-admin permission;
- payment confirmation/reconciliation truth;
- confidence score/band;
- directional bias;
- contradiction/tension state;
- evidence authority/sufficiency;
- freshness classification;
- provider activation state.

## Source of exact constraints

For any field not explicitly enumerated here, inspect the route's `x-elceo-source` in `artifacts/ui-handoff/openapi.json`, then follow its imported validator/type. `openapi.json` intentionally marks unproven request fields as generic rather than inventing constraints.
