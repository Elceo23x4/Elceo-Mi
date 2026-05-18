# Super Admin Step-Up 2FA Readiness (Post-C6-P6)

- Scope: backend contracts and policy only.
- Status: `provider_pending` for production providers.
- Challenge contract: create + verify + expiry + replay single-use + freshness checks.
- Policy contract: max attempts per challenge, max challenges/window, lockout duration, recovery placeholder.
- Security posture: no OTP, proof, token, recovery code, private key, or provider secrets in responses/audit payloads.
- Route compatibility: existing Super Admin commercial mutation routes still enforce verified step-up.
- Deferred: live provider activation, durable challenge repository, notification/provider integrations.
