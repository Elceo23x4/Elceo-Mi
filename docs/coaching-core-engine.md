# Coaching Core Engine (C4-D)

## Scope
C4-D introduces the deterministic coaching intelligence backend for ELCEO. It consumes persisted analytics snapshots and persisted journal influence snapshots, computes deterministic risk/strength signals, and persists replayable coaching snapshots. It intentionally excludes coaching UI, analytics UI, and notification policy integration.

## Coaching inputs
Coaching snapshot generation takes:
- `subjectKind`, `subjectId`
- `assetScope` (`CanonicalAssetSymbol | '*'`)
- `timeframeScope` (`Timeframe | '*'`)
- `generatedAt`

Input loader behavior is deterministic and fallback-ordered independently for analytics and journal influence:
1. exact asset + exact timeframe
2. exact asset + wildcard timeframe
3. wildcard asset + exact timeframe
4. wildcard asset + wildcard timeframe

No hidden recomputation is done by query services; query/replay reads persisted coaching snapshots only.

## Risk scoring formulas
Risk scores are bounded to 0..100:
- discipline risk: `100 - disciplineScore` (or 0 when null)
- setup selection risk: average of up to 3 low setup patterns (`sampleCount>=3` and `performanceScore<50`) using `100 - performanceScore`
- behavior control risk: average of max(lossAssociationScore, impulsiveAssociationScore) for behavior patterns where max >= 35, plus repeat-mistake influence cue when present
- execution precision risk: `100 - adherenceScore` (or 0 when null)
- review quality risk: `(1 - reviewedCaseCount/closedCaseCount) * 100` (or 0 when closed count is 0)
- reasoning alignment risk: `100 - linkedWinRate*100 + max(0, -linkedAvgRMultiple)*20` when linked cases exist, else 0

## Strength scoring formulas
Strength scores are bounded to 0..100:
- discipline strength: `disciplineScore` (or 0 when null)
- setup strength: average of up to 3 setup patterns (`sampleCount>=3` and `performanceScore>=60`)
- behavior strength: average of top 3 behavior win association scores (`winAssociationScore>=35`)
- reasoning strength: `linkedWinRate*70 + max(0, linkedAvgRMultiple)*15` when linked cases exist, else 0

## Focus area generation rules
Focus area themes and triggers:
- discipline (`>=35`)
- setup_selection (`>=35`)
- behavior_control (`>=35`)
- execution_precision (`>=30`)
- review_quality (`>=30`)
- reasoning_alignment (`>=35`)

Priority mapping:
- `>=75 critical`
- `>=55 high`
- `>=35 medium`
- else `low`

Each focus area includes:
- deterministic `focusId`
- stable headline/explanation templates
- theme-specific supporting metrics
- deterministic source kinds
- supporting case IDs unique + capped at 10

## Strength generation rules
Strengths are generated from thresholded strength scores with deterministic IDs, template copy, mapped themes, and capped supporting case IDs.

## Action plan generation rules
Action plan generation is deterministic:
- one action per selected focus area
- template instruction and success metric by theme
- action score and priority inherit focus score/priority
- supportingFocusIds uses the linked focus ID
- max 6 actions
- order: score desc, then theme asc

## Summary note rules
Summary notes are strictly templated:
- `Primary coaching priority: {focusHeadline}` or fallback no-issue message
- `Strongest current advantage: {strengthHeadline}` or fallback no-strength message
- max 3 notes total

## Persistence and replay semantics
Coaching snapshots persist in `app_coaching_snapshots` with flattened scope/timing columns and canonical JSON fields:
- `focus_areas_json`, `strengths_json`, `action_plan_json`
- `summary_notes_json`, `supporting_case_ids_json`, `summary_json`

Replay helpers return:
- persisted record row
- strict-validated coaching snapshot payload

Malformed JSON or invalid schema content fails deterministically.

## Why C4-D stops here
C4-D provides a durable backend substrate only:
- deterministic coaching computation
- persistence/replay/query surfaces
- canonical runtime boundary

UI, notification policy, and operator workflows are intentionally deferred to keep this layer conservative and auditable.

## What C4-E should cover next
C4-E should focus on safe integration layers:
- notification candidate orchestration using persisted coaching snapshots
- admin/coaching ops query endpoints and moderation controls
- UI read APIs and presentation adapters
- explicit cadence policies for snapshot generation jobs
