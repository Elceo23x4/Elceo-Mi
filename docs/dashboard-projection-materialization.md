# Canonical dashboard projection delivery stages

- **D1-A** is the pure, deterministic canonical dashboard projection. Its `projection_identity` remains the payload authority.
- **D1-B** durably stores that projection as a tamper-detectable immutable PostgreSQL artifact and publishes a fenced Redis pointer for passive, exact-identity reads.
- **D1-C** makes that passive reader the production dashboard route authority. Dashboard GET owns no computation: unavailable, stale, invalid, or unreachable canonical artifacts fail closed without legacy ingestion fallback.
- **12-asset end-to-end acceptance closure** deterministically exercises every symbol in `LAUNCH_ASSET_SYMBOLS` through persisted cognition, persisted typed H4 observations, D1-A projection, D1-B immutable publication, and the same D1-C passive reader. It includes balanced 1,200-read economics, cross-asset rejection, and a same-reader XAU/USD producer transition. This is closure evidence—not a new D1 phase—and its fixtures retain `productionAcceptance = false`; IFP-8 empirical blockers and production-live policy are unchanged.
The production route consumes the current published artifact through Redis pointer → bounded L1 → immutable PostgreSQL. IFP-8 remains externally blocked, and production-live provider activation remains separately controlled.
