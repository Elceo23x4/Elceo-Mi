# C6-A11C Super Admin Commercial Controls

- Scope: gift/retract Focus Plan by unique user ID, user ban/suspension, mandatory 2FA step-up, full audit payload.
- Gift durations are allowlisted to `two_weeks` and `one_month` only.
- IP ban is withdrawn and not supported.
- Dangerous actions require step-up verification; current implementation is fixture-only readiness and marked `live_provider_required` follow-up.
- Every action includes actor/target/action/reason/note/step-up status/timestamp/resulting entitlement/idempotency key.
- No payment provider integration is included in this batch; KoraPay remains for C6-A11D.
\n## C6-A11D KoraPay readiness shell update\n- Added provider-ready KoraPay adapter/webhook security shell only (no live keys/calls/session creation).\n- Official KoraPay webhook signature verification details remain live_activation_required pending docs confirmation.\n- Social identifier remains required for checkout readiness; verified webhook + idempotency required before entitlement grant.\n- Next batch C6-A11E targets Super Admin metrics backend.
