# C6-A11D — KoraPay payment adapter readiness + webhook security shell

- KoraPay was not previously integrated.
- This batch adds readiness shell contracts/types/schemas/tests only.
- No live KoraPay keys, no live checkout, no live webhook entitlement grant.
- Exact official KoraPay webhook signature headers/payload format must be verified from official docs before activation.
- Checkout readiness requires social identifier before draft creation.
- Entitlement decision requires verified webhook status and idempotency duplicate protection.
- C6-A11E will focus on Super Admin metrics backend.
\n## C6-A11E update (2026-05-15)\n- Super Admin metrics backend contracts/helpers added for later dashboard UI consumption only.\n- Revenue metrics remain fixture/estimated unless live records are enabled.\n- KoraPay is still shell-only with no live provider calls in this batch.\n- No secrets/raw provider payload exposure; no IP ban metrics.\n- C6-A11F remains notification preferences + email/WhatsApp backend.
