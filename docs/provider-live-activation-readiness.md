# Provider Live Activation Readiness (C5-A21)

C5-A21 introduces staging-only live provider activation planning gates.

- Canonical contracts added for activation policy, readiness status, readiness snapshot, quota policy, and smoke plan.
- Production live ingestion remains blocked by default.
- No scheduler, no cron, no live ingestion enablement in production.
- Tiingo staging readiness requires explicit live enablement plus API key.
- Helpers return no secrets and perform no network calls.
- Smoke plans are planning artifacts only and gate on staging-ready status.
- C5-A22 will build scheduled ingestion orchestration on top of these contracts.
