# Journal Domain Core (C4-A)

## Purpose

C4-A introduces ELCEO's durable trade-case journal memory layer.
It is backend-first and defines the canonical case model from draft planning through execution, closure, and review.

This batch adds:
- canonical journal contracts,
- strict runtime validators,
- durable persistence for cases and append-only revisions,
- deterministic lifecycle services,
- replay helpers,
- canonical runtime boundary/query surfaces.

This batch intentionally does **not** add journal UI, coaching analytics, or dashboard visualizations.

## Canonical journal case model

The canonical domain object is `CanonicalJournalCase`.

It is composed of:
- `identity`: stable ownership and asset window identity (`caseId`, subject, asset, timeframe, title)
- `status`: lifecycle status (`draft`, `planned`, `executed`, `partially_closed`, `closed`, `canceled`, `reviewed`)
- `plan`: structured thesis/risk/checklist + reasoning-linkage IDs
- `execution`: actual execution behavior and notes
- `closure`: outcome and PnL summary
- `review`: retrospective behavior and learning notes
- `tags`
- `createdAt`, `updatedAt`

`JournalCaseRevisionRecord` is a separate append-only audit stream with explicit transition metadata and snapshot payload.

## Lifecycle states and transition rules

Allowed transitions in C4-A:

- `draft -> planned`
- `draft -> canceled`
- `planned -> executed`
- `planned -> canceled`
- `executed -> partially_closed`
- `executed -> closed`
- `partially_closed -> closed`
- `closed -> reviewed`
- `canceled -> reviewed`

Disallowed by rule:
- all unspecified transitions,
- `reviewed` is terminal,
- `executed -> canceled` is disallowed once position was actually opened.

Each lifecycle mutation writes a deterministic revision summary string:
- `Case created.`
- `Case planned.`
- `Case executed.`
- `Execution adjusted.`
- `Case partially closed.`
- `Case closed.`
- `Case canceled.`
- `Case reviewed.`

## Reasoning/cognition linkage fields

Plan context stores optional IDs only:
- `createdFromReasoningRunId`
- `createdFromSnapshotId`
- `createdFromDriftId`

C4-A includes `createDraftCaseFromReasoningContext(...)` for explicit ID-based linkage.
No implicit cross-service data pull is performed.
No reasoning internals are imported into application-state.

## Persistence and append-only revision semantics

Migration `0018_journal_cases.sql` adds:
- `app_journal_cases`
- `app_journal_case_revisions`

`app_journal_cases` stores queryable column projections and canonical `case_json`.
`app_journal_case_revisions` stores immutable revision events with `snapshot_json`.

Revision history is append-only by `revision_id` (`ON CONFLICT DO NOTHING` in SQL repository).
Case upserts are idempotent by `case_id`.

Why append-only revisions matter:
- preserves lifecycle audit history,
- enables deterministic replay of every status mutation,
- prevents destructive mutation from erasing behavioral evidence,
- gives stable substrate for future analytics/coaching influence.

## Replay semantics

Replay helpers:
- `getJournalCaseReplayById(caseId)`
- `getLatestJournalCaseReplayForReasoningRun(reasoningRunId)`
- `listJournalCaseReplays(query)`

Each replay bundle returns:
- persisted case row,
- validated/deserialized canonical case,
- ordered revisions (`changedAt ASC`, `revisionId ASC`).

Malformed JSON is deterministic failure (`malformed_json` / explicit invalid contract errors).

## Query surfaces

`JournalQueryService` + runtime boundary expose:
- `getJournalCase`
- `listJournalCases`
- `getJournalCaseReplay`
- `getLatestJournalCaseReplayForReasoningRun`
- `listOpenCasesForSubject`
- `listCasesByAssetTimeframe`

Optional safe integration surfaces added for future reasoning/analytics callers:
- `listJournalCasesForReasoningInfluence`
- `getLatestReviewedCaseForAsset`

Open cases are strictly defined as: `draft`, `planned`, `executed`, `partially_closed`.

## Why this is foundational

ELCEO now has durable, deterministic, replayable trade-case memory.
That unlocks future layers (analytics, coaching, reasoning influence) without coupling those concerns into the core lifecycle state machine.

C4-A therefore creates the canonical memory substrate first, then higher-level interpretation can be added in later batches.

## What C4-B should cover next

C4-B should focus on non-UI journal intelligence and integration layers, for example:
- derived performance metrics over reviewed/closed cases,
- behavior-pattern extraction and tagging consistency checks,
- deterministic journal influence projection into reasoning inputs,
- operational replay/reporting endpoints for journal cohorts.

C4-B should still avoid broad UI redesign unless explicitly requested.

## C4-B journal influence extension

C4-B adds a deterministic journal influence engine on top of C4-A case memory:
- canonical `JournalInfluence*` contracts,
- strict runtime validation,
- recency-aware case selection and weighted aggregation,
- durable influence snapshots + replay helpers,
- canonical query/boundary surfaces,
- reasoning input adoption through structured influence payloads.

This preserves C4-A lifecycle boundaries while making durable journal history computationally useful for reasoning.

## Analytics Core Linkage (C4-C)

Journal case history now feeds the canonical analytics core snapshot engine (`@elceo/analytics`) for deterministic, persisted, replayable performance aggregation. This keeps journal lifecycle semantics unchanged while enabling downstream analytics/coaching consumers to read stable snapshots instead of recomputing from mutable views.

## C4-M6C1 security alignment note
Security runtime policy foundation now includes journal-specific action kinds (`journal_case_write`, `journal_case_lifecycle`, `journal_influence_generate`) so journal mutation families can be rate-limited and audited with production-grade precision. Route integration is intentionally deferred to M6C2.

## C4-M6C2B journal lifecycle route security integration
Journal lifecycle mutation route integration is now complete for the existing case lifecycle route family by applying `journal_case_lifecycle` to:
- `POST /api/journal/cases/[caseId]/plan`
- `POST /api/journal/cases/[caseId]/execute`
- `POST /api/journal/cases/[caseId]/adjust`
- `POST /api/journal/cases/[caseId]/partial-close`
- `POST /api/journal/cases/[caseId]/close`
- `POST /api/journal/cases/[caseId]/cancel`
- `POST /api/journal/cases/[caseId]/review`

Read-equivalent routes (`GET /api/journal/cases/[caseId]`, `GET /api/journal/cases/[caseId]/replay`) intentionally remain outside mutation-security decisioning because they do not perform state transitions.
