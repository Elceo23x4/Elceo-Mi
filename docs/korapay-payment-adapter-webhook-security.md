# C6-A11D — KoraPay payment adapter readiness + webhook security shell

- KoraPay was not previously integrated.
- This batch adds readiness shell contracts/types/schemas/tests only.
- No live KoraPay keys, no live checkout, no live webhook entitlement grant.
- Exact official KoraPay webhook signature headers/payload format must be verified from official docs before activation.
- Checkout readiness requires social identifier before draft creation.
- Entitlement decision requires verified webhook status and idempotency duplicate protection.
- C6-A11E will focus on Super Admin metrics backend.
