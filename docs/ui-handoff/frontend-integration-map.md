# Frontend Integration Map

This document maps UI surfaces to the frozen backend. It does not prescribe visual design. The exhaustive route list is `artifacts/ui-handoff/route-inventory.json`; this file identifies the primary integration path for each product surface.

| UI surface | Primary backend contract | Read / mutation | Access boundary | Server-owned DTO/state | Required UI states |
|---|---|---|---|---|---|
| Authentication | `/api/auth/{...nextauth}` | framework read/mutation | Auth.js | JWT session + server-derived profile claims | signed-out, authenticating, signed-in, auth failure |
| Dashboard / chart | `GET /api/dashboard/{asset}` | read | authenticated; commercial projection resolved server-side | `DashboardChartWorkspaceViewModel` or `KickOffDashboardViewModelV1` | loading, ready, entitlement denied, 429, 503 unavailable |
| Directional bias | contained in Focus Plan dashboard cognition projection | read | Focus Plan server projection | `dashboard.directional_bias` | ready, degraded/unavailable through parent dashboard |
| Confidence context | contained in dashboard cognition projection | read | Focus Plan server projection | `confidence_total`, `confidence_anatomy` | ready, caution/degraded according to server data |
| Evidence stack / evidence notes | contained in dashboard projection and relevant evidence surfaces | read | server materialization / entitlement | evidence IDs/notes/annotations | ready, empty, stale/degraded |
| Chart zones/annotations | contained in dashboard chart DTO | read | same as dashboard | candles, H4 zones, annotations, default filters | loading, ready, empty annotations |
| Workspace overview | `GET /api/workspace/current` | read | authenticated / focus-plan policy | latest workspace snapshot | loading, ready, empty/no snapshot, stale/degraded |
| Workspace refresh | `POST /api/workspace/refresh` | mutation | authenticated + entitlement + mutation security | refresh result/new snapshot lifecycle | idle, pending, replayed success, validation/conflict/failure |
| Workspace freshness/history/agenda | `/api/workspace/freshness`, `/history`, `/agenda` | read | authenticated | server freshness/history/agenda projections | loading, ready, empty/end-of-list |
| Journal cases | `GET|POST /api/journal/cases` | read + mutation | authenticated; journal policy; POST mutation security | journal case records | loading, empty, list, create pending, validation/conflict |
| Journal case detail | `GET /api/journal/cases/{caseId}` | read | owner-scoped | canonical case | loading, ready, not found |
| Journal lifecycle | `/plan`, `/execute`, `/adjust`, `/partial-close`, `/close`, `/cancel`, `/review` under case ID | mutation | owner-scoped + mutation security | canonical lifecycle transition | pending, success/replay, invalid transition, conflict |
| Journal influence/deep generation | `/api/journal/influence/latest`, `POST /api/journal/influence/generate` | read + mutation | focus-plan/commercial boundary | server analysis snapshot | loading, empty, ready, generation pending/degraded |
| Portfolio watchlist | `GET|POST /api/portfolio/watchlist` and item routes | read + mutation | feature permission + premium commercial boundary | watchlist entries | loading, empty, ready, mutation pending/conflict |
| Portfolio positions | `/api/portfolio/positions` and lifecycle routes | read + mutation | feature permission + premium commercial boundary | position records | loading, empty, ready, transition pending/conflict |
| Portfolio action queue | `/api/portfolio/actions` and item routes | read + mutation | feature permission + premium commercial boundary | action items | loading, empty, ready, mutation pending |
| Portfolio snapshot/attention | portfolio snapshot/attention routes from generated inventory | read/generate | premium entitlement | server portfolio projection | loading, ready, stale, generation pending |
| Analytics | `GET /api/analytics/latest`, `POST /api/analytics/generate` | read + mutation | `analytics.*` feature + premium commercial gate | analytics snapshot | loading, empty, ready, generate pending, entitlement blocked |
| Coaching | `GET /api/coaching/latest`, `POST /api/coaching/generate` | read + mutation | `coaching.*` feature + premium commercial gate | coaching snapshot | loading, empty, ready, generate pending, entitlement blocked |
| Notifications summary | `GET /api/notifications/summary` | read | notification feature + premium commercial gate | management summary, feedback summary, unread count | loading, ready, degraded, entitlement blocked |
| Notification inbox | `GET /api/notifications/inbox` | read | owner-scoped notification access | inbox records | loading, empty, ready, pagination/end |
| Notification targets | `/api/notifications/targets` + enable/disable routes | read + mutation | owner-scoped; protected writes | delivery targets | loading, empty, verification needed, enabled/disabled, mutation pending |
| Notification subscriptions/preferences | `/api/notifications/subscriptions` + item PATCH | read + mutation | owner-scoped; protected writes | subscription preferences | loading, ready, mutation pending/conflict |
| Notification verification | `/api/notifications/verification/issue`, `/consume` | mutation | owner-scoped mutation security | server verification state | idle, challenge issued, verifying, success/failure/expired |
| Account entitlements | `GET /api/account/entitlements` | read | authenticated owner | account entitlement state + current profile | loading, ready, unauthorized |
| Usage/access decisions | `/api/account/usage`, `/access-decisions`, `POST /access-check` | read/check | authenticated owner | server commercial/access decisions | loading, ready, forbidden/denied |
| Account billing | `GET /api/account/billing` | read | authenticated owner | browser-safe `AccountBillingSnapshotDto` | loading, trialing/active/past-due/paused/canceled/etc. |
| Checkout/payment readiness | billing checkout/portal/session routes in generated inventory | mutation/readiness | payment readiness; live activation can remain blocked | server payment readiness/result | unavailable, ready-to-initiate, pending, ambiguous, reconciled |
| Profile/social identifiers | `GET|PATCH /api/account/profile/social-identifiers` | read + mutation | authenticated owner | verified/recorded social identity state | loading, ready, validation failure, mutation pending |
| Admin operations | `/api/admin/**` | read/mutation | **server-mediated** internal token + admin permission | admin control-plane DTOs | loading, unauthorized/forbidden, ready, operation pending |
| Super-admin commercial controls | `/api/admin/commercial/users/{userId}/...` | read/mutation | **server-mediated**, `super_admin`, step-up for high-risk mutations | server commercial/control state | loading, step-up required, verified, mutation pending/audited |

## Dashboard integration details

The dashboard response is the principal UI cognition contract.

Focus Plan `DashboardChartWorkspaceViewModel` contains:

- `dashboard.asset_code`;
- `directional_bias`;
- `confidence_total`;
- `confidence_anatomy`;
- contradiction state/score availability/evidence lineage;
- H4 zones;
- chart annotations/evidence notes;
- cognition modules;
- chart candles/zones/annotations/default display filters.

Kick Off is deliberately separate and reduced. Its `contract_version` is `kick-off-dashboard-v1`, `access` is `kick_off`, timeframe is H4, and it exposes a positive allowlist around chart context, evidence score and macro headlines. Do not derive premium cognition from Kick Off data in the client.

## Refresh strategy

Read endpoints that say `latest`, `current`, `history` or dashboard GET are passive reads. They must not be treated as implicit generation endpoints.

Use the dedicated refresh/generate mutation for the domain when a fresh computation is required and the user is entitled. Preserve idempotency for protected mutations.

## Admin UI architecture

The generated inventory intentionally marks `/api/admin/**` operations as not browser-safe when they require `x-elceo-internal-token`. A browser-based admin console therefore needs trusted server-side mediation (server component/server action/BFF or equivalent). Never solve this by exposing the internal token to the browser.

## Design freedom vs contract rigidity

The visual system may rearrange panels, drawers, cards and navigation. It may not:

- calculate a new directional bias;
- recalculate confidence;
- merge/dedupe evidence differently from the server;
- infer entitlements from plan labels;
- invent billing/payment success;
- call internal-token routes directly from client JavaScript;
- turn diagnostic DXY/VIX into launch-tradable assets.
