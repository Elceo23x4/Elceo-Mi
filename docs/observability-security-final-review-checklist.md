# ELCEO Observability/Security Final Review Checklist (C4-M8A)

## API correctness and error envelope
- Verify all production API routes return standard envelope shape for success/error.
- Spot-check deterministic error codes/status mapping.

## Security controls
- Verify route-level idempotency/rate-limit checks on protected mutations.
- Verify security audit events persist for blocked/replayed/successful protected actions.
- Verify internal/admin routes reject missing or invalid `x-elceo-internal-token`.
- Verify auth/session behavior with production secret configured.

## Billing safety checks
- Reconciliation endpoint smoke check.
- Policy evaluation/transition read smoke check.
- Orchestration retry path smoke check with idempotency headers.

## Notifications and ops checks
- Notification dispatch run + feedback processing smoke checks.
- Verification issue/consume and expiry processor checks.
- Ops runtime lease and run persistence checks.

## Domain smoke checks
- Workspace refresh/query smoke checks.
- Analytics generate/latest smoke checks.
- Coaching generate/latest smoke checks.
- Journal/portfolio mutation smoke checks with security controls active.

## Infrastructure hardening recommendations
- Perform final penetration/security review before launch.
- Enforce edge/WAF rate limiting in front of app-level limits.
- Run backup/restore drill for production database before go-live.
