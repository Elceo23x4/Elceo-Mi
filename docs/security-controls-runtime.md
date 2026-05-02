# Security Controls Runtime (C4-M6A2)

This pass completes backend-only security runtime service behavior for idempotency, rate limiting, decisioning, audit persistence, and canonical boundary/query orchestration.

## Semantics
- Idempotency: deterministic key + request hash handling with started/completed/failed lifecycle.
- Rate limit: deterministic minute/hour/day windows, actor/subject scoping, conservative blocking at limit.
- Audit: blocked/replayed/internal/admin actions are auditable.
- Privacy: IP and user-agent are stored only as SHA-256 hashes.
- Precedence: idempotency conflicts block before rate-limit checks.

## Why route integration is deferred
This batch ships executable services and canonical boundary behavior only; route handlers will adopt the boundary in M6B to prevent duplicate logic and risk.

## M6B next
- Integrate canonical boundary into selected mutation routes.
- Add route-specific policy wiring and idempotency-key requirements.
- Expand audit replay lookup support.
