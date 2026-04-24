# Notification Orchestration Runtime (C3-J)

## End-to-end runtime flow

`runNotificationEndToEndForReasoningRun(reasoningRunId)` executes a deterministic two-stage runtime path:

1. Policy evaluation (`CanonicalNotificationPolicyBoundaryService.evaluateForReasoningRun`)
2. Delivery staging (`stageDeliveriesForReasoningRun`)

The flow is strictly evaluate-then-stage. Dispatch is intentionally excluded.

## Policy evaluation vs staging vs dispatch separation

- **Policy evaluation** decides whether each rule should notify and persists durable decisions.
- **Staging** consumes persisted decisions and materializes target-aware outbox rows.
- **Dispatch** consumes due outbox rows and executes transport attempts.

This separation preserves replay safety and allows dispatch outages without losing deterministic policy history.

## Verification expiry job semantics

`runNotificationVerificationExpiryJob(asOfIso)` calls verification expiry and persists a `verification_expiry` orchestration run report with exact `expiredVerificationCount`.

## Orchestration run reports

Durable orchestration reports are stored in `app_notification_orchestration_runs` and include:

- run identity (`orchestration_run_id`, `stage`, timing, status)
- linkage (`reasoning_run_id`, `policy_evaluation_id`)
- stage counters (evaluation, staging, dispatch, expiry)
- warning/failure metadata
- full canonical `report_json`

## Replay semantics

Replay surfaces return:

- persisted record row
- validated/deserialized report payload

Malformed `report_json` fails deterministically during replay.

## Why dispatch is separated from policy evaluation

Dispatch mutates operational delivery state (attempts, retries, dead states) while policy evaluation defines deterministic domain decisions.
Separating the stages prevents irreversible coupling and allows independent retries/maintenance windows.

## Operational health views

Maintenance helpers provide safe operational read surfaces:

- `summarizeNotificationRuntimeHealth`
- `listStuckDispatchingOutbox`
- `listPendingVerificationsNearExpiry`

These helpers do not delete data and do not modify retry semantics.

## Safe reasoning-completion hook

`runNotificationsForReasoningCompletion(reasoningRunId)` provides a decoupled orchestration hook that accepts only external `reasoningRunId` input and calls the end-to-end runtime.
No reasoning internals are imported, avoiding circular dependencies.

## What C3-K should cover next

- scheduler wiring that invokes orchestration jobs at deterministic intervals
- API/runtime controls for manual run triggers and reruns
- richer metrics and alerting around orchestration statuses
- admin-level re-drive tooling for dead deliveries tied to orchestration runs
