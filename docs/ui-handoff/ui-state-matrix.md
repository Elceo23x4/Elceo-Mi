# UI State Matrix

The frontend must render server state; it must not synthesize server-owned decisions.

| State | Backend trigger / envelope | Frontend interpretation | Allowed UI action | Retry behavior |
|---|---|---|---|---|
| loading | Request in flight | Data not yet resolved | Skeleton/progress only | none until request resolves |
| ready | `ok:true` with usable data | Normal interactive state | Render supported controls | normal refresh policy |
| empty | `ok:true` with empty collection/null domain result | Valid absence of data | Empty-state CTA where domain permits | user/manual refresh only where supported |
| stale | Freshness metadata says stale/expired | Data can be displayed with warning if server supplied it | Show freshness warning; do not relabel as current | use canonical refresh route if entitled |
| degraded | `ok:true` with degraded/readiness flags or partial dependency state | Function is available with reduced evidence/capability | Show caution and unavailable sub-surfaces | retry only through documented refresh/recovery action |
| partial evidence | evidence/read model reports missing or incomplete evidence | Server cognition is intentionally constrained | Preserve server confidence/bias output and caution | never fill gaps client-side |
| unauthorized | HTTP 401 / `unauthorized` | Session absent/invalid | Send user to authentication flow | after session establishment |
| forbidden | HTTP 403 / `forbidden` | Authenticated but permission/ownership denied | Remove/disable prohibited action; do not retry blindly | only after state/role change |
| entitlement blocked | 403 or commercial denial with entitlement reason | Plan/feature access not active | Present upgrade/plan pathway if product UX requires | re-read entitlement after successful commercial transition |
| step-up required | admin/super-admin mutation requires verified challenge | Sensitive action needs stronger verification | invoke step-up UI | retry mutation only after verified challenge |
| validation error | HTTP 400 with `validation_error`/details | Caller input invalid | Bind field/general errors | retry after correction |
| not found | HTTP 404 | Resource absent or inaccessible as not-found | Return to parent/list state | no automatic retry |
| conflict | HTTP 409 | State conflict/idempotency conflict | Explain conflict; fetch current state | safe GET then deliberate retry if server permits |
| idempotent replay | security/idempotency layer returns stored or replay envelope | Previous mutation result is authoritative | Render returned state, do not duplicate mutation | do not issue new key unless user starts a genuinely new operation |
| rate limited | server security/rate decision | Request frequency exceeded | Disable repeated action temporarily | respect server-provided/reasonable backoff; no tight loop |
| dependency failure | HTTP 424 / `dependency_failed` | Upstream/internal dependency unavailable | Render degraded dependency state | bounded retry only |
| internal failure | HTTP 500 safe error envelope | Server failure | Error boundary with recovery action | bounded user retry; no client-side reconstruction |
| provider/live activation blocked | route/readiness states indicate blocked activation | Backend intentionally fail-closed | Explain unavailable/degraded capability | no bypass; wait for environment activation |
| refresh in progress | refresh/materialization state running/leased/pending | New server read model not ready yet | Keep prior accepted snapshot if server exposes it; show progress | poll only at UI-appropriate bounded cadence |
| pagination | cursor/limit metadata present | More list data exists | Fetch next page using server cursor/limit | stop at end cursor/null |

## Intelligence-specific rule

Directional bias, confidence, contradiction/tension, evidence sufficiency, freshness classification and market regime are server-owned outputs. UI state may hide/show, animate, sort or format them, but must not recompute their meaning.

## Billing-specific rule

Ambiguous network/payment outcomes must never cause the browser to create a second payment attempt automatically. Re-read canonical billing/reconciliation state before any user-visible retry action.
