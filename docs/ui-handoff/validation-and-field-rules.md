# Validation and Field Rules

The UI must use the frozen validators and request DTOs rather than maintaining a second independent validation model. Client validation is a UX aid; server validation remains authoritative.

## Canonical authorities

- Request/response DTOs: `packages/types/src/app-api.ts` plus domain type files.
- Runtime validators: `packages/schemas/src/**`.
- JSON/body/query parsing and application error mapping: `apps/web/lib/server/api/http.ts`.
- Exhaustive per-route validator references: generated `artifacts/ui-handoff/route-inventory.json`.
- Route security/ownership/entitlement classification: `apps/web/lib/server/access/route-policy-inventory.ts`.

If the generated inventory says a field constraint is unspecified, do not invent a minimum/maximum merely for UI convenience.

## Standard JSON body limits

The frozen HTTP helper defines these reusable limits:

| Policy | Bytes |
|---|---:|
| `standard` | 65,536 (64 KiB) |
| `compact` | 16,384 (16 KiB) |
| `authentication` | 8,192 (8 KiB) |

Individual handlers may explicitly pass a limit. For example, journal-case and portfolio-watchlist writes use 64 KiB. The server checks declared `Content-Length` where present and also counts streamed bytes, returning `payload_too_large` / HTTP 413 when the enforced limit is exceeded.

Malformed/absent JSON on a route that requires JSON maps to `bad_request:invalid_json` and the canonical bad-request envelope.

## Positive integer query limits

`parsePositiveInt(value, fallback, max)` accepts only `/^[1-9]\d*$/`, requires a safe integer, and rejects values above the route's explicit maximum.

Examples from the frozen routes:

- journal case list: default `50`, maximum `200`;
- portfolio watchlist list: default `50`, maximum `200`.

Do not send `0`, negatives, decimals, scientific notation or values above the route cap.

## Canonical application error mapping

| Error code | HTTP |
|---|---:|
| `unauthorized` | 401 |
| `forbidden` | 403 |
| `bad_request` | 400 |
| `validation_error` | 400 |
| `not_found` | 404 |
| `conflict` | 409 |
| `unprocessable_entity` | 422 |
| `dependency_failed` | 424 |
| `payload_too_large` | 413 |
| `internal_error` | 500 |

`validation_error` can carry deterministic `details[]`. The UI may map those details to fields when the route/schema makes the mapping clear; otherwise display a form-level validation message.

## Idempotency

The generated route inventory marks which mutations require idempotency. For those operations:

- send an `Idempotency-Key` for one logical mutation;
- preserve the same key across transport retries of that same logical mutation;
- never reuse that key for a different mutation/body;
- after an ambiguous timeout, prefer idempotent replay/readback rather than issuing a fresh key immediately.

The server owns request hashing, replay storage and conflict decisions.

## Subject/user identifiers

User-scoped browser routes derive the authenticated subject server-side. The browser must not supply or override `subjectId` to select another user's state.

Admin/internal routes that intentionally operate on another subject validate/use a target `subjectId` under internal/admin authorization. Those routes are not browser-safe when the internal-token boundary is required.

## Assets and diagnostics

The frozen launch-tradable universe is:

`xau_usd`, `nasdaq_100`, `sp500`, `de30`, `btc_usd`, `eur_usd`, `gbp_usd`, `usd_jpy`, `usd_chf`, `aud_usd`, `nzd_usd`, `usd_cad`.

`dxy` and `vix` are reasoning/diagnostic assets in the frozen taxonomy; do not silently present them as launch-tradable instruments.

The dashboard route uses the user's server-side watchlist to resolve the requested asset. The UI should use canonical symbols and not assume an arbitrary path string will be honored.

## Timeframes

Application DTOs use canonical timeframe values defined by the domain types. The commonly exposed trading-analysis set is `M5`, `M15`, `H1`, `H4`, `D1`; route-specific validators remain authoritative.

## Representative write DTOs

The following shapes are defined in `packages/types/src/app-api.ts`. Fields marked optional here are genuinely optional in the type, but runtime schemas may impose additional enum/range/format rules.

### Journal draft

Required: `asset`, `timeframe`, `title`.

Optional: `direction`, `setupType`, `conviction`, `thesis`, `linkedReasoningRunId`, `linkedSnapshotId`, `linkedDriftId`.

### Journal execute

Required: `openedAt`.

Optional: `entryPriceExecuted`, `positionSize`, `notes`, `executionQuality`.

### Journal close

Required: `closedAt`, `outcome`.

Optional: `exitPrice`, `pnlAmount`, `pnlPercent`, `rMultiple`, `closureReason`.

### Portfolio watchlist create

Required: `asset`, `timeframe`, `priority`.

Optional: `status`, `thesisHealth`, `note`, reasoning/snapshot/drift/journal linkage IDs.

### Position create

Required: `asset`, `timeframe`, `direction`.

Optional: entry/stop/take-profit levels, size, thesis health, linkage IDs and note.

### Notification target create

Discriminated union:

- email: `{ channel:'email', email, label? }`;
- push: `{ channel:'push', subscriptionId, label? }`;
- in-app: `{ channel:'in_app', label? }`.

### Notification verification

Issue: `{ targetId }`.

Consume: `{ targetId, token }`.

The verification token is user-entered/transient data. Do not persist it to analytics/logging/client durable storage.

## Billing browser DTO

The browser-safe account billing DTO intentionally excludes provider customer identity and provider subscription identity. It contains only:

- `generatedAt`;
- `plan.kind`;
- `plan.accountState`;
- `plan.startedAt`;
- `plan.endsAt`;
- `plan.trialEndsAt`;
- optional `subscription.state`;
- `currentPeriodStart` / `currentPeriodEnd`;
- `trialEndsAt`;
- `canceledAt`;
- `willCancelAtPeriodEnd`.

Do not add provider IDs to UI state by querying internal/admin APIs.

## Dates/times

The domain generally uses ISO date/time strings. Do not convert persisted/server identifiers or reference periods into local time before sending them back to mutation APIs. Use local formatting only for presentation.

## Fields the client must never author as truth

The browser must not author or override:

- authenticated `userId` / owner `subjectId`;
- role/admin authority;
- plan tier or entitlement decision;
- billing lifecycle truth;
- provider/live-activation readiness;
- evidence authority/freshness/vintage;
- directional bias;
- confidence totals/decomposition;
- contradiction/tension results;
- server materialization IDs/timestamps except where an explicit request DTO asks for a linkage ID.

## Generated per-route rules

`artifacts/ui-handoff/route-inventory.json` records, for every frozen route, the path/methods, path parameters, query parameters discovered in the handler, referenced validators, explicit statuses, idempotency requirement, internal-token/admin/step-up requirements and source path.

That generated inventory is the exhaustive route-level companion to this human-readable rules sheet.
