# Billing and Payment UI State Machine

Billing/payment truth is server-authoritative. The UI must never mark a payment successful or entitlement active merely because a browser redirect, provider page or network response appeared successful.

## Canonical UI states

| State | Meaning | UI behavior |
|---|---|---|
| inactive | No active paid lifecycle | Show eligible plan/readiness actions only. |
| trial | Trial lifecycle active | Show trial status/end date from server. |
| active | Canonical billing state is active | Render active plan/entitlements from server. |
| pending | Payment/lifecycle transition not yet final | Show pending state; do not duplicate payment initiation. |
| reconciliation_required | Provider/runtime state needs reconciliation | Poll/read canonical billing or reconciliation state; no client repair. |
| past_due | Billing lifecycle is overdue | Show restricted/collection state according to server entitlement result. |
| cancel_at_period_end | Cancellation scheduled | Keep current server-granted access until server expiry transition. |
| paused | Lifecycle paused | Display paused state and allowed server action if exposed. |
| expired | Entitlement/billing period ended | Render server access decision; do not locally extend access. |
| failed | Server has a definitive failed operation | Offer deliberate retry only when route/state allows it. |
| ambiguous_network_outcome | Client lost response/timeout | First re-read canonical billing/provider/reconciliation state. Never auto-create a new payment attempt. |
| live_activation_blocked | Provider/checkout activation intentionally fail-closed | Explain unavailable environment/provider readiness. No bypass. |

## Idempotency and duplicate prevention

For the same logical mutation, preserve the same idempotency key where the route security contract uses one. A network timeout is not proof the server failed. Before a new payment attempt, fetch canonical account billing/reconciliation state.

Idempotent replay may return the previously stored result. Treat that as authoritative rather than issuing another charge/transition.

## Frontend sequence

1. Read `/api/account/billing` and relevant entitlement/access state.
2. If checkout/payment initiation is permitted, request only through the canonical billing route.
3. Render pending/blocked/readiness result returned by the server.
4. After callback, webhook delay or network ambiguity, re-read server billing/reconciliation state.
5. Enable paid UI only from server entitlement/access decision.

## Admin lifecycle controls

Admin billing routes expose controlled lifecycle operations such as trial, activate, renew, change plan, past-due, cancel-at-period-end, expire, pause/resume and reconciliation/orchestration operations where implemented. These are internal/admin operations and are not ordinary user-browser mutation APIs.

## Provider activation caveat

The frozen backend can be complete while a provider remains deployment/staging blocked. UI must represent `environment_verification_required` or blocked activation accurately. Do not label KoraPay, Stripe or another provider as production-active unless the runtime/environment actually proves that state.
