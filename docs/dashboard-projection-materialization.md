# Canonical dashboard projection delivery stages

- **D1-A** is the pure, deterministic canonical dashboard projection. Its `projection_identity` remains the payload authority.
- **D1-B** durably stores that projection as a tamper-detectable immutable PostgreSQL artifact and publishes a fenced Redis pointer for passive, exact-identity reads.
- **D1-C** is the future decision to make that passive reader the production dashboard route authority.

After D1-B, canonical dashboard artifacts can exist in production infrastructure, but they are not yet the user-facing route authority. User GET requests must not invoke projection computation. IFP-8 remains externally blocked, and production-live provider activation remains separately controlled.
