# Notification Management Boundary (C3-H)

## Purpose

C3-H adds a canonical backend management boundary for deterministic, durable notification operations.
This scope is backend-only and operationally focused.

## Target registration model

- Targets are upserted by canonical `targetKey`.
- Deterministic key format:
  - `target|{subjectKind}|{subjectId}|{channel}|{targetKind}|{addressIdentity}`
- Address identity canonicalization:
  - `in_app_user`: `inapp:{subjectKind}:{subjectId}`
  - `email_address`: `email:{trim(lower(email))}`
  - `push_endpoint`: `push:{trim(endpointOrToken)}`

## Subscription registration model

- Subscriptions are upserted by canonical `subscriptionKey`.
- Deterministic key format:
  - `subscription|{subjectKind}|{subjectId}|{channel}|{assetScope}|{timeframeScope}|{ruleKeyScope}`
- Wildcards remain literal `*`.

## Verification and enable/disable rules

- `in_app_user` targets default to `active` and verified.
- `email_address` and `push_endpoint` targets default to `unverified` unless explicitly provided.
- `verifyTarget` sets `verifiedAt` and `active`.
- `enableTarget` refuses to activate unverified non-in-app targets.
- `disableTarget` preserves existing `verifiedAt` history.

## Inbox query and mutation rules

- Backend operations:
  - `listInbox`
  - `markRead`
  - `markUnread`
  - `archive`
  - `unarchive`
- Ordering: `createdAt DESC`, then `inboxId ASC`.
- Query semantics:
  - `unreadOnly` => `readAt IS NULL`
  - `includeArchived=false` => `archivedAt IS NULL`

## Subject-level inbox aggregation

- Subject inbox resolves all targets for `(subjectKind, subjectId)`.
- Aggregates across target inbox rows.
- Dedupes by `inboxId`.
- Applies ordering and filters deterministically.
- Applies `limit` last.

## Operational summaries

- Subject operational summary:
  - target counts
  - subscription counts
  - inbox unread/archived counts
  - recent outbox delivered/failed/dead counts
- Delivery health summary:
  - delivered, failed, dead, staged, dispatching
  - optional lookback window

## Canonical boundary

`CanonicalNotificationManagementBoundaryService` is the single backend management boundary and exposes:

- target lifecycle management
- subscription lifecycle management
- inbox query/mutation operations
- subject-level operational read surfaces

## Out of scope

Still out of scope in C3-H:

- notification center UI
- preference settings UI
- user-facing management pages
- campaign tooling

## C3-I next scope

C3-I should add:

- API endpoint wiring for management operations
- authz policy for operator/admin/subject access
- pagination envelopes for operational read APIs
- explicit re-drive tooling for failed/dead deliveries


## C3-I extension

This boundary now includes provider capability and operational delivery summary calls, plus verification runtime integration via the canonical verification boundary.

## C3-J runtime operations compatibility

Notification runtime orchestration now persists stage-level automation reports and exposes replay/list surfaces through the canonical orchestration boundary.
Management operational summaries remain complementary read views, while orchestration maintenance helpers provide additional runtime health checks (stuck dispatching and near-expiry verification visibility) without changing management lifecycle semantics.

## C3-K feedback compatibility

Management summary surfaces now include feedback-derived health views (degraded/disabled targets and recent critical delivery receipts) without changing target/subscription lifecycle APIs.
Provider feedback remains in the dedicated canonical feedback boundary to keep management and delivery concerns separated.
