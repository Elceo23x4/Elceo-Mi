# Frontend Integration Map

This map links UI surfaces to frozen backend domains. Exact route/method inventory is in `artifacts/ui-handoff/route-inventory.json`.

| UI surface | Primary API family | Read / mutation | Access | Server-owned state | Required UI states |
|---|---|---|---|---|---|
| Dashboard chart | `/api/dashboard/*` | read | kick-off/basic or focus slice | chart/read model, freshness | loading, ready, stale, degraded, entitlement blocked |
| Directional bias | dashboard/materialized cognition | read | server-gated | bias, FX base/quote pressure | ready, partial evidence, degraded |
| Confidence context | dashboard/materialized cognition | read | server-gated | score, band, drivers, cautions | ready, degraded, stale |
| Evidence stack | dashboard/evidence read model | read | server-gated | authority, freshness, sufficiency | ready, partial, stale, degraded |
| Macro context/headlines | dashboard/analytics evidence | read | server-gated | normalized macro/vintage context | ready, empty, stale, degraded |
| Market regime | dashboard cognition | read | server-gated | regime classification | ready, degraded |
| Watchlist | `/api/portfolio/*` | read + mutation | focus plan | watchlist truth | loading, empty, ready, conflict, validation error |
| Portfolio positions/actions | `/api/portfolio/*` | read + mutation | focus plan | position/action lifecycle | loading, ready, empty, conflict, replay |
| Journal | `/api/journal/*` | read + mutation | kick-off/basic; influence/deep paths may require focus | case/lifecycle state | loading, empty, ready, conflict, validation error |
| Analytics | `/api/analytics/*` | latest read + explicit generate | focus plan | generated analytics state | loading, ready, empty, entitlement blocked, refresh/generate in progress |
| Coaching | `/api/coaching/*` | latest read + explicit generate | focus plan | coaching insights/action plan | loading, ready, empty, entitlement blocked |
| Workspace | `/api/workspace/*` | read + refresh | feature/plan gated | workspace/materialization state | loading, ready, stale, refresh in progress, degraded |
| Notifications | `/api/notifications/*` | read + preference/target/subscription mutations | authenticated/focus depending route | inbox, target, subscription, delivery health | ready, empty, verification required, degraded |
| Account/profile | `/api/account/*` | read + owner mutation | authenticated owner | profile, entitlements, usage, access decisions | loading, ready, unauthorized, validation error |
| Billing/subscription | `/api/account/billing*`, `/api/billing/*` | read + readiness/mutation where available | authenticated/payment readiness | billing lifecycle/reconciliation | ready, pending, failed, ambiguous, blocked activation |
| Admin | `/api/admin/*` | read + ops mutations | internal boundary + admin permission | operational truth | unauthorized, forbidden, ready, step-up where applicable |
| Super Admin | `/api/admin/commercial/users/*`, step-up routes | read + sensitive mutation | internal + super-admin + step-up | commercial-control truth | ready, step-up required, conflict, replay |

## Refresh strategy

Use explicit backend refresh/generate/run routes. Read routes must not be assumed to regenerate server state. The UI may poll bounded status/read endpoints where a long-running operation requires it, but it must not create client-side shadow materializations.

## Market-intelligence presentation

The UI may choose visual layouts, animations and interaction models, but these fields remain server-owned:

- directional bias;
- confidence context/decomposition;
- evidence-stack authority/freshness;
- contradiction/tension;
- market regime;
- coaching/analytics generated outputs.

For FX pairs, render base-side and quote-side context independently where exposed, then display the server-provided relative pair result. Never infer a one-sided USD conclusion in the client.

## Internal APIs

Any route marked `server_internal` in the machine inventory is not directly callable by public browser code. Admin UI must use an approved server-mediated boundary; never ship the internal token to the browser.
