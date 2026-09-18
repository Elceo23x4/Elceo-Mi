# UI State Matrix

This matrix translates the frozen backend contract into UI behavior. The server response remains authoritative; the client must not reinterpret a server-owned business state into a different one.

| UI state | Backend trigger / evidence | HTTP / envelope pattern | Frontend interpretation | Allowed UI action | Retry guidance |
|---|---|---|---|---|---|
| Initial / loading | Request not resolved yet | No response | Data unavailable because the request is pending, not because state is empty | Show loading/skeleton without synthesizing values | N/A |
| Ready | Successful read with usable DTO | Usually `200`; standard routes use `{ok:true,data}`; dashboard returns its view model directly | Render server DTO as-is | Normal interactions allowed by entitlement | Refresh only according to surface policy |
| Empty | Successful read whose collection/snapshot is empty/null by contract | `200` success | Valid absence of user/domain data | Show explicit empty state and relevant creation action | Do not loop-retry an intentional empty state |
| Stale | DTO/freshness contract marks evidence or materialization stale/aging | Usually successful response with freshness metadata | Data exists but is no longer current enough for full confidence | Render stale badge/caution; keep timestamps visible | Use documented refresh action if user is entitled |
| Degraded / partial evidence | Evidence/readiness contract cannot satisfy all desired sources/capabilities | Success with degraded/readiness fields, or dependency-specific error | Intelligence is intentionally lower confidence / incomplete, not necessarily unavailable | Preserve server confidence/caution; never fill missing evidence client-side | Retry only if server exposes refresh/recovery path |
| Dashboard unavailable | Canonical materialization missing | Dashboard handler can return `503` | Server does not have a usable dashboard projection | Show unavailable/degraded surface, not zero-valued cognition | Retry with backoff or explicit refresh path; do not trigger ingestion from GET |
| Request limited | Inbound admission/rate protection rejects request | Dashboard may return `429`; protected mutations may also rate-limit | Request intentionally throttled | Disable rapid repeat, show retry state | Respect retry/backoff; do not fan out retries |
| Unauthorized | No valid authenticated subject/session | Standard `unauthorized` / `401`; dashboard uses `{error:'Unauthorized'}` with `401` | Session required or expired | Route to login/session recovery | Retry only after authentication succeeds |
| Onboarding / access forbidden | Authenticated but route/business gate denies access | `403` or `forbidden` | User lacks required onboarding/feature/commercial/admin authority | Show the exact access/upgrade/permission state supported by server | Do not retry unchanged request repeatedly |
| Entitlement blocked | Commercial restriction or feature permission denies premium capability | Usually `403`, often before payload generation | User cannot consume that premium capability under current entitlement | Show upgrade/plan boundary if product UX provides it | Re-evaluate after entitlement state changes |
| Step-up required | Super-admin/high-risk operation lacks verified challenge | `403`/security envelope according to route helper | Stronger verification is required before mutation | Start/continue server-defined step-up flow | Retry the original action only after verified step-up |
| Validation error | Request body/query fails `@elceo/schemas` or API parsing | `400` `validation_error` / `bad_request` with details where provided | Client input is invalid | Map deterministic details to form fields when safe | Correct input; do not blind retry |
| Payload too large | Request body exceeds route parser limit | `payload_too_large` | Client sent more data than the route accepts | Reduce payload | Retry only with compliant payload |
| Not found | Owner-scoped resource does not exist / is not visible | `404` `not_found` where route uses standard envelope | Resource unavailable to this subject | Show not-found state; do not infer another user's object exists | No automatic retry unless identifier changed |
| Conflict | State transition or idempotency conflict | `409` `conflict` | Requested mutation cannot be applied as submitted | Show latest server state / conflict explanation | Re-read authoritative state before another action |
| Idempotent replay success | Server has stored the prior successful response for the same logical mutation | May return the stored prior success status/envelope | Original action already succeeded | Treat exactly as success; do not duplicate UI side effects | Do not create a new idempotency key for the same logical action |
| Idempotent replay unavailable/conflict | Replay key is recognized but prior response cannot be safely replayed | Conflict envelope | Outcome requires reconciliation/readback | Fetch authoritative state before deciding to repeat | Do not immediately issue a new logical mutation |
| Dependency failure | Server dependency cannot fulfill operation | `424 dependency_failed` where used, or specialized degraded state | Upstream/internal dependency is unavailable | Preserve entered client state if safe; show dependency-specific retry | Backoff; do not duplicate writes |
| Internal failure | Unexpected server failure | `500 internal_error` or handler-specific 500 | Operation did not produce a trustworthy response | Show generic failure; never expose raw exception details | For reads, retry with backoff; for writes, reconcile via idempotency/readback first |
| Live/provider activation blocked | Frozen runtime deliberately blocks unverified live provider/payment path | `blocked_live_activation`, readiness response, or blocked route behavior | Capability exists structurally but is not activated in this environment | Show unavailable/readiness state; never claim provider is live | No client retry loop; activation is server/deployment work |
| Refresh in progress | Explicit refresh/generation mutation accepted and server run/state is pending | Surface-specific successful mutation/read status | Server owns refresh lifecycle | Show progress and retain last-known snapshot when allowed | Poll/read only at documented cadence |
| Pagination / end of list | Collection route returns fewer than requested limit or pagination metadata/token where implemented | Successful response | End of available collection | Stop requesting additional pages | Do not infer a cursor unless returned by server |

## Special dashboard rules

`GET /api/dashboard/{asset}` is intentionally a passive read. It does not bootstrap provider ingestion or rebuild cognition because state is missing. The UI must treat `503` as "canonical dashboard data unavailable" and may provide an explicit refresh path if the user's product entitlement allows one.

The dashboard can return either the Focus Plan `DashboardChartWorkspaceViewModel` or the positive-allowlist Kick Off `KickOffDashboardViewModelV1`, depending on server-resolved commercial access. The UI must discriminate the DTO by its server contract, not by locally guessed plan state.

## Mutation ambiguity rule

For protected mutations, a network timeout is **not proof of failure**. Preserve the same `Idempotency-Key` for a retry of the same logical action, or read back canonical state first. Creating a fresh key after an ambiguous network result can turn a safe retry into a second mutation.
