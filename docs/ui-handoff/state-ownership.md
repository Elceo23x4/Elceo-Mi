# Server vs Client State Ownership

The central UI rule is simple: **ELCEO's browser renders and requests; the backend owns identity, commercial truth, persisted user state and market intelligence.**

## Ownership classes

### SERVER AUTHORITATIVE
Persisted or security/business truth. The browser may display it and submit allowed mutations, but cannot declare the resulting truth itself.

### SERVER-DERIVED / READ MODEL
A server-computed projection/materialization produced from authoritative state. The browser renders the returned DTO and may cache it briefly for presentation, but must not recompute the domain result independently.

### CLIENT EPHEMERAL
Short-lived interaction state that is safe to own locally: open drawers, active tabs, unsaved form fields, hover/focus state, optimistic spinner state.

### CLIENT DISPLAY CACHE
Previously returned server DTO retained solely to avoid visual blanking while a newer server read is pending. It must preserve timestamps/freshness and cannot be promoted to current truth after the server says it is stale/invalid.

### NEVER CLIENT-OWNED
Secrets or decisions whose client-side ownership would break security, billing correctness or market-intelligence semantics.

## State matrix

| State | Ownership | UI rule |
|---|---|---|
| Authenticated user identity | SERVER AUTHORITATIVE | Read session state; never choose `userId`/`subjectId` locally. |
| Session/JWT validity | SERVER AUTHORITATIVE | Auth.js/server determines validity and expiry. |
| Role/admin/super-admin authority | SERVER AUTHORITATIVE | Local role may hide/show controls, but every protected operation must still be server-authorized. |
| Internal API token | NEVER CLIENT-OWNED | Must never reach browser JavaScript. |
| Step-up verification validity | SERVER AUTHORITATIVE | Follow challenge/verify contract; local confirmation is not equivalent. |
| User profile | SERVER AUTHORITATIVE | Edit only through owner-scoped APIs. |
| Entitlement / feature access | SERVER AUTHORITATIVE | Do not infer access from plan labels alone. |
| Billing plan/account state | SERVER AUTHORITATIVE | Render account billing DTO; server lifecycle owns transitions. |
| Payment result/reconciliation | SERVER AUTHORITATIVE | Network success/failure is not billing truth; reconciliation/provider events are authoritative. |
| Portfolio watchlist/positions/actions | SERVER AUTHORITATIVE | Local forms are ephemeral; accepted server record is canonical. |
| Journal cases/lifecycle/review | SERVER AUTHORITATIVE | State-machine transitions are enforced on the server. |
| Notification targets/subscriptions/inbox | SERVER AUTHORITATIVE | UI controls submit changes; server owns resulting delivery/verification state. |
| Workspace snapshot | SERVER-DERIVED / READ MODEL | Render snapshot; use explicit refresh endpoint to regenerate. |
| Dashboard materialization | SERVER-DERIVED / READ MODEL | Render returned materialization; dashboard GET is passive. |
| Candles/zones/chart annotations returned by dashboard | SERVER-DERIVED / READ MODEL | Chart library renders them; do not mutate their semantic meaning client-side. |
| Directional bias | NEVER CLIENT-OWNED | Do not infer/recalculate from candles or evidence in UI. |
| Confidence total / confidence anatomy | NEVER CLIENT-OWNED | Render server result; never create a UI-side confidence formula. |
| Contradiction/tension state | NEVER CLIENT-OWNED | Preserve server semantics and evidence lineage. |
| Evidence sufficiency / authority / quorum | NEVER CLIENT-OWNED | UI must not vote sources or promote an aggregator over official evidence. |
| Evidence freshness/vintage | NEVER CLIENT-OWNED | Render server timestamps/state; do not refresh timestamps locally. |
| FX base/quote relative pressure | NEVER CLIENT-OWNED | Base and quote cognition are server-owned and combined server-side. |
| Market regime / cognition modules | SERVER-DERIVED / READ MODEL | Render server projection; do not reconstruct reasoning from raw provider data. |
| Provider readiness / live activation | SERVER AUTHORITATIVE | Code existence does not imply live availability. |
| Admin audit/security state | SERVER AUTHORITATIVE | Never synthesize or suppress server audit/security outcomes. |
| Loading skeleton | CLIENT EPHEMERAL | May be controlled entirely by UI. |
| Modal/drawer/tab state | CLIENT EPHEMERAL | May be controlled entirely by UI. |
| Unsaved form text | CLIENT EPHEMERAL | Keep local until submit/cancel. |
| Last successful GET response | CLIENT DISPLAY CACHE | May remain visible while refreshing, with stale/loading indicator where appropriate. |
| Idempotency key for a logical in-flight mutation | CLIENT EPHEMERAL with server contract | Preserve across retries of the same logical mutation; never reuse for a different mutation. |

## Dashboard-specific boundary

The Focus Plan dashboard returns `DashboardChartWorkspaceViewModel` containing the server's `dashboard` cognition projection plus chart candles, zones, annotations and default filters. Kick Off returns the deliberately reduced `KickOffDashboardViewModelV1` positive allowlist.

The browser may control **display filters** for chart annotations. It may not alter the underlying evidence IDs, zone significance, contradiction evidence, confidence anatomy, directional bias or module ranking to create a different cognition result.

## Optimistic UI

Optimistic presentation is allowed only when it does not pretend a protected transition is final.

For portfolio, journal, billing, entitlement, notification verification and commercial/admin operations, retain a `pending` presentation until the server confirms the canonical state. On timeout or ambiguous network failure, reconcile/read back state instead of committing the optimistic state locally.

## Caching

Client data libraries may cache GET DTOs, but cache invalidation cannot replace backend freshness semantics. A locally recent fetch can still contain server-marked stale/degraded market evidence. Preserve `generatedAt`, `evaluated_at`, freshness/readiness fields and server response states where provided.
