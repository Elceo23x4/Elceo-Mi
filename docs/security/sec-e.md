# SEC-E canonical API boundary

Base: `305175368a464e13d281d0f6d64d2cb478019efe`.

## Pre-change inventory and disposition

The five legacy route files were `app-state/{me,onboarding,settings,watchlist,alerts}/route.ts`. `me` read the complete application state; onboarding, settings and watchlist mutated the user-state repository through independently-created `ApplicationStateService` instances; alerts read state and marked an alert read. Browser consumers were `OnboardingFlow`, `SettingsShell`, `PortfolioShell`, and `InAppAlertsTray`; there were no server consumers. They now use, respectively, `/api/account/onboarding`, `/api/account/preferences`, `/api/account/watchlist`, and `/api/notifications/alerts`. `/api/account/state` is the canonical replacement for `me`. All legacy files were removed.

Security actor construction occurred in admin commercial, admin entitlement, admin billing, internal billing, internal Tiingo, notification dispatch, and notification operations mutation routes. Each now consumes the branded principal returned by `requireInternalRouteAccess`. Request hashing is centralized in `route-security.ts` and is used for security evaluation and idempotency completion response hashes.

Direct `request.json()` calls in deployed routes were the five legacy app-state routes, password reset confirmation, legacy journal entries, and billing checkout. Ordinary routes now use the bounded parser. Signed payment webhooks intentionally retain raw-body handling before signature verification in `billing-webhook-handler.ts`; this is the sole raw-body exception and is not an ordinary JSON route.

List endpoints backed by persisted data are portfolio positions/actions/watchlist (maximum 200), journal cases (200), refresh history (200), workspace history (100), notification inbox (200), and account access decisions (100). Their repository methods receive the validated bound; limits above the maximum now fail rather than clamp. Missing limits preserve existing defaults.

Browser billing surfaces are `/api/account/billing`, policy, events and reconciliation-runs; this batch changes the lifecycle snapshot boundary only. Admin/internal billing surfaces retain operational provider data.

## Transport constraints

| Field/family | Previous | Bound | Rationale | Error |
|---|---:|---:|---|---|
| Ordinary JSON bodies | unbounded | 64 KiB | defensive API transport maximum | `413 payload_too_large` |
| Compact account state mutations | unbounded | 16 KiB | boolean settings and short asset lists | `413 payload_too_large` |
| Password reset confirmation | unbounded | 8 KiB | two credentials only | `413 payload_too_large` |
| Asset symbol | unbounded | 32 characters | defensive symbol transport maximum | `400 validation_error` |
| Account asset arrays | unbounded | 50 entries | defensive transport ceiling; plan enforcement remains authoritative | `400 validation_error` |
| Alert identifier | unbounded | 128 characters | defensive identifier maximum | `400 validation_error` |
| Idempotency key | unbounded in shared security helper | 8–255 safe characters | established checkout contract | `400 validation_error` |
| Persisted list limit | partial integers and clamping | full decimal integer, route max 100/200 | existing route maxima | `400 bad_request` |

No field is silently truncated. Business-plan tracked-asset limits remain separate from the transport ceiling.

## Browser billing allowlist

`AccountBillingSnapshotDto` includes only `generatedAt`, plan `kind/accountState/startedAt/endsAt/trialEndsAt`, and subscription `state/currentPeriodStart/currentPeriodEnd/trialEndsAt/canceledAt/willCancelAtPeriodEnd`. Customer identity, email, provider identity, reconciliation IDs, and provider event IDs cannot be represented by the DTO mapper.
