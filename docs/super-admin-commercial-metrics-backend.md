# C6-A11E — Super Admin Commercial Metrics Backend

This batch adds backend-only deterministic Super Admin commercial/user metrics contracts and aggregation helpers for later dashboard consumption.

- No UI delivered in this batch.
- Metrics snapshot data status is fixture/estimated (`fixture_only`) until live payment materialization is enabled.
- KoraPay remains shell-only; no live provider calls, no live checkout session creation, no live webhook entitlement grants.
- Metrics exclude secrets/tokens/session/auth payloads and raw provider payloads.
- IP-ban metrics are intentionally excluded.
- C6-A11F remains focused on notification preferences + email/WhatsApp backend.
