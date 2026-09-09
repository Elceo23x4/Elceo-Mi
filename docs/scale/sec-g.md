# SEC-G distributed scale and resilience acceptance

## Scope

Baseline: `fbf26e9e279d3237a2495e436b9522a2a261d423`. This work is SEC-G only and makes no production-capacity or production-readiness claim. SEC-H, branch rules, deployments, Sentry setup, and live providers are deferred.

## Implemented

`@elceo/db-runtime` is the sole owner of shared process pools. System `DATABASE_URL` and restricted `TENANT_DATABASE_URL` are separate registry roles and identities. Package facades may forget a cached reference but never end a shared pool; only an explicitly injected application-state test pool remains locally owned. `closeRuntimePools()` clears the registry before ending each pool, allowing a later test runtime to create a fresh instance.

Pool defaults are: max 10 per authority/process, acquisition 3 s, idle 30 s, client query 15 s, PostgreSQL statement 12 s, lock 2 s, idle-in-transaction 15 s, TCP keepalive with 10 s initial delay, and `elceo-<APP_ENV>-<authority>` application name. URL SSL parameters conflict with and are rejected by the explicit policy. `verify-full` is required except explicit localhost `development`/`test` `local-plaintext`. Snapshots contain only role, credential-free identity, application name, max, total, idle, and waiting.

Aggregate demand is `(system max × process count) + (tenant max × process count)`. Defaults at four processes imply `(10×4)+(10×4)=80`; this is a budget formula, not a recommendation.

Migration 0062 adds ingestion/notification claim token, monotonically advancing generation, claimed/expiry timestamps, scheduler and ops owner fences, the unique active ops-scope guard, and selective due/inbox indexes. The ingestion publisher now atomically claims ordered batches using `FOR UPDATE SKIP LOCKED`, commits before transport, and requires `(outbox_id, claim_token, claim_generation)` for published/retry/dead transitions. Expired publishing claims are reclaimable.

Scheduler acquisition returns token/generation, takeover increments generation, current-owner checks guard execution/finalization, renew is fenced, and release is fenced. Ops acquisition is database-atomic, generations advance by scope, success persistence requires current ownership, and renew/release are fenced.

The authenticated SQL notification inbox path uses one bounded join to subject-owned targets. Unread/archive/optional-target predicates execute in SQL and ordering is `(created_at DESC, inbox_id DESC)`; the memory repository retains its multi-call fallback only for unit-test composition.

The k6 file maps ten named scenarios to canonical routes and dispatches by `exec.scenario.name`. Smoke/CI use constant VUs; capacity discovery uses an actual bounded `ramping-vus` executor. It accepts a legitimate session cookie and contains no fixture authentication bypass.

## Evidence files

`structural-summary.json` reports only schema/harness facts. PostgreSQL execution writes `explain-plans.json`. CI artifacts are exact-SHA named. Correctness results must not be inferred from structural text inspection.

## Still required before SEC-G acceptance

Notification transport claim fencing and provider-specific Postmark ambiguous execution, full set-based high-cardinality seeding/plans, Redis stop/restart and adaptive kill/takeover, process-death backlog tests, composition-root shutdown wiring, authenticated Next runtime startup, actual k6 execution, repeated resource samples, and exact-head green Actions evidence remain acceptance requirements. Until those executable artifacts exist, this PR remains HOLD and no empirical business floor is set.
