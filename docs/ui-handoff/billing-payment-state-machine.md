# Billing and Payment UI State Machine

Billing/payment truth is server-owned. The UI must not equate a redirect, network response, browser return URL or local plan selection with entitlement activation.

## Browser-safe billing snapshot

`GET /api/account/billing` returns the standard success envelope containing `snapshot: AccountBillingSnapshotDto`.

The DTO is an explicit browser allowlist and intentionally excludes provider customer/subscription identifiers.

```text
snapshot.generatedAt
snapshot.plan.kind
snapshot.plan.accountState
snapshot.plan.startedAt
snapshot.plan.endsAt
snapshot.plan.trialEndsAt
snapshot.subscription?.state
snapshot.subscription?.currentPeriodStart
snapshot.subscription?.currentPeriodEnd
snapshot.subscription?.trialEndsAt
snapshot.subscription?.canceledAt
snapshot.subscription?.willCancelAtPeriodEnd
```

Canonical lifecycle subscription states include:

`trialing | active | past_due | paused | canceled | incomplete | incomplete_expired`

The UI renders these states. It does not derive them from checkout history.

## Checkout initiation

`POST /api/billing/checkout` is a specialized payment route, not the generic `{ok:true,data}` application envelope.

Frozen request behavior includes:

- target plan must be `focus_plan`;
- billing interval accepts `monthly` by default and supports `quarterly` or `yearly` in the frozen handler;
- provider selection supports `stripe` or `korapay` under server/provider-mode policy;
- currency and rail are server/provider-capability inputs;
- the logical checkout requires a business idempotency key;
- valid idempotency keys are 8–255 characters and limited to `[A-Za-z0-9._:-]`;
- the body is limited to 16 KiB;
- payment readiness is evaluated before provider initiation;
- commercial price/version is resolved server-side.

The UI must not send provider secrets, provider customer IDs, amount overrides or entitlement outcomes.

## Idempotency / duplicate-billing rule

One user click/intent = one business idempotency key.

Reuse the same key when retrying that exact checkout after a network timeout or uncertain response. Do **not** generate a fresh key merely because the HTTP request was ambiguous.

The backend can reuse an existing operation and checks that a reused idempotency key is not being applied to incompatible provider/currency/interval input.

If the server reports an idempotency input mismatch, stop and resolve/re-read the existing operation. Do not bypass the conflict with automatic key rotation.

## Payment operation lifecycle

The frozen payment runtime explicitly models operation states including:

- `created`;
- `pending_provider`;
- `processing`;
- `succeeded`;
- `failed`;
- `unknown`;
- `reconciliation_required`.

Provider errors are normalized. If a provider may have accepted the request or the outcome is unknown, the backend moves toward `unknown` / `reconciliation_required` rather than falsely declaring failure.

**UI implication:** an unknown result is not safe to present as “payment failed — try again with a new payment.” Show a reconciling/uncertain state and read authoritative billing/payment state.

## Checkout response

The checkout handler can return HTTP `202` with a payment operation. In provider modes it can include a `checkoutUrl`. The response also exposes readiness flags such as `liveActivation`, `sandboxOnly`, `productionLive`, `providerMode` and whether the operation was reused.

Treat `202` as operation accepted/initiated, not entitlement granted.

Redirect to a provider checkout only when the server returns a usable `checkoutUrl`. Never construct provider checkout URLs client-side.

## Readiness / blocked activation

Payment readiness can return `403` with a reason when required user/commercial prerequisites are missing.

The frozen backend can also deliberately block production/live payment activation when environment/provider capability/certification is not present. This is a legitimate server state, not a frontend error to bypass.

The UI must distinguish:

- product access unavailable because the user is not eligible;
- checkout structurally available but live provider activation blocked;
- sandbox/testing provider mode;
- production provider mode explicitly enabled by the server.

## Network/provider ambiguity

Examples that require reconciliation rather than blind retry:

- connection drops after provider acceptance;
- provider returns a 5xx after accepting the request;
- browser closes during checkout;
- webhook arrives late or out of order;
- process restart after provider success but before local finalization.

The backend's persisted operation/reconciliation state is authoritative.

## Entitlement activation

A successful checkout browser response does not grant Focus Plan locally. Entitlements are server-owned and must be read from the account entitlement/billing APIs after the canonical payment/reconciliation path updates them.

Never unlock premium UI solely because:

- provider redirect returned to `/settings`;
- query string says success;
- checkout returned a URL;
- local payment component saw a success callback.

## Billing lifecycle presentation

Recommended interpretation of the frozen server states:

| Server state | UI meaning |
|---|---|
| `trialing` | Trial is active; display authoritative trial end timestamp. |
| `active` | Subscription active for the server-owned current period. |
| `past_due` | Payment/account issue; premium behavior follows entitlement policy, not client guess. |
| `paused` | Subscription paused. |
| `canceled` | Subscription canceled; use period/end/account state to determine presentation. |
| `incomplete` | Subscription setup/payment incomplete. |
| `incomplete_expired` | Incomplete subscription expired. |
| payment `processing` | Provider operation in progress. |
| payment `unknown` | Outcome ambiguous; reconciliation required before retry decisions. |
| `reconciliation_required` | Backend must reconcile provider/local truth. |
| payment `failed` | Operation failed according to canonical backend state. |
| payment `succeeded` | Payment operation succeeded; still read canonical entitlement/billing state for product access. |

## Cancellation / expiry / pause / resume

Administrative billing transitions exist on protected admin/internal surfaces. User-facing UI should consume the resulting account billing/entitlement state rather than calling internal/admin mutation endpoints directly.

`willCancelAtPeriodEnd` is explicitly exposed in the browser-safe billing DTO and should be presented without inventing an immediate cancellation when the current period is still active.

## Security boundary

Admin billing/reconciliation/provider-event routes can require internal token and admin permissions. They are server-internal/admin-control-plane APIs, not browser payment APIs.

Never place `x-elceo-internal-token`, provider secrets or provider identity payloads in frontend code.

## Failure UX

For write failures:

1. preserve the logical idempotency key;
2. inspect/read authoritative operation/billing state;
3. show `processing`, `unknown/reconciling`, `failed` or `succeeded` according to the server;
4. only initiate a new logical checkout after the server state makes that safe.

This ordering is required to preserve the backend's double-billing protections.
