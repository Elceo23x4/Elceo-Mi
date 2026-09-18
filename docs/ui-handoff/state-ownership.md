# State Ownership

The frontend must consume frozen backend truth rather than recreate it.

| State | Ownership | Frontend rule |
|---|---|---|
| auth/session identity | SERVER AUTHORITATIVE | Browser may hold framework/session presentation state but may not assert subject identity. |
| user/profile record | SERVER AUTHORITATIVE | Display/edit only through authenticated owner routes. |
| entitlements / feature access | SERVER AUTHORITATIVE | Never infer from UI plan labels or local storage. |
| billing truth / subscription lifecycle | SERVER AUTHORITATIVE | Re-read canonical billing/reconciliation state after mutations or ambiguous network outcomes. |
| portfolio records | SERVER AUTHORITATIVE | Local forms are drafts only until server accepts them. |
| journal cases/lifecycle | SERVER AUTHORITATIVE | Lifecycle transitions come from API results. |
| notification targets/subscriptions/inbox state | SERVER AUTHORITATIVE | Client toggles are optimistic only if product UX chooses; server result wins. |
| dashboard materialization | SERVER-DERIVED / READ MODEL | Render server snapshot; client does not regenerate cognition. |
| market evidence stack | SERVER-DERIVED / READ MODEL | Do not fetch raw providers directly from browser. |
| freshness | SERVER-DERIVED / READ MODEL | Do not derive canonical freshness from device time alone. |
| confidence | NEVER CLIENT-OWNED | Render score/band/drivers/cautions supplied by backend; never recompute. |
| directional bias | NEVER CLIENT-OWNED | Render backend bias. FX must preserve base and quote side context before pair-relative display. |
| contradiction/tension | NEVER CLIENT-OWNED | Do not collapse conflicts or decide which source wins in UI. |
| evidence sufficiency | NEVER CLIENT-OWNED | Backend determines support/degraded state. |
| market regime/cognition | NEVER CLIENT-OWNED | Presentation only. |
| admin/security decisions | SERVER AUTHORITATIVE | Internal/admin/step-up gates cannot be bypassed client-side. |
| payment/provider state | SERVER AUTHORITATIVE | Browser cannot mark payment/provider success. |
| form values before submit | CLIENT EPHEMERAL | Safe local editing state. |
| modal/tab/dropdown state | CLIENT EPHEMERAL | Pure presentation state. |
| chart viewport/zoom/crosshair | CLIENT EPHEMERAL | May be local unless persisted through an explicit backend feature. |
| previously received read response | CLIENT DISPLAY CACHE | May support smooth UI, but must retain server freshness/degraded metadata and be invalidated by accepted server policy. |

## Hard prohibitions

The UI must not calculate confidence, directional bias, entitlement decisions, billing truth, evidence sufficiency, contradiction resolution or provider authority independently.

It must not turn stale evidence into current evidence, convert fallback/aggregator observations into official authority, or merge FX base/quote reasoning into a one-sided signal.
