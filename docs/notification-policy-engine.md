# Notification Policy Engine (C3-E)

## Purpose

C3-E introduces a deterministic notification policy decision layer for reasoning outcomes and cognition drift.
It decides **whether to notify**, **why**, **eligible channels**, and **cooldown/suppression** outcomes.

This batch ends at durable policy decisions. Delivery transport remains intentionally out of scope.

## Inputs

Policy evaluation loads persisted artifacts only:

- persisted reasoning run (`app_reasoning_runs`)
- persisted cognition snapshot when `snapshot_id` exists (`app_cognition_snapshots`)
- persisted drift record when current snapshot has drift (`app_cognition_deltas`)
- latest prior decision per `(asset,timeframe,rule)` for cooldown checks (`app_notification_decisions`)

Loader deterministic failures:

- `missing_reasoning_run`
- `missing_cognition_snapshot`
- `corrupt_cognition_snapshot`
- `corrupt_drift_report`

## Default rule registry and order

Rules are evaluated in fixed order:

1. `reasoning_failure`
2. `reasoning_degraded`
3. `cognition_initialized`
4. `bias_flip`
5. `critical_drift`
6. `major_drift`
7. `invalidation_risk_upgrade`
8. `contradiction_spike`
9. `confidence_breakdown`
10. `freshness_decay`

Each rule has deterministic:

- `triggerKind`
- minimum materiality score
- cooldown minutes
- eligible channels

## Rule conditions

- `reasoning_failure`: run status = `failed`
- `reasoning_degraded`: run status = `partial_success` and non-empty failure reason
- `cognition_initialized`: run success/partial success + cognition exists + no drift
- `bias_flip`: drift exists and `biasDelta.flip = true`
- `critical_drift`: drift severity = `critical`
- `major_drift`: drift severity = `major`
- `invalidation_risk_upgrade`: risk label changed and worsened strictly (`guarded < warning < fragile < broken`)
- `contradiction_spike`: contradiction >= 60 and contradiction delta up >= 10
- `confidence_breakdown`: confidence <= 45 and confidence delta down >= 10
- `freshness_decay`: freshness <= 40 and freshness delta down >= 15

## Materiality formulas

`initializationMateriality` (only when no drift):

`clamp(0.50*confidence + 0.25*(100-contradiction) + 0.25*freshness)`

`driftSeverityBase`:

- none 0
- minor 15
- moderate 35
- major 65
- critical 90

Other deterministic components:

- `biasFlipCriticality` = 100 flip / 35 changed / 0 otherwise
- `invalidationRiskUpgradeMagnitude` from explicit worsening table
- `confidenceBreakMagnitude` = confidence down absolute delta
- `contradictionSpikeMagnitude` = contradiction up absolute delta
- `freshnessDecayMagnitude` = freshness down absolute delta
- `evidenceTurnoverMagnitude = clamp(15*entered + 15*exited + 5*reranked)`
- `chartChangeMagnitude = clamp(visibility change + entered annotations + emphasis change)`
- `reasoningFailureMagnitude = 90 if failed`
- `reasoningDegradedMagnitude = 60 if partial_success with failure reason`

`driftDrivenMateriality`:

`clamp(0.25*bias + 0.20*severity + 0.15*invalidation + 0.10*confidence + 0.10*contradiction + 0.08*freshness + 0.07*evidence + 0.05*chart)`

Per-rule score:

- `reasoning_failure` => `reasoningFailureMagnitude`
- `reasoning_degraded` => `reasoningDegradedMagnitude`
- `cognition_initialized` => `initializationMateriality`
- all drift rules => `driftDrivenMateriality`

Materiality band mapping:

- 0..24 low
- 25..49 medium
- 50..74 high
- 75..100 critical

## Cooldown and suppression semantics

Suppression reasons:

- `condition_not_met`
- `below_materiality_threshold`
- `cooldown_active`
- `missing_required_context`

Decision order (strict):

1. condition check
2. materiality threshold
3. cooldown check
4. notify

Cooldown is active only when prior decision is notifying and `evaluatedAt < cooldownUntil`.

## Decision key semantics

Deterministic idempotent key:

- `decision|{ruleKey}|drift|{driftId}`
- else `decision|{ruleKey}|snapshot|{snapshotId}`
- else `decision|{ruleKey}|run|{reasoningRunId}`

This key provides replay-safe and upsert-safe persistence.

## Durable persistence

`infra/db/schema/0011_notification_decisions.sql` adds `app_notification_decisions`.

Stored per decision:

- identity (`decision_id`, `decision_key`)
- subject (`asset`, `timeframe`, `rule_key`, `trigger_kind`)
- source links (`reasoning_run_id`, `snapshot_id`, `drift_id`)
- evaluation (`materiality_score`, `should_notify`, `suppression_reason`, `channels_json`, `cooldown_until`)
- deterministic content (`headline`, `body`)
- full decision envelope (`decision_json`)

Suppressed decisions are persisted too for auditability.

## Replay semantics

Replay helpers deserialize and validate persisted decisions:

- `getNotificationDecisionReplayById`
- `getLatestNotifyingDecisionReplay`
- `listDecisionReplaysForReasoningRun`

Malformed JSON fails deterministically.

## Boundary service

`CanonicalNotificationPolicyBoundaryService.evaluateForReasoningRun(...)`:

1. load policy context from persisted reasoning/cognition/drift artifacts
2. evaluate default rules in deterministic order
3. persist all decisions idempotently
4. return `NotificationPolicyEvaluationReport`

No delivery transport is called here.

## Why C3-E stops before delivery

C3-E establishes deterministic, durable, replayable policy decisions first.
Delivery transport (push/email/in-app dispatch pipeline), retry controls, and delivery observability are deferred.

## What C3-F should cover next

C3-F should add transport orchestration on top of durable decisions:

- dispatch adapters (in-app/push/email)
- delivery status persistence + retries/dead-letter
- entitlement/user preference filtering at delivery layer
- operations/admin replay controls for delivery attempts
