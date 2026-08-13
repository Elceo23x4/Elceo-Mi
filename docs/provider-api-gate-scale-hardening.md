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
