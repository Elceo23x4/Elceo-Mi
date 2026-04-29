# Entitlements and Plan Gating (C4-K1)

This document defines the backend runtime core for entitlement decisions.

- Plan kinds: `free`, `premium`, `admin_internal`.
- Account states: `active`, `suspended`, `restricted`, `canceled`.
- Access semantics: `allowed`, `limited`, `blocked`.
- Usage windows are UTC deterministic (`daily`, `weekly` Monday start, `monthly` first-day start).
- Decision reasons include: `account_suspended`, `account_canceled`, `internal_override`, `feature_not_in_plan`, `feature_allowed`, `feature_limited`, `usage_available`, `usage_limit_exceeded`, `feature_unknown_or_unmapped`.

C4-K1 stops before route/API integration and server access helper wiring.
C4-K2 should add authenticated API wiring and route-level gating integration.
