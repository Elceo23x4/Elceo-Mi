# C6-A11E — Super Admin Commercial Metrics Backend

This batch adds backend-only deterministic Super Admin commercial/user metrics contracts and aggregation helpers for later dashboard consumption.

- No UI delivered in this batch.
- Metrics snapshot data status is fixture/estimated (`fixture_only`) until live payment materialization is enabled.
- KoraPay remains shell-only; no live provider calls, no live checkout session creation, no live webhook entitlement grants.
- Metrics exclude secrets/tokens/session/auth payloads and raw provider payloads.
- IP-ban metrics are intentionally excluded.
- C6-A11F remains focused on notification preferences + email/WhatsApp backend.
\n## C6-A11I update (2026-05-16)\n- Internal observability/audit/structured logging contracts + validators + redaction helpers + diagnostic error envelopes added.\n- No external vendor integration yet; no live provider calls; no API keys; no secrets in diagnostic payloads.\n- Structured logging export integration remains production-pending; route-by-route adoption may still be pending.\n- C6-A12 remains final backend readiness refresh and pre-activation review.\n


## Post-C6-P4 update (2026-05-17)
- Added internal-only admin commercial control route foundations for gift/retract/restrict and control snapshot under `/api/admin/commercial/users/[userId]/*`.
- Mutation routes require internal token, `admin.ops`, security decision/idempotency/audit flow, and verified step-up contract checks.
- Step-up state remains **fixture/readiness** (`fixture_verified_for_tests` / `step_up_readiness_only`); production 2FA provider wiring is pending.
- IP ban is explicitly rejected; user restriction supports only `suspended` or `banned`.
- No UI changes, no payment provider activation/calls, no checkout/session activation, no notification sends.
- Persistence caveat: super-admin commercial control records are currently in-memory foundation state, not durable production storage.
