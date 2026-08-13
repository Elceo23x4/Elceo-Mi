# Provider API Gate scale hardening — PGS-1

PGS-1 extends the existing Provider API Gate; it does not create another provider execution boundary. Static activation, capability, schema, secret, and legacy deterministic guards remain in the resolver. Only an explicitly approved, versioned policy can reach distributed live admission. This is a distributed-control foundation, **not** production-scale, 100k-user, or live-provider readiness proof.

## State ownership

Redis owns live hot-path token-bucket rate state, fixed UTC-window quota reservations, integer cost reservations, and expiring concurrency leases. One Lua admission operation uses Redis `TIME`, validates every dimension before mutation, and then reserves all dimensions together. PostgreSQL remains the durable audit/policy-system-of-record boundary; it is not polled on every provider call. Fixture, dry-run, and replay paths do not require Redis and retain deterministic behavior.

The official `redis` client is created lazily from `REDIS_URL`; importing the module does not connect. Connection and command waits are bounded, errors exposed to gate callers are sanitized control reasons, and clients have explicit readiness and graceful close behavior. `rediss://` is supported by the client URL contract.

## Keys and cluster slot

Production keys use `elceo:provider-control:v1:{sourceId|capabilityId|credentialPoolId|policyVersion}:<rate|quota|cost|leases|reservations>`. Tests supply a unique namespace. The braces are an intentional Redis Cluster hash tag, so every key touched by an admission or settlement script shares one slot. Scope components accept only constrained non-secret logical identifiers. API keys, credential values, hashes of credentials, and user data are prohibited.

## Policy and request identity

Policies carry an ID/version, source/capability/credential-pool scope, effective interval, approval status, provenance, rate refill parameters, optional quota window, integer cost units, bounded concurrency/lease and provider timeout, plus a canonical SHA-256 policy hash. No provider limits are supplied by this batch; integration policies are marked test-only. Missing live policy blocks with `provider_control_policy_missing`.

Request fingerprints use schema `elceo_provider_request_v1`, recursively sorted object keys, deterministic value validation, and SHA-256. They include source, capability, asset, region, time range, pagination cursor, and the separately typed `providerRequestParams`. Request IDs, provenance/actor, idempotency, observability metadata, timestamps unrelated to the upstream response, and credentials are excluded.

## Reservation lifecycle and failure behavior

Admission creates `RESERVED` cost and a uniquely owned lease. A validated successful provider execution becomes `COMMITTED`; a known pre-execution/non-billable cancellation becomes `RELEASED`; an invoked call whose billing outcome cannot be proven becomes `COMMIT_REQUIRED_UNKNOWN_OUTCOME` and is not refunded. Settlement removes only the matching owner member, never performs an unscoped lease `DEL`, and response-validation errors cannot strand the lease.

Denied admission mutates no rate, quota, cost, or concurrency state. Expired leases are removed atomically and state keys receive bounded TTLs. The memory store serializes operations for deterministic tests, but live staging requires a Redis store and never falls back to memory. Redis absence or failure blocks before adapter invocation with `provider_control_unavailable`. Production live remains independently blocked by the accepted activation gate and both live environment defaults remain false.

## Sequence status

PGS-1 covers distributed admission correctness only. PGS-2 cache/single-flight orchestration, PGS-3 circuit/backpressure orchestration, PGS-4 adaptive scheduling, and PGS-5 load acceptance remain required future batches and were not started here.
