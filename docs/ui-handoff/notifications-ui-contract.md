# Notifications UI Contract

Notification UI consumes server-owned notification state and must remain separate from internal dispatch/provider operations.

## User-visible surfaces

- summary;
- inbox;
- targets;
- subscriptions;
- verification issue/consume flow;
- health/degraded delivery state;
- notification preference/account surfaces where exposed.

## Ownership

Inbox items, target enablement, subscriptions, verification state and delivery health are server-authoritative. The client may keep optimistic presentation state only until the API response returns; server truth wins.

## Read states

- ready: render inbox/summary/targets/subscriptions;
- empty: valid zero-notification or zero-subscription state;
- degraded: server health indicates delivery/provider degradation;
- unauthorized/forbidden: remove protected surface and follow auth/access flow;
- stale: preserve server freshness metadata if supplied.

## Mutations

Target, subscription and verification mutations are protected by the route security layer. Where idempotency/replay applies, retry the same logical operation with the same idempotency semantics rather than creating duplicate subscriptions/verification requests.

## Verification

Verification state must not be inferred from client-side code. The issue/consume result returned by the server is authoritative. UI should render expired, invalid, consumed or verified outcomes according to the server response.

## Delivery health

Delivery/provider health can be degraded even when inbox state is available. The UI may communicate that external delivery is delayed/unavailable while still rendering in-app server state.

## Internal-only boundary

Dispatch, expiry processors, feedback processors and provider-facing operations are server/internal concerns. Public browser code must not call internal/ops dispatch routes or receive internal provider credentials.

## Retry/feedback

- Safe reads may be retried with bounded UX behavior.
- Mutation retries must preserve idempotency semantics where supported.
- Provider delivery retry decisions are server-owned; UI does not independently resend provider messages.
- Feedback/diagnostic processing remains an internal operation unless a dedicated user-facing route explicitly exposes a safe action.
