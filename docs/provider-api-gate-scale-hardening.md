# Provider API Gate scale hardening — PGS-1

PGS-1 extends the existing Provider API Gate; it does not create another provider execution boundary. Static activation, capability, schema, secret, and legacy deterministic guards remain in the resolver. Only an explicitly approved, versioned policy can reach distributed live admission. This is a distributed-control foundation, **not** production-scale, 100k-user, or live-provider readiness proof.

## State ownership

Redis owns live hot-path token-bucket rate state, fixed UTC-window quota reservations, integer cost reservations, and expiring concurrency leases. One Lua admission operation uses Redis `TIME`, validates every dimension before mutation, and then reserves all dimensions together. PostgreSQL remains the durable audit/policy-system-of-record boundary; it is not polled on every provider call. Fixture, dry-run, and replay paths do not require Redis and retain deterministic behavior.

The official `redis` client is created lazily from `REDIS_URL`; importing the module does not connect. Connection and command waits are bounded, errors exposed to gate callers are sanitized control reasons, and clients have explicit readiness and graceful close behavior. `rediss://` is supported by the client URL contract.

## Keys and cluster slot

Production keys use `elceo:provider-control:v1:{sourceId|capabilityId|credentialPoolId}:policy:<policyVersion>:<rate|quota|cost|leases>` plus a bounded `:admission:<admissionId>` key. Tests supply a unique namespace. The braces are an intentional Redis Cluster hash tag, so every key touched by an admission or settlement script shares one slot. Scope components accept only constrained non-secret logical identifiers. API keys, credential values, hashes of credentials, and user data are prohibited.

## Policy and request identity

Policies carry an ID/version, source/capability/credential-pool scope, effective interval, approval status, provenance, rate refill parameters, optional quota window, integer cost units, bounded concurrency/lease and provider timeout, plus a canonical SHA-256 policy hash. No provider limits are supplied by this batch; test fixtures may use test-only policies, but staging-live authorization requires an approved policy. Missing live policy blocks with `provider_control_policy_missing`.

Request fingerprints use schema `elceo_provider_request_v1`, recursively sorted object keys, deterministic value validation, and SHA-256. They include source, capability, asset, region, time range, pagination cursor, and the separately typed `providerRequestParams`. Request IDs, provenance/actor, idempotency, observability metadata, timestamps unrelated to the upstream response, and credentials are excluded.

## Reservation lifecycle and failure behavior

Admission creates `RESERVED` cost and a uniquely owned lease. A validated successful provider execution becomes `COMMITTED`; a known pre-execution/non-billable cancellation becomes `RELEASED`; an invoked call whose billing outcome cannot be proven becomes `COMMIT_REQUIRED_UNKNOWN_OUTCOME` and is not refunded. Settlement removes only the matching owner member, never performs an unscoped lease `DEL`, and response-validation errors cannot strand the lease.

Denied admission mutates no rate, quota, cost, or concurrency state. Expired leases are removed atomically and state keys receive bounded TTLs. The memory store serializes operations for deterministic tests, but live staging requires a Redis store and never falls back to memory. Redis absence or failure blocks before adapter invocation with `provider_control_unavailable`. Production live remains independently blocked by the accepted activation gate and both live environment defaults remain false.

## Sequence status

PGS-1 covers distributed admission correctness only. PGS-2 cache/single-flight orchestration, PGS-3 circuit/backpressure orchestration, PGS-4 adaptive scheduling, and PGS-5 load acceptance remain required future batches and were not started here.

## PGS-1A correctness closure

Live policy authority is server-side: `ProviderApiGateExecutionContext` supplies a trusted policy resolver and credential-pool identifier. A request-carried policy is compatibility data only and cannot authorize staging live. Resolved policies must be `approved`, effective, canonically hashed, and bound to the requested source, exact or explicit `*` capability, and trusted pool. `test_only` and `disabled` policies cannot authorize live execution.

A deterministic admission ID is derived from the logical request ID, while reservation and owner IDs are independently random. The per-admission Redis key is checked inside the admission Lua script before capacity is consumed. Matching retries reuse the reservation; changed fingerprint or policy produces `provider_control_idempotency_conflict`. This makes an ambiguous client command timeout safe to retry without double reservation.

Admission records are per-admission keys in the same provider/source/pool cluster slot, not fields in an indefinitely extended hash. Active records have bounded TTLs and settlement converts them to short-lived tombstones. Reservations retain fingerprint, policy hash, rate and quota units, quota/cost window identities, reservation ID, and owner. Settlement changes quota/cost only when the stored window still matches the current state. Pre-invocation `RELEASED` atomically refunds rate (capped at capacity), current-window quota, current-window cost, and the owner lease; `COMMITTED` and `COMMIT_REQUIRED_UNKNOWN_OUTCOME` never refund rate or quota and conservatively commit cost only in the matching window.

Gate results expose settlement state, including `settlement_unconfirmed`; a failed settlement is never silently represented as healthy. Distributed denials also update the corresponding legacy rate/quota/cost status instead of leaving it `ok`. PGS-1 policies support only explicit `fixed_duration` quota and cost windows; calendar-month behavior is unsupported rather than approximated.

## PGS-1B execution ownership

Admission and execution authority are separate. A reservation begins `RESERVED`; an atomic store claim verifies the reservation and a live owner lease before exactly one execution token can transition it to `EXECUTING`. Followers receive `provider_control_admission_in_progress`, do not invoke an adapter, and never settle the owner's reservation. Expired leases are deterministically blocked; PGS-1B does not reacquire them.

Staging-live adapters must expose the managed `fetchManaged` contract and honor its `AbortSignal`. The trusted policy's `providerTimeoutMs` is enforced by the gate, and the canonical 250 ms settlement safety margin must keep `providerTimeoutMs + margin < leaseDurationMs`. Tiingo uses the gate signal for live HTTP instead of creating an independent timeout. After transmission, timeout/abort is conservatively settled as `COMMIT_REQUIRED_UNKNOWN_OUTCOME`, and concurrency is released only after the managed adapter promise terminates.

Settlement requires the execution token, so a follower cannot settle or release another executor's state. A pre-execution release refunds rate only when the complete rate hash still exists; it cannot resurrect an expired partial token-bucket hash. No result waiting, sharing, coalescing, or cache behavior is included—those remain PGS-2 scope.

## PGS-1C execution lease horizon

The atomic execution claim now renews the existing concurrency occupant from Redis `TIME` to `TIME + leaseDurationMs` without increasing the semaphore count. Its authoritative result carries `claimedAt`, `executionToken`, and `executionLeaseExpiresAt`; the gate uses this claimed reservation rather than the admission-time lease snapshot.

If and only if a `RESERVED` admission's original lease is already absent or expired, the same claim script terminally releases it: current rate state is capacity-capped without recreating an expired key, matching-window quota and cost reservations are released, the stale lease member is removed, and the admission becomes a bounded `RELEASED` tombstone. Newer accounting windows are never decremented. `EXECUTING` admissions remain conservative and are never auto-refunded after lease expiry. Followers see `provider_control_admission_in_progress` and do not renew, execute, settle, or refund.


## PGS-1D claim reconciliation

Execution claims are idempotent for the caller's execution token. If a bounded Redis command has an ambiguous outcome, the store makes exactly one reconciliation claim with the same token. An already-`EXECUTING` reservation is returned only to that token; a different-token follower receives `provider_control_admission_in_progress` without lease renewal or accounting mutation. The gate executes an adapter only after positive ownership confirmation, and two unconfirmed attempts fail closed.

Abandoned-reservation rate refunds require a complete canonical token bucket: both `tokens` and `last` fields and a positive TTL. Missing fields or TTL prevent mutation, so cleanup cannot convert partial or immortal Redis state into a valid-looking bucket. This remains PGS-1 distributed-control closure only; PGS-2 caching, waiting, and result coalescing have not started.


## PGS-1E reconciliation lease validity

Same-token recovery consults Redis `TIME` and the owner semaphore member before returning execution authority. A sufficient lease is reused unchanged; an insufficient but live lease is renewed in place; and an expired lease is reacquired only after expired-member cleanup proves the trusted policy's `maxConcurrent` capacity is available. A full semaphore returns `provider_control_execution_lease_unavailable` without accounting or follower mutation.

Reservations persist the approved policy's provider timeout, lease duration, settlement safety margin, and concurrency maximum for the atomic reconciliation decision. Each of the two bounded claim attempts is capped at half of the policy slack `leaseDurationMs - providerTimeoutMs - settlementSafetyMarginMs`. No caching, follower waiting, result sharing, or other PGS-2 behavior is included.
# PGS-2 — distributed single-flight and multi-layer provider cache

PGS-2 places trusted cache orchestration before PGS-1 admission for external staging-live requests. Static gate eligibility is followed by trusted `ProviderCachePolicy` resolution, canonical request fingerprinting, L0/L1 lookup, an atomic L2 lookup, and distributed flight coordination. Only the flight owner enters the unchanged PGS-1 admission, claim, managed adapter, validation, and settlement sequence. Production-live remains blocked.

Cache authority is server-side. An approved, effective, hash-verified policy must exactly match source, capability (or its explicit wildcard), and trusted credential pool. Request-carried `cacheHitPayload` and `stalePayload` remain non-live compatibility fields and are not consulted as staging-live cache authority. Policy versions naturally isolate entries without Redis scans; no provider-specific production freshness values are embedded in code.

The layers have deliberately separate responsibilities:

* **L0** is a bounded process-local map of caller-independent orchestration promises. One representative polls Redis, and deterministic `finally` cleanup prevents completed flights from accumulating.
* **L1** is a bounded count/byte LRU, serves fresh entries only, and never extends authoritative expiry on access.
* **L2** is Redis distributed truth. Redis `TIME` establishes publication, fresh, and stale deadlines; total TTL removes expired data naturally. Reads distinguish fresh, stale-eligible, miss, and invalid data.

The cache identity hashes source, capability, trusted credential pool, cache-policy version, cache-contract version, and the canonical provider request fingerprint. Fingerprint-specific Redis hash tags co-locate cache, flight, and completion keys while distributing different requests across cluster slots. It excludes request IDs, users, actors, credentials, and secrets.

Stored `ProviderCachedMaterial` is caller-independent and integrity hashed. It contains validated provider payload facts and truthful original `receivedAt`, but no request ID, response ID, caller provenance, or credential metadata. Every hit creates a new response ID and rematerializes both request identity fields for the current caller. Only a valid provider success whose PGS-1 settlement is confirmed committed can be atomically published, subject to payload and policy byte limits.

Flights use `SET NX PX` owner leases. Token-comparison Lua renews and releases ownership, so an old owner cannot delete a successor. A bounded heartbeat runs below the lease interval and composes ownership loss with the managed provider abort signal; it is always cleared. Successful completion atomically verifies ownership, publishes cache using Redis time, and removes flight state, eliminating release-before-visibility. Failures publish only a short sanitized completion signal, not a general negative cache.

Cross-instance followers use bounded exponential backoff with jitter and an absolute deadline. They observe fresh publication or sanitized terminal completion, and may contend for takeover only after the lease is genuinely absent. A deadline while an owner remains produces `provider_singleflight_wait_timeout`, never an independent provider call. A Redis failure after an L1 miss fails closed as `provider_cache_control_unavailable`; a previously validated fresh L1 hit remains safe to serve.

Stale data is retained only as a synchronous stale-if-error candidate. It is returned truthfully as stale after a refresh/control failure and only inside the trusted policy's stale window. There are no background refresh jobs and no stale-while-revalidate behavior.

PGS-2 does not assert production-live readiness, provider freshness calibration, or 100k-user readiness. PGS-3 and later scale-hardening work have not started.

## PGS-2A acceptance closure

Staging-live execution now requires both the trusted cache-policy resolver and Redis cache coordinator; neither dependency is optional and absence blocks before PGS-1 admission. Request-carried compatibility cache and stale payloads are ignored for live resolution, execution, settlement, and publication. They remain available only on deterministic non-live paths.

The elected owner resolves the trusted PGS-1 policy before admission and validates `flightLeaseMs > providerTimeoutMs + settlement safety + cache-publication safety`. The heartbeat interval is derived below the flight lease. An already-aborted ownership signal is checked both before and immediately after listener registration, before the adapter is marked invoked. Pre-transmission ownership loss therefore releases PGS-1, while post-transmission loss retains conservative unknown-outcome settlement.

Every stale fallback is reread from L2 immediately before serving. A candidate that expires during owner execution or follower waiting is not served, and Redis loss during final verification fails closed. Success publication measures the exact serialized Redis cache entry inside the owner-token-checked Lua operation; oversized entries atomically become a short completion outcome instead of cache data. Flight acquisition atomically clears obsolete completion state, and shared failure reasons are selected from a finite caller-independent allowlist rather than raw adapter errors.

Caller-independent material now retains validated revision, duplicate-provider, duplicate-record, nullable-field, and unknown-field metadata. Redis reads and writes preserve the original JSON material bytes so empty arrays and other JSON semantics cannot be altered by Lua table round-tripping before integrity verification.

## PGS-2B owner and follower truthfulness

Publishing an owner's verified result does not rewrite that request as a cache hit. The elected owner retains its original live-staging decision, response identity, PGS-1 settlement, and provider-control snapshot, with the cache snapshot recording `owner` and `published`. L0/L1/L2 consumers that did not invoke upstream remain `cache_response` requests with `not_required` settlement and no provider-control reservation.

Stale-if-error likewise preserves a refresh owner's provider-attempt and settlement evidence. In contrast, a follower deadline while an owner is still working is not an error in the refresh and therefore never authorizes stale data; it returns `provider_singleflight_wait_timeout` without calling upstream.

Each cache consumer rematerializes caller identity and then runs the normal response validator using that caller's unknown-field, nullable-field, and deduplication policy. A caller-specific rejection neither deletes nor mutates globally trusted material. Cache-policy resolver failures are reduced to finite non-secret reasons. The Redis acceptance suite exercises PGS-1 ambiguous-claim reconciliation, late same-token lease reacquisition, managed timeout termination, unmanaged-adapter rejection, and control-store outage through the mandatory PGS-2 owner boundary. Production live remains blocked, and PGS-3 has not started.
