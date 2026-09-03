# SEC-A1 object-ID authority inventory

User-facing portfolio entities (watchlist entries, positions, action items and their revisions/replay), journal cases (read, replay, plan, execute, adjust, partial-close, close, cancel and review), and notification target management/verification are owner-scoped at repository and service boundaries. Their predicates require `subject_kind`, `subject_id`, and the object identifier; foreign and absent objects both resolve as not found.

ID-based methods intentionally retained are internal/global: notification delivery workers resolve targets by ID after server-created outbox selection; verification expiry operates on server-selected pending rows; admin inspection/replay is behind admin authorization; provider decisions/events, operational job runs, and immutable cognition snapshots are global/internal artifacts rather than caller-owned object-ID routes. `verifyTarget` is internal to successful verification orchestration; user routes use subject-bound verification consumption. Billing IDs remain in accepted billing/admin boundaries and are outside SEC-A1.

Regression rule: no authenticated user-facing route may call an unscoped portfolio/journal repository getter or mutation, `enableTarget(targetId)`, `disableTarget(targetId)`, `issueTargetVerification(targetId)`, or `consumeTargetVerification(targetId, token)`.
