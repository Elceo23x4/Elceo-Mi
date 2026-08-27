# Canonical dashboard projection delivery stages

- **D1-A** is the pure, deterministic canonical dashboard projection. Its `projection_identity` remains the payload authority.
- **D1-B** durably stores that projection as a tamper-detectable immutable PostgreSQL artifact and publishes a fenced Redis pointer for passive, exact-identity reads.
- **D1-C** makes that passive reader the production dashboard route authority. Dashboard GET owns no computation: unavailable, stale, invalid, or unreachable canonical artifacts fail closed without legacy ingestion fallback.
The production route consumes the current published artifact through Redis pointer → bounded L1 → immutable PostgreSQL. IFP-8 remains externally blocked, and production-live provider activation remains separately controlled.
