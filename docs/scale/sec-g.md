# SEC-G distributed scale and resilience acceptance

## Scope and baseline

This batch is based exactly on `fbf26e9e279d3237a2495e436b9522a2a261d423`. It establishes empirical CI instrumentation and correctness contracts; it **does not assert production capacity or production readiness**. SEC-H, branch protection, deployments, live-provider activation, and pre-production setup remain deferred.

## PostgreSQL topology and contract

Before SEC-G, application-state, analytics, ingestion (three repositories), notifications, reasoning (four repositories), and two web composition readers each created package-local pools. Scripts and integration tests own short-lived isolated pools and remain test-only. After SEC-G, production service repositories resolve system or restricted-tenant authority through `@elceo/db-runtime`, whose global symbol registry permits one pool per canonical credential-free database identity and authority in a Node process. System and tenant URLs are never coalesced.

Defaults are deliberately bounded: max 10 connections per authority/process, 3 s acquisition, 30 s idle, 15 s client query, 12 s PostgreSQL statement, 2 s lock, 15 s idle-in-transaction, TCP keepalive with 10 s initial delay, and `elceo-<APP_ENV>-<authority>` application name. URL SSL parameters are rejected rather than silently overriding policy. `verify-full` is mandatory outside explicit localhost development/test `local-plaintext` mode. `transaction_timeout` is not used (PostgreSQL 16 compatibility).

Connection demand is `system max × processes + tenant max × processes`. With both default maxima and four processes, the upper bound is `(10 × 4) + (10 × 4) = 80`; operators must set both maxima and worker count against the server/reserve budget. Safe snapshots expose role, credential-free canonical identity, application name, max, total, idle, and waiting counts.

## Durable ownership

Migration 0062 adds token, monotonically increasing generation, claim timestamps, expiry, and selective due-order indexes to ingestion and notification outboxes. Claim transactions select deterministic `(available_at, created_at, outbox_id)` batches with `FOR UPDATE SKIP LOCKED`, update and return ownership, then release locks before transport. Completion, retry, dead-letter, and release operations must compare both token and generation. Expired claims are reclaimable; stale generations affect zero rows. Dedupe keys and attempt audit rows remain unchanged.

Scheduler leases receive owner token/generation and must heartbeat/current-owner-check before canonical finalization; releases compare the current fence. Ops scopes have a database-enforced partial unique active-scope index, tokens/generations, owner-safe release, heartbeat, and expired takeover. A long-running operation that cannot renew loses authority.

Notification recovery preserves `outboxId` as Resend's `Idempotency-Key` and OneSignal's `idempotency_key`. A Postmark transport interruption after possible acceptance is terminally ambiguous/manual-reconciliation work and is never blindly reclaimed for send. Crash-before-acceptance is reclaimable after expiry. This distinction prevents fixtures from overstating real provider guarantees.

## Growth, plans, and workload

The notification subject inbox target is one tenant/RLS-scoped join from inbox to owned targets, with unread/archive predicates in SQL, a bounded limit, and deterministic `(created_at DESC, inbox_id DESC)` ordering. This replaces `1 + target count` queries and up to 1,000 fetched rows per target with one bounded query. Stable keyset pagination uses the same pair; no high-cardinality OFFSET is accepted.

`test:sec-g-postgres` records JSON `EXPLAIN (ANALYZE, BUFFERS)` evidence for due ingestion, due notification, and recent ops access. The configurable `SEC_G_DATASET_SCALE` is recorded with evidence; CI uses 1,000 as a bounded planner smoke dataset. Capacity-discovery environments may increase it and seed with `generate_series`, followed by `ANALYZE`. Portfolio, journal, inbox, reasoning/materialization plan expansion remains an explicitly visible limitation of this first evidence harness.

The pinned Grafana k6 OSS 2.2.0 harness names ten independent workloads: account/session reads, dashboard, portfolio read/write, journal read/write, notification inbox, admin ops, fixture-only provider ingestion, and mixed traffic. Profiles are `smoke`, `ci`, and progressively bounded `capacity-discovery`. Measurements are runner baselines—not business SLOs—and include request rate/count, status/error distribution, p50/p95/p99, process CPU deltas, repeated RSS/heap/event-loop samples, safe pool pressure, Redis fault counters, and backlog state when the local fixture runtime supplies them.

## Lifecycle and failure semantics

One composition-root signal handler stops claimers, drains registered work in reverse order, and closes shared Redis/PostgreSQL resources within `ELCEO_SHUTDOWN_GRACE_MS` (15 s default). Packages register drains but never install duplicate handlers. Hard-kill acceptance relies on expiring durable SQL/Redis ownership: a successor takes over and stale completion is rejected.

Redis authority loss remains fail closed: no provider execution or accounting proceeds without Provider API Gate authority. On recovery, independent clients contend through the existing distributed single-flight and adaptive-materialization fences; losing workers cannot overwrite cognition.

## Evidence interpretation and limitations

Correctness thresholds (duplicate effects, stale-owner writes, authority mixing, pool overflow/leaks, uncontrolled provider calls, stuck recoverable claims, unexpected CI 5xx) are non-negotiable. CI latency thresholds are regression guardrails only. A later reviewed business capacity/SLO floor is intentionally unset. Machine-readable artifacts are uploaded per exact PR SHA. No staging/production or live providers are contacted.

The first local baseline is structural because this checkout does not itself provide running PostgreSQL, Redis, Next fixture runtime, or k6. Exact empirical latency, CPU/memory, pool peaks, backlog drain, Redis restart, and kill/takeover values are produced by the isolated SEC-G CI job; they must be reviewed before any capacity statement.
