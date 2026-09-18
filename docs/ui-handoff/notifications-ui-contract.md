# Notifications UI Contract

Notification state is owner-scoped and server-authoritative. User-facing notification reads and preferences are separate from internal/provider dispatch operations.

## User-facing read surfaces

### `GET /api/notifications/summary`

Protected by notification feature access plus the commercial entitlement gate. Returns the standard success envelope with:

- `managementSummary`;
- `feedbackSummary`;
- `inboxUnreadCount` (mirrors the management summary's unread count).

Use this as the compact notification status/header-badge source. Do not calculate unread totals by merging unrelated client caches.

### `GET /api/notifications/inbox`

Authenticated owner-scoped read.

Query:

- `limit` defaults to `50`;
- maximum `200`;
- must be a positive integer.

Returns `{ ok:true, data:{ inbox } }`.

Treat fewer returned items than the requested limit as the end of the currently available list unless another route-specific pagination signal is returned. Do not invent cursors.

### Targets / subscriptions / health

The frozen API includes read surfaces for delivery targets, subscriptions/preferences and notification health. Use the generated route inventory for exact paths/methods and access classification.

## Delivery targets

Targets represent server-owned notification destinations. The request DTO supports:

- email target: `{ channel:'email', email, label? }`;
- push target: `{ channel:'push', subscriptionId, label? }`;
- in-app target: `{ channel:'in_app', label? }`.

Target creation and enable/disable operations are protected writes. The UI can present the resulting state but must not mark an unverified target as verified merely because a form was submitted.

## Subscriptions / preferences

Notification subscription requests can include:

- `channel`;
- optional `decisionKind`;
- optional `minimumPriority`;
- optional `minimumMaterialityScore`;
- optional `isEnabled`.

PATCH on a subscription accepts the mutable preference subset defined by the frozen request validator.

Use server-returned preference state after save. Avoid maintaining a separate client preference model that can drift from backend rules.

## Verification

Verification mutation DTOs are:

- issue: `{ targetId }`;
- consume: `{ targetId, token }`.

Verification tokens are transient secrets/user proof. Do not persist them in analytics, client durable storage or mock payloads.

Recommended UI flow:

1. create/select target;
2. request verification if the target/channel requires it;
3. show challenge-issued state;
4. submit token to the consume route;
5. re-read target state;
6. only then present the target as verified/enabled according to server truth.

## Delivery / provider operations

`/api/notifications/delivery/dispatch` and operational feedback/expiry routes are server/internal operations. They can require the internal token and mutation-security controls. They are **not** browser APIs.

The browser must never attempt to send email/push/WhatsApp by calling a provider directly as a substitute for ELCEO's notification runtime.

## Health and degraded state

Notification delivery can be degraded even when preference records are healthy. Keep these concepts separate:

- preference/target configured;
- target verified;
- subscription enabled;
- notification decision created;
- message queued/outbox state;
- provider delivery attempt;
- delivery receipt/feedback;
- channel/provider health.

The UI should show server-provided health/degraded state where exposed rather than inferring provider health from the age of the inbox.

## User-visible vs internal state

User UI may display:

- inbox items;
- unread count;
- configured targets;
- target verification/enabled state;
- subscription preferences;
- safe health/degraded information exposed by user routes.

User UI must not expose:

- provider credentials;
- internal-token values;
- raw provider webhook payloads;
- internal outbox lock/lease details;
- server-only retry metadata unless explicitly projected for UI;
- cross-user notification records.

## Mutation reliability

Protected notification mutations can use idempotency/security decisioning. For one logical write, preserve its idempotency key across transport retries. A timeout does not prove the target/subscription/verification write failed; read back canonical state before issuing a different logical mutation.

## Channel availability

The backend models notification channels/capabilities independently of live provider activation. A configured UI option must not imply that its external transport is production-certified. Render live/degraded/blocked capability according to server state.
