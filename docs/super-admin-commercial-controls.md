# C6-A11C Super Admin Commercial Controls

- Scope: gift/retract Focus Plan by unique user ID, user ban/suspension, mandatory 2FA step-up, full audit payload.
- Gift durations are allowlisted to `two_weeks` and `one_month` only.
- IP ban is withdrawn and not supported.
- Dangerous actions require step-up verification; current implementation is fixture-only readiness and marked `live_provider_required` follow-up.
- Every action includes actor/target/action/reason/note/step-up status/timestamp/resulting entitlement/idempotency key.
- No payment provider integration is included in this batch; KoraPay remains for C6-A11D.
\n## C6-A11D KoraPay readiness shell update\n- Added provider-ready KoraPay adapter/webhook security shell only (no live keys/calls/session creation).\n- Official KoraPay webhook signature verification details remain live_activation_required pending docs confirmation.\n- Social identifier remains required for checkout readiness; verified webhook + idempotency required before entitlement grant.\n- Next batch C6-A11E targets Super Admin metrics backend.
\n## C6-A11E update (2026-05-15)\n- Super Admin metrics backend contracts/helpers added for later dashboard UI consumption only.\n- Revenue metrics remain fixture/estimated unless live records are enabled.\n- KoraPay is still shell-only with no live provider calls in this batch.\n- No secrets/raw provider payload exposure; no IP ban metrics.\n- C6-A11F remains notification preferences + email/WhatsApp backend.


## Post-C6-P4 update (2026-05-17)
- Added internal-only admin commercial control route foundations for gift/retract/restrict and control snapshot under `/api/admin/commercial/users/[userId]/*`.
- Mutation routes require internal token, `admin.ops`, security decision/idempotency/audit flow, and verified step-up contract checks.
- Step-up state remains **fixture/readiness** (`fixture_verified_for_tests` / `step_up_readiness_only`); production 2FA provider wiring is pending.
- IP ban is explicitly rejected; user restriction supports only `suspended` or `banned`.
- No UI changes, no payment provider activation/calls, no checkout/session activation, no notification sends.
- Persistence caveat: super-admin commercial control records are currently in-memory foundation state, not durable production storage.

## Post-C6-P5 Update (2026-05-18)
- Super Admin gift/restrict persistence now supports SQL durability when `APP_STATE_REPOSITORY=sql` and `DATABASE_URL` are configured; otherwise explicit `memory_fallback`.
- Step-up/2FA classification: `provider_pending` (readiness only, fixture verification in tests).
- Routes remain backend-only; no Admin UI wiring done.
- No payment provider, notification, or live 2FA activation in this batch.
- IP ban remains intentionally unsupported.


## Post-C6-P6 (2026-05-18)
- Added production step-up/2FA contract foundation: challenge creation, verification, freshness window, replay protection, rate-limit/lockout policy, and safe audit metadata.
- Provider readiness remains blocked: totp/webauthn/authenticator_app are provider_pending; fixture_test_only is test-mode only.
- Super Admin commercial mutation routes still require verified step-up and do not expose OTP/proof/token secrets.
- Persistence status for step-up challenge runtime is memory_fallback; durable provider activation remains deferred.
- No UI work, no payment/provider/notification live activation in this batch.

## RC-C commercial persistence consistency

RC-C adds durable SQL foundations for Focus Plan gifts, gift retractions, user restrictions, commercial snapshots, commercial operation idempotency/audit records, and target-user serialization. The code path keeps step-up challenge consumption separate from commercial mutation transactions: a consumed challenge is not restored if the later business operation fails. Memory-backed state remains limited to explicit memory repositories for non-production and deterministic tests.

The SQL implementation does not activate payments, notifications, live 2FA providers, IP bans, restriction lifting, automatic gift extension, stacked gifts, or external social-account ownership verification. Social identifiers remain authenticated self-declared identifiers.
