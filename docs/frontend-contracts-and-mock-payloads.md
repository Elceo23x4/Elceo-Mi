# C6-A10 Frontend Contracts + Mock Payloads

All frontend contracts are fixture/mock driven for UI integration planning only.

- No live provider calls.
- No API keys/secrets.
- Public vs admin/internal visibility is explicit in each payload contract.
- Payloads are deterministic and non-recommendation.
- No UI design changes in C6-A10.
- C6-A11 remains focused on observability/audit/structured logging readiness.


## C6-A11F update (2026-05-15)
- Added backend-only user notification preference foundation for topics/channels (email, WhatsApp).
- Added deterministic event trigger evaluation, quiet-hours/rate-limit helpers, and draft/outbox/log builders.
- Provider readiness remains shell-only; no live sends, no provider keys, no SDK activation in this batch.
- Profile UI activation remains future work; C6-A11G will cover provider activation checklist + env templates.
